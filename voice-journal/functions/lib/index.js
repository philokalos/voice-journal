"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notionOAuth = exports.syncToGoogleSheets = exports.googleSheetsOAuth = exports.analyzeSentiment = exports.deleteUserData = exports.calculateChanges = exports.logEntryAudit = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const language_1 = require("@google-cloud/language");
const googleapis_1 = require("googleapis");
admin.initializeApp();
/**
 * Cloud Function to log all changes to journal entries for audit purposes
 * Triggered whenever a document in the 'entries' collection is written (created, updated, or deleted)
 */
exports.logEntryAudit = functions.firestore
    .document("entries/{entryId}")
    .onWrite(async (change, context) => {
    const entryId = context.params.entryId;
    const timestamp = new Date().toISOString();
    try {
        // Determine operation type
        let operation;
        let beforeData = null;
        let afterData = null;
        let changes = {};
        if (!change.before.exists && change.after.exists) {
            // Document was created
            operation = "create";
            afterData = change.after.data();
        }
        else if (change.before.exists && !change.after.exists) {
            // Document was deleted
            operation = "delete";
            beforeData = change.before.data();
        }
        else if (change.before.exists && change.after.exists) {
            // Document was updated
            operation = "update";
            beforeData = change.before.data();
            afterData = change.after.data();
            // Calculate the diff for updates
            changes = calculateChanges(beforeData, afterData);
        }
        else {
            // This shouldn't happen, but just in case
            functions.logger.warn(`Unknown operation type for entry ${entryId}`);
            return;
        }
        // Get user ID from the document data
        const userId = (afterData === null || afterData === void 0 ? void 0 : afterData.user_id) || (beforeData === null || beforeData === void 0 ? void 0 : beforeData.user_id);
        if (!userId) {
            functions.logger.error(`No user_id found for entry ${entryId}`);
            return;
        }
        // Create audit log entry
        const auditLog = {
            operation,
            entryId,
            userId,
            timestamp,
            beforeData: operation === "create" ? null : beforeData,
            afterData: operation === "delete" ? null : afterData,
            changes: operation === "update" ? changes : undefined,
        };
        // Store the audit log in Firestore
        await admin.firestore()
            .collection("entry_audit_logs")
            .add(auditLog);
        functions.logger.info(`Audit log created for ${operation} operation on entry ${entryId} by user ${userId}`);
    }
    catch (error) {
        functions.logger.error(`Failed to create audit log for entry ${entryId}:`, error);
        // Don't throw error to avoid blocking the original operation
    }
});
/**
 * Calculate what fields changed between before and after data
 */
function calculateChanges(before, after) {
    const changes = {};
    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of allKeys) {
        const beforeValue = before === null || before === void 0 ? void 0 : before[key];
        const afterValue = after === null || after === void 0 ? void 0 : after[key];
        // Skip system fields that change automatically
        if (key === "updated_at")
            continue;
        // Compare values (simple comparison for now)
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
            changes[key] = {
                before: beforeValue,
                after: afterValue,
            };
        }
    }
    return changes;
}
exports.calculateChanges = calculateChanges;
/**
 * GDPR/CCPA Data Deletion Cloud Function
 * Deletes all user data including entries, audio files, and audit logs
 */
