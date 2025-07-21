"use strict";
/**
 * Simple test to verify audit logging functionality
 * This would normally be run with Jest or similar testing framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
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
const changes = (0, index_1.calculateChanges)(beforeData, afterData);
console.log("Changes detected:", JSON.stringify(changes, null, 2));
//# sourceMappingURL=test-audit.js.map