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
const admin = __importStar(require("firebase-admin"));
const test = __importStar(require("firebase-functions-test"));
const index_1 = require("../index");
// Initialize Firebase Functions Test
const testEnv = test();
// Mock environment
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback';
process.env.OAUTH_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
describe('Cloud Functions', () => {
    afterAll(() => {
        testEnv.cleanup();
    });
    describe('calculateChanges', () => {
        it('should detect changes between objects', () => {
            const before = {
                name: 'John',
                age: 30,
                city: 'New York',
                updated_at: '2024-01-01'
            };
            const after = {
                name: 'John',
                age: 31,
                city: 'Boston',
                updated_at: '2024-01-02'
            };
            const changes = (0, index_1.calculateChanges)(before, after);
            expect(changes).toEqual({
                age: { before: 30, after: 31 },
                city: { before: 'New York', after: 'Boston' }
            });
            // updated_at should be ignored
            expect(changes.updated_at).toBeUndefined();
        });
        it('should handle added fields', () => {
            const before = { name: 'John' };
            const after = { name: 'John', age: 30 };
            const changes = (0, index_1.calculateChanges)(before, after);
            expect(changes).toEqual({
                age: { before: undefined, after: 30 }
            });
        });
        it('should handle removed fields', () => {
            const before = { name: 'John', age: 30 };
            const after = { name: 'John' };
            const changes = (0, index_1.calculateChanges)(before, after);
            expect(changes).toEqual({
                age: { before: 30, after: undefined }
            });
        });
        it('should return empty object when no changes', () => {
            const data = { name: 'John', age: 30, updated_at: '2024-01-01' };
            const changes = (0, index_1.calculateChanges)(data, Object.assign(Object.assign({}, data), { updated_at: '2024-01-02' }));
            expect(changes).toEqual({});
        });
    });
    describe('extractInsights', () => {
        it('should extract wins from English text', () => {
            const transcript = 'Today was great! I successfully completed my project. I feel proud of the work I accomplished.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.wins).toContain('I successfully completed my project');
            expect(insights.wins).toContain('I feel proud of the work I accomplished');
        });
        it('should extract wins from Korean text', () => {
            const transcript = '오늘 정말 잘했다. 프로젝트를 성공적으로 완료했고 기분이 좋았다.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.wins.length).toBeGreaterThan(0);
            expect(insights.wins.some(win => win.includes('성공'))).toBe(true);
        });
        it('should extract regrets from English text', () => {
            const transcript = 'I regret not starting earlier. I wish I had prepared better. I made a mistake with the timing.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.regrets).toContain('I regret not starting earlier');
            expect(insights.regrets).toContain('I wish I had prepared better');
            expect(insights.regrets).toContain('I made a mistake with the timing');
        });
        it('should extract regrets from Korean text', () => {
            const transcript = '늦게 시작한 것이 후회된다. 실수를 했다.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.regrets.length).toBeGreaterThan(0);
            expect(insights.regrets.some(regret => regret.includes('후회'))).toBe(true);
        });
        it('should extract tasks from English text', () => {
            const transcript = 'Tomorrow I need to finish the report. I should call the client. I plan to review the code.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.tasks).toContain('Tomorrow I need to finish the report');
            expect(insights.tasks).toContain('I should call the client');
            expect(insights.tasks).toContain('I plan to review the code');
        });
        it('should extract tasks from Korean text', () => {
            const transcript = '내일 보고서를 완료해야 한다. 고객에게 전화하자. 코드를 검토할 계획이다.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.tasks.length).toBeGreaterThan(0);
            expect(insights.tasks.some(task => task.includes('해야'))).toBe(true);
        });
        it('should extract keywords', () => {
            const transcript = 'Today I worked on the important project with React and JavaScript. The development process was challenging but rewarding.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.keywords).toContain('project');
            expect(insights.keywords).toContain('react');
            expect(insights.keywords).toContain('javascript');
        });
        it('should filter out common stop words', () => {
            const transcript = 'The quick brown fox jumps over the lazy dog';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.keywords).not.toContain('the');
            expect(insights.keywords).not.toContain('over');
        });
        it('should limit results to maximum counts', () => {
            const longTranscript = Array(20).fill('I accomplished something great today. I regret not doing more. I need to work harder tomorrow.').join(' ');
            const insights = (0, index_1.extractInsights)(longTranscript);
            expect(insights.wins.length).toBeLessThanOrEqual(5);
            expect(insights.regrets.length).toBeLessThanOrEqual(5);
            expect(insights.tasks.length).toBeLessThanOrEqual(5);
            expect(insights.keywords.length).toBeLessThanOrEqual(10);
        });
        it('should skip very short sentences', () => {
            const transcript = 'Yes. No. Maybe. Today I accomplished a significant project milestone that took weeks to complete.';
            const insights = (0, index_1.extractInsights)(transcript);
            // Short sentences should be filtered out
            expect(insights.wins).not.toContain('Yes');
            expect(insights.wins).not.toContain('No');
            expect(insights.wins).not.toContain('Maybe');
            // Long sentences should be included
            expect(insights.wins.some(win => win.includes('accomplished'))).toBe(true);
        });
        it('should handle empty or invalid input', () => {
            const insights = (0, index_1.extractInsights)('');
            expect(insights.wins).toEqual([]);
            expect(insights.regrets).toEqual([]);
            expect(insights.tasks).toEqual([]);
            expect(insights.keywords).toEqual([]);
        });
        it('should handle mixed language content', () => {
            const transcript = 'Today I successfully completed my work. 오늘 정말 잘했다. Tomorrow I need to prepare for the meeting. 내일 회의 준비를 해야 한다.';
            const insights = (0, index_1.extractInsights)(transcript);
            expect(insights.wins.length).toBeGreaterThan(0);
            expect(insights.tasks.length).toBeGreaterThan(0);
            // Should contain both English and Korean insights
            expect(insights.wins.some(win => win.includes('successfully'))).toBe(true);
            expect(insights.wins.some(win => win.includes('잘했다'))).toBe(true);
        });
    });
    describe('Integration Tests', () => {
        beforeEach(() => {
            // Clear all mocks before each test
            jest.clearAllMocks();
        });
        it('should handle sentiment analysis workflow', async () => {
            const mockContext = {
                auth: {
                    uid: 'test-user-id',
                    token: { email: 'test@example.com' }
                },
                params: {}
            };
            const mockData = {
                entryId: 'test-entry-id',
                transcript: 'Today was amazing! I completed all my tasks successfully.'
            };
            // Mock Firestore operations
            const mockEntry = {
                exists: true,
                data: () => ({
                    user_id: 'test-user-id',
                    transcript: mockData.transcript
                })
            };
            const mockUpdate = jest.fn().mockResolvedValue({});
            // Mock admin SDK
            const mockFirestore = {
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(mockEntry),
                        update: mockUpdate
                    })
                })
            };
            jest.spyOn(admin, 'firestore').mockReturnValue(mockFirestore);
            // This would test the actual cloud function if we could import it
            // For now, we test the constituent parts
            const insights = (0, index_1.extractInsights)(mockData.transcript);
            expect(insights.wins.length).toBeGreaterThan(0);
            expect(insights.wins.some(win => win.includes('amazing') || win.includes('successfully'))).toBe(true);
        });
    });
});
//# sourceMappingURL=index.test.js.map