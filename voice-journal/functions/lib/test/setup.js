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
// Initialize Firebase Admin for testing
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'test-project',
    });
}
// Mock Google Cloud Language
jest.mock('@google-cloud/language', () => ({
    LanguageServiceClient: jest.fn().mockImplementation(() => ({
        analyzeSentiment: jest.fn().mockResolvedValue([{
                documentSentiment: {
                    score: 0.5,
                    magnitude: 0.8
                },
                sentences: []
            }]),
        classifyText: jest.fn().mockResolvedValue([{
                categories: [
                    { name: '/Arts & Entertainment', confidence: 0.8 }
                ]
            }])
    }))
}));
// Mock Google APIs
jest.mock('googleapis', () => ({
    google: {
        auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' })
            }))
        },
        sheets: jest.fn().mockImplementation(() => ({
            spreadsheets: {
                create: jest.fn().mockResolvedValue({
                    data: {
                        spreadsheetId: 'mock-spreadsheet-id',
                        properties: {
                            title: 'Voice Journal Entries'
                        }
                    }
                }),
                values: {
                    append: jest.fn().mockResolvedValue({
                        data: {
                            updates: {
                                updatedRows: 1
                            }
                        }
                    })
                }
            }
        }))
    }
}));
// Mock Firebase Functions test utilities
beforeEach(() => {
    jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map