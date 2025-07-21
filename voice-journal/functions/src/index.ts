import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

interface AuditLogEntry {
  operation: "create" | "update" | "delete";
  entryId: string;
  userId: string;
  timestamp: string;
  beforeData?: any;
  afterData?: any;
  changes?: Record<string, { before: any; after: any }>;
}

/**
 * Cloud Function to log all changes to journal entries for audit purposes
 * Triggered whenever a document in the 'entries' collection is written (created, updated, or deleted)
 */
export const logEntryAudit = functions.firestore
  .document("entries/{entryId}")
  .onWrite(async (change, context) => {
    const entryId = context.params.entryId;
    const timestamp = new Date().toISOString();
    
    try {
      // Determine operation type
      let operation: AuditLogEntry["operation"];
      let beforeData: any = null;
      let afterData: any = null;
      let changes: Record<string, { before: any; after: any }> = {};
      
      if (!change.before.exists && change.after.exists) {
        // Document was created
        operation = "create";
        afterData = change.after.data();
      } else if (change.before.exists && !change.after.exists) {
        // Document was deleted
        operation = "delete";
        beforeData = change.before.data();
      } else if (change.before.exists && change.after.exists) {
        // Document was updated
        operation = "update";
        beforeData = change.before.data();
        afterData = change.after.data();
        
        // Calculate the diff for updates
        changes = calculateChanges(beforeData, afterData);
      } else {
        // This shouldn't happen, but just in case
        functions.logger.warn(`Unknown operation type for entry ${entryId}`);
        return;
      }
      
      // Get user ID from the document data
      const userId = afterData?.user_id || beforeData?.user_id;
      if (!userId) {
        functions.logger.error(`No user_id found for entry ${entryId}`);
        return;
      }
      
      // Create audit log entry
      const auditLog: AuditLogEntry = {
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
      
    } catch (error) {
      functions.logger.error(`Failed to create audit log for entry ${entryId}:`, error);
      // Don't throw error to avoid blocking the original operation
    }
  });

/**
 * Calculate what fields changed between before and after data
 */
export function calculateChanges(before: any, after: any): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  
  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  
  for (const key of allKeys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    // Skip system fields that change automatically
    if (key === "updated_at") continue;
    
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