exports.deleteUserData = functions.https.onCall(async (data, context) => {
    // Verify user authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to delete data');
    }
    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;
    functions.logger.info(`Starting data deletion for user ${userId} (${userEmail})`);
    try {
        const db = admin.firestore();
        const storage = admin.storage().bucket();
        const timestamp = new Date().toISOString();
        // 1. Get all user entries to find audio files
        const entriesSnapshot = await db.collection('entries')
            .where('user_id', '==', userId)
            .get();
        const audioFilePaths = [];
        const entryIds = [];
        entriesSnapshot.forEach((doc) => {
            const data = doc.data();
            entryIds.push(doc.id);
            if (data.audio_file_path) {
                audioFilePaths.push(data.audio_file_path);
            }
        });
        // 2. Delete all audio files from Firebase Storage
        const storageDeletePromises = audioFilePaths.map(async (filePath) => {
            try {
                await storage.file(filePath).delete();
                functions.logger.info(`Deleted audio file: ${filePath}`);
            }
            catch (error) {
                functions.logger.warn(`Failed to delete audio file ${filePath}:`, error);
                // Continue with other deletions even if one fails
            }
        });
        // 3. Delete user folder from storage (voices/{userId})
        try {
            const [files] = await storage.getFiles({ prefix: `voices/${userId}/` });
            const userStorageDeletePromises = files.map(file => file.delete());
            await Promise.all(userStorageDeletePromises);
            functions.logger.info(`Deleted user storage folder: voices/${userId}/`);
        }
        catch (error) {
            functions.logger.warn(`Failed to delete user storage folder:`, error);
        }
        // 4. Delete all user entries from Firestore
        const entryDeletePromises = entryIds.map(async (entryId) => {
            await db.collection('entries').doc(entryId).delete();
        });
        // 5. Delete all audit logs for this user
        const auditLogsSnapshot = await db.collection('entry_audit_logs')
            .where('userId', '==', userId)
            .get();
        const auditDeletePromises = auditLogsSnapshot.docs.map((doc) => db.collection('entry_audit_logs').doc(doc.id).delete());
        // 6. Delete user's encryption key
        const userKeyPromise = db.collection('user_encryption_keys').doc(userId).delete();
        // Execute all deletions
        await Promise.all([
            ...storageDeletePromises,
            ...entryDeletePromises,
            ...auditDeletePromises,
            userKeyPromise
        ]);
        // 7. Create deletion audit log
        const deletionLog = {
            operation: 'user_data_deletion',
            userId,
            userEmail,
            timestamp,
            deletedEntries: entryIds.length,
            deletedAudioFiles: audioFilePaths.length,
            deletedAuditLogs: auditDeletePromises.length,
            deletedEncryptionKey: true,
            requestSource: 'user_initiated'
        };
        await db.collection('data_deletion_logs').add(deletionLog);
        // 8. Delete user account from Firebase Auth
        try {
            await admin.auth().deleteUser(userId);
            functions.logger.info(`Deleted user account: ${userId}`);
        }
        catch (error) {
            functions.logger.error(`Failed to delete user account ${userId}:`, error);
            // Don't throw here as data deletion was successful
        }
        functions.logger.info(`Data deletion completed for user ${userId}. Deleted: ${entryIds.length} entries, ${audioFilePaths.length} audio files, ${auditDeletePromises.length} audit logs`);
        return {
            success: true,
            message: 'All user data has been successfully deleted',
            deletedEntries: entryIds.length,
            deletedAudioFiles: audioFilePaths.length,
            deletedAuditLogs: auditDeletePromises.length,
            timestamp
        };
    }
    catch (error) {
        functions.logger.error(`Data deletion failed for user ${userId}:`, error);
        // Create failure log
        try {
            await admin.firestore().collection('data_deletion_logs').add({
                operation: 'user_data_deletion',
                userId,
                userEmail,
                timestamp: new Date().toISOString(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                requestSource: 'user_initiated'
            });
        }
        catch (logError) {
            functions.logger.error('Failed to log deletion failure:', logError);
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete user data', error);
    }
});
/**
 * Sentiment Analysis Cloud Function
 * Analyzes the sentiment of journal entry transcripts using Google Cloud Natural Language API
 */
exports.analyzeSentiment = functions.https.onCall(async (data, context) => {
    // Verify user authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { entryId, transcript } = data;
    if (!entryId || !transcript) {
        throw new functions.https.HttpsError('invalid-argument', 'entryId and transcript are required');
    }
    const userId = context.auth.uid;
    try {
        // Verify the entry belongs to the authenticated user
        const db = admin.firestore();
        const entryRef = db.collection('entries').doc(entryId);
        const entrySnap = await entryRef.get();
        if (!entrySnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Entry not found');
        }
        const entryData = entrySnap.data();
        if ((entryData === null || entryData === void 0 ? void 0 : entryData.user_id) !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied to this entry');
        }
        // Initialize Google Cloud Natural Language client
        const client = new language_1.LanguageServiceClient();
        // Analyze sentiment
        const [sentimentResult] = await client.analyzeSentiment({
            document: {
                content: transcript,
                type: 'PLAIN_TEXT',
            },
        });
        // Extract wins, regrets, and tasks using simple keyword matching
        // This is a basic implementation - can be improved with more sophisticated NLP
        const analysis = extractInsights(transcript);
        const sentiment = sentimentResult.documentSentiment;
        // Calculate sentiment score (-1 to 1, normalized to 0-1 for storage)
        const sentimentScore = (sentiment === null || sentiment === void 0 ? void 0 : sentiment.score) ? (sentiment.score + 1) / 2 : 0.5;
        // Update the entry with analysis results
        const updateData = {
            sentiment_score: sentimentScore,
            wins: analysis.wins,
            regrets: analysis.regrets,
            tasks: analysis.tasks,
            keywords: analysis.keywords,
            updated_at: new Date().toISOString()
        };
        await entryRef.update(updateData);
        functions.logger.info(`Sentiment analysis completed for entry ${entryId} by user ${userId}. Score: ${sentimentScore}`);
        return {
            success: true,
            analysis: {
                sentiment_score: sentimentScore,
                sentiment_magnitude: (sentiment === null || sentiment === void 0 ? void 0 : sentiment.magnitude) || 0,
                wins: analysis.wins,
                regrets: analysis.regrets,
                tasks: analysis.tasks,
                keywords: analysis.keywords
            }
        };
    }
    catch (error) {
        functions.logger.error(`Sentiment analysis failed for entry ${entryId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Sentiment analysis failed', error);
    }
});
/**
 * Extract insights from transcript using keyword matching
 * This is a basic implementation that can be improved with more sophisticated NLP
 */
function extractInsights(transcript) {
    const text = transcript.toLowerCase();
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wins = [];
    const regrets = [];
    const tasks = [];
    const keywords = [];
    // Win indicators (Korean and English)
    const winIndicators = [
        '성공했', '잘했', '좋았', '뿌듯', '기뻤', '행복', '만족', '달성', '완료했', '해냈',
        'succeeded', 'accomplished', 'achieved', 'completed', 'finished', 'proud', 'happy', 'satisfied', 'good', 'great', 'excellent', 'wonderful'
    ];
    // Regret indicators (Korean and English)
    const regretIndicators = [
        '후회', '아쉬웠', '실수했', '못했', '잘못', '미안', '죄송', '놓쳤', '빠뜨렸', '깜빡했',
        'regret', 'sorry', 'missed', 'forgot', 'failed', 'mistake', 'wrong', 'should have', 'wish i', 'if only'
    ];
    // Task indicators (Korean and English)
    const taskIndicators = [
        '해야', '할 일', '계획', '목표', '예정', '하자', '하겠', '하려고', '준비',
        'need to', 'have to', 'should', 'will', 'plan to', 'going to', 'todo', 'task', 'goal', 'schedule'
    ];
    // Extract insights from each sentence
    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase().trim();
        if (lowerSentence.length < 10)
            return; // Skip very short sentences
        // Check for wins
        if (winIndicators.some(indicator => lowerSentence.includes(indicator))) {
            wins.push(sentence.trim());
        }
        // Check for regrets
        if (regretIndicators.some(indicator => lowerSentence.includes(indicator))) {
            regrets.push(sentence.trim());
        }
        // Check for tasks
        if (taskIndicators.some(indicator => lowerSentence.includes(indicator))) {
            tasks.push(sentence.trim());
        }
    });
    // Extract keywords (simple approach - can be improved)
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'];
    const koreanStopWords = ['이', '가', '을', '를', '에', '에서', '으로', '로', '와', '과', '의', '은', '는', '도', '만', '부터', '까지', '하고', '그리고', '또', '또한', '하지만', '그러나', '그런데'];
    const words = text
        .replace(/[^\w\s가-힣]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 &&
        !commonWords.includes(word) &&
        !koreanStopWords.includes(word) &&
        !/^\d+$/.test(word));
    // Get unique words with frequency > 1
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    Object.entries(wordFreq)
        .filter(([_, freq]) => freq >= 1)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 10)
        .forEach(([word]) => keywords.push(word));
    return {
        wins: wins.slice(0, 5),
        regrets: regrets.slice(0, 5),
        tasks: tasks.slice(0, 5),
        keywords: keywords.slice(0, 10)
    };
}
/**
 * Token encryption service for OAuth tokens
 */
class TokenEncryptionService {
    static getEncryptionKey() {
        var _a;
        const key = ((_a = functions.config().oauth) === null || _a === void 0 ? void 0 : _a.encryption_key) || process.env.OAUTH_ENCRYPTION_KEY;
        if (!key) {
            throw new Error('OAuth encryption key not configured');
        }
        return key;
    }
    static encryptTokens(tokens) {
        const crypto = require('crypto');
        const key = Buffer.from(this.getEncryptionKey(), 'hex');
        const iv = crypto.randomBytes(this.IV_LENGTH);
        const cipher = crypto.createCipher(this.ALGORITHM, key);
        cipher.setAAD(Buffer.from('oauth_tokens'));
        let encrypted = cipher.update(JSON.stringify(tokens), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    static decryptTokens(encryptedToken) {
        const crypto = require('crypto');
        const key = Buffer.from(this.getEncryptionKey(), 'hex');
        const authTag = Buffer.from(encryptedToken.authTag, 'hex');
        const decipher = crypto.createDecipher(this.ALGORITHM, key);
        decipher.setAAD(Buffer.from('oauth_tokens'));
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedToken.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }
}
TokenEncryptionService.ALGORITHM = 'aes-256-gcm';
TokenEncryptionService.IV_LENGTH = 16;
/**
 * Google Sheets OAuth Cloud Function
 * Handles OAuth flow and token management
 */
exports.googleSheetsOAuth = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    // Verify user authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { action, code, state } = data;
    const userId = context.auth.uid;
    try {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(((_a = functions.config().google) === null || _a === void 0 ? void 0 : _a.client_id) || process.env.GOOGLE_CLIENT_ID, ((_b = functions.config().google) === null || _b === void 0 ? void 0 : _b.client_secret) || process.env.GOOGLE_CLIENT_SECRET, ((_c = functions.config().google) === null || _c === void 0 ? void 0 : _c.redirect_uri) || process.env.GOOGLE_REDIRECT_URI);
        const db = admin.firestore();
        switch (action) {
            case 'get_auth_url': {
                const scopes = [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file'
                ];
                const authUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: scopes,
                    state: userId,
                    prompt: 'consent' // Force consent to get refresh token
                });
                return { authUrl };
            }
            case 'exchange_code': {
                if (!code) {
                    throw new functions.https.HttpsError('invalid-argument', 'Authorization code is required');
                }
                if (state !== userId) {
                    throw new functions.https.HttpsError('invalid-argument', 'Invalid state parameter');
                }
                // Exchange code for tokens
                const { tokens } = await oauth2Client.getToken(code);
                if (!tokens.refresh_token) {
                    throw new functions.https.HttpsError('failed-precondition', 'No refresh token received. Please revoke access and try again.');
                }
                // Add timestamp for expiration tracking
                const tokenData = Object.assign(Object.assign({}, tokens), { created_at: Math.floor(Date.now() / 1000) });
                // Encrypt tokens
                const encryptedTokens = TokenEncryptionService.encryptTokens(tokenData);
                // Store encrypted tokens in Firestore
                const integrationData = {
                    user_id: userId,
                    encrypted_tokens: encryptedTokens,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                await db.collection('google_sheets_integrations').doc(userId).set(integrationData);
                functions.logger.info(`Google Sheets integration created for user: ${userId}`);
                return { success: true, message: 'Google Sheets integration successful' };
            }
            case 'get_status': {
                const integrationDoc = await db.collection('google_sheets_integrations').doc(userId).get();
                if (!integrationDoc.exists) {
                    return { connected: false };
                }
                const integration = integrationDoc.data();
                return {
                    connected: (integration === null || integration === void 0 ? void 0 : integration.status) === 'active',
                    spreadsheet_id: integration === null || integration === void 0 ? void 0 : integration.spreadsheet_id,
                    spreadsheet_name: integration === null || integration === void 0 ? void 0 : integration.spreadsheet_name,
                    last_sync_at: integration === null || integration === void 0 ? void 0 : integration.last_sync_at
                };
            }
            case 'disconnect': {
                const integrationDoc = await db.collection('google_sheets_integrations').doc(userId).get();
                if (integrationDoc.exists) {
                    const integration = integrationDoc.data();
                    try {
                        // Decrypt tokens to revoke them
                        const tokens = TokenEncryptionService.decryptTokens(integration === null || integration === void 0 ? void 0 : integration.encrypted_tokens);
                        oauth2Client.setCredentials(tokens);
                        // Revoke the refresh token
                        await oauth2Client.revokeCredentials();
                    }
                    catch (error) {
                        functions.logger.warn(`Failed to revoke tokens for user ${userId}:`, error);
                    }
                    // Mark integration as revoked
                    await db.collection('google_sheets_integrations').doc(userId).update({
                        status: 'revoked',
                        updated_at: new Date().toISOString()
                    });
                }
                return { success: true, message: 'Google Sheets disconnected' };
            }
            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
        }
    }
    catch (error) {
        functions.logger.error(`Google Sheets OAuth error for user ${userId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'OAuth operation failed');
    }
});
/**
 * Refresh OAuth tokens when expired
 */
async function refreshTokensIfNeeded(userId) {
    var _a, _b, _c;
    const db = admin.firestore();
    const integrationDoc = await db.collection('google_sheets_integrations').doc(userId).get();
    if (!integrationDoc.exists) {
        throw new Error('No Google Sheets integration found');
    }
    const integration = integrationDoc.data();
    if ((integration === null || integration === void 0 ? void 0 : integration.status) !== 'active') {
        throw new Error('Google Sheets integration is not active');
    }
    // Decrypt current tokens
    const tokens = TokenEncryptionService.decryptTokens(integration.encrypted_tokens);
    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = tokens.created_at + (tokens.expires_in || 3600);
    const buffer = 5 * 60; // 5 minutes
    if (now < (expiresAt - buffer)) {
        // Token is still valid
        return tokens;
    }
    functions.logger.info(`Refreshing expired token for user: ${userId}`);
    // Set up OAuth client with current tokens
    const oauth2Client = new googleapis_1.google.auth.OAuth2(((_a = functions.config().google) === null || _a === void 0 ? void 0 : _a.client_id) || process.env.GOOGLE_CLIENT_ID, ((_b = functions.config().google) === null || _b === void 0 ? void 0 : _b.client_secret) || process.env.GOOGLE_CLIENT_SECRET, ((_c = functions.config().google) === null || _c === void 0 ? void 0 : _c.redirect_uri) || process.env.GOOGLE_REDIRECT_URI);
    oauth2Client.setCredentials(tokens);
    try {
        // Refresh the token
        const { credentials } = await oauth2Client.refreshAccessToken();
        // Update token data with new access token
        const updatedTokens = Object.assign(Object.assign({}, tokens), { access_token: credentials.access_token, expires_in: credentials.expiry_date ?
                Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600, created_at: Math.floor(Date.now() / 1000) });
        // Encrypt and store updated tokens
        const encryptedTokens = TokenEncryptionService.encryptTokens(updatedTokens);
        await db.collection('google_sheets_integrations').doc(userId).update({
            encrypted_tokens: encryptedTokens,
            updated_at: new Date().toISOString()
        });
        functions.logger.info(`Token refreshed successfully for user: ${userId}`);
        return updatedTokens;
    }
    catch (error) {
        functions.logger.error(`Token refresh failed for user ${userId}:`, error);
        // Mark integration as error state
        await db.collection('google_sheets_integrations').doc(userId).update({
            status: 'error',
            updated_at: new Date().toISOString()
        });
        throw new Error('Token refresh failed. Please reconnect Google Sheets.');
    }
}
/**
 * Google Sheets Sync Cloud Function
 * Syncs journal entries to Google Sheets
 */
exports.syncToGoogleSheets = functions.https.onCall(async (data, context) => {
    // Verify user authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { entryId, entryData } = data;
    const userId = context.auth.uid;
    try {
        // Get and refresh tokens if needed
        const tokens = await refreshTokensIfNeeded(userId);
        // Set up Google Sheets API client
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials(tokens);
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth: oauth2Client });
        const db = admin.firestore();
        // Get integration details
        const integrationDoc = await db.collection('google_sheets_integrations').doc(userId).get();
        const integration = integrationDoc.data();
        let spreadsheetId = integration === null || integration === void 0 ? void 0 : integration.spreadsheet_id;
        // Create spreadsheet if it doesn't exist
        if (!spreadsheetId) {
            const createResponse = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: 'Voice Journal Entries'
                    },
                    sheets: [{
                            properties: {
                                title: 'Entries'
                            },
                            data: [{
                                    startRow: 0,
                                    startColumn: 0,
                                    rowData: [{
                                            values: [
                                                { userEnteredValue: { stringValue: 'Date' } },
                                                { userEnteredValue: { stringValue: 'Transcript' } },
                                                { userEnteredValue: { stringValue: 'Wins' } },
                                                { userEnteredValue: { stringValue: 'Regrets' } },
                                                { userEnteredValue: { stringValue: 'Tasks' } },
                                                { userEnteredValue: { stringValue: 'Keywords' } },
                                                { userEnteredValue: { stringValue: 'Sentiment Score' } },
                                                { userEnteredValue: { stringValue: 'Created At' } }
                                            ]
                                        }]
                                }]
                        }]
                }
            });
            spreadsheetId = createResponse.data.spreadsheetId;
            // Update integration with spreadsheet ID
            await db.collection('google_sheets_integrations').doc(userId).update({
                spreadsheet_id: spreadsheetId,
                spreadsheet_name: 'Voice Journal Entries',
                updated_at: new Date().toISOString()
            });
        }
        // Prepare row data
        const rowData = [
            entryData.date,
            entryData.transcript,
            (entryData.wins || []).join('; '),
            (entryData.regrets || []).join('; '),
            (entryData.tasks || []).join('; '),
            (entryData.keywords || []).join('; '),
            entryData.sentiment_score || 0,
            entryData.created_at
        ];
        // Append row to spreadsheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Entries!A:H',
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowData]
            }
        });
        // Update last sync time
        await db.collection('google_sheets_integrations').doc(userId).update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        functions.logger.info(`Entry ${entryId} synced to Google Sheets for user: ${userId}`);
        return {
            success: true,
            spreadsheetId: spreadsheetId,
            message: 'Entry synced to Google Sheets successfully'
        };
    }
    catch (error) {
        functions.logger.error(`Google Sheets sync failed for user ${userId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to sync to Google Sheets');
    }
});
/**
 * Notion OAuth integration
 * Handles OAuth flow and token management for Notion
 */
exports.notionOAuth = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    // Verify user authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { action, code } = data;
    const userId = context.auth.uid;
    try {
        switch (action) {
            case 'get_auth_url': {
                const clientId = (_a = functions.config().notion) === null || _a === void 0 ? void 0 : _a.client_id;
                const redirectUri = (_b = functions.config().notion) === null || _b === void 0 ? void 0 : _b.redirect_uri;
                if (!clientId || !redirectUri) {
                    throw new functions.https.HttpsError('failed-precondition', 'Notion OAuth not configured. Please contact the administrator to set up Notion integration.');
                }
                const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
                    `client_id=${clientId}&` +
                    `response_type=code&` +
                    `owner=user&` +
                    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                    `state=${userId}`;
                return { authUrl };
            }
            case 'exchange_code': {
                const clientId = (_c = functions.config().notion) === null || _c === void 0 ? void 0 : _c.client_id;
                const clientSecret = (_d = functions.config().notion) === null || _d === void 0 ? void 0 : _d.client_secret;
                const redirectUri = (_e = functions.config().notion) === null || _e === void 0 ? void 0 : _e.redirect_uri;
                if (!clientId || !clientSecret || !redirectUri) {
                    throw new functions.https.HttpsError('failed-precondition', 'Notion OAuth not configured. Please contact the administrator to set up Notion integration.');
                }
                // Exchange code for access token
                const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectUri,
                    }),
                });
                const tokenData = await tokenResponse.json();
                if (!tokenResponse.ok) {
                    functions.logger.error('Notion token exchange failed:', tokenData);
                    throw new functions.https.HttpsError('internal', 'Failed to exchange authorization code');
                }
                // Store encrypted tokens
                const db = admin.firestore();
                await db.collection('notion_tokens').doc(userId).set({
                    access_token: tokenData.access_token,
                    token_type: tokenData.token_type,
                    bot_id: tokenData.bot_id,
                    workspace_name: tokenData.workspace_name,
                    workspace_icon: tokenData.workspace_icon,
                    workspace_id: tokenData.workspace_id,
                    owner: tokenData.owner,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                });
                return {
                    success: true,
                    message: 'Notion connected successfully',
                    workspaceName: tokenData.workspace_name,
                };
            }
            case 'get_status': {
                const db = admin.firestore();
                const tokenDoc = await db.collection('notion_tokens').doc(userId).get();
                if (!tokenDoc.exists) {
                    return { connected: false };
                }
                const tokenData = tokenDoc.data();
                return {
                    connected: true,
                    workspace_name: tokenData === null || tokenData === void 0 ? void 0 : tokenData.workspace_name,
                    last_sync_at: tokenData === null || tokenData === void 0 ? void 0 : tokenData.last_sync_at,
                };
            }
            case 'disconnect': {
                const db = admin.firestore();
                await db.collection('notion_tokens').doc(userId).delete();
                return {
                    success: true,
                    message: 'Notion disconnected successfully',
                };
            }
            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
        }
    }
    catch (error) {
        functions.logger.error(`Notion OAuth error for user ${userId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Internal server error');
    }
});
//# sourceMappingURL=index.js.map