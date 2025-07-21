/**
 * Simple test to verify audit logging functionality
 * This would normally be run with Jest or similar testing framework
 */

import { calculateChanges } from "./index";

// Mock data for testing
const beforeData = {
  transcript: "Today was a good day",
  wins: ["Completed project"],
  regrets: [],
  tasks: ["Call mom"],
  user_id: "user123",
  created_at: "2025-01-01T10:00:00Z",
  updated_at: "2025-01-01T10:00:00Z"
};

const afterData = {
  transcript: "Today was a great day",
  wins: ["Completed project", "Exercised"],
  regrets: ["Stayed up too late"],
  tasks: ["Call mom", "Buy groceries"],
  user_id: "user123",
  created_at: "2025-01-01T10:00:00Z",
  updated_at: "2025-01-01T11:00:00Z"
};

// Test change calculation
const changes = calculateChanges(beforeData, afterData);

console.log("Changes detected:", JSON.stringify(changes, null, 2));

// Expected changes:
// - transcript: "Today was a good day" -> "Today was a great day"
// - wins: ["Completed project"] -> ["Completed project", "Exercised"]
// - regrets: [] -> ["Stayed up too late"]
// - tasks: ["Call mom"] -> ["Call mom", "Buy groceries"]
// - updated_at should be ignored

export { };