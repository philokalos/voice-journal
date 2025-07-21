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
exports.deleteUserData = exports.calculateChanges = exports.logEntryAudit = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
//# sourceMappingURL=index.js.map