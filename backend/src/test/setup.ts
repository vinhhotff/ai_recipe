import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

// Mock Prisma client
export const prisma = mockDeep<PrismaClient>();

// Mock Redis client
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  mockReset(prisma);
  jest.clearAllMocks();
});

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_ENABLED = 'false'; // Disable Redis for tests

// Mock external services
jest.mock('axios');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

// Mock file system operations
jest.mock('fs');

// Global test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  role: 'user',
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  deletedAt: null,
  ...overrides,
});

export const createMockIngredient = (overrides = {}) => ({
  id: 'test-ingredient-id',
  name: 'Test Ingredient',
  description: 'Test ingredient description',
  canonicalUnit: 'g',
  basePrice: 5.0,
  currency: 'VND',
  available: true,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  deletedAt: null,
  ...overrides,
});

export const createMockSubscriptionPlan = (overrides = {}) => ({
  id: 'test-plan-id',
  name: 'Free Plan',
  description: 'Basic free plan',
  price: 0,
  yearlyPrice: 0,
  billingInterval: 'MONTHLY',
  features: {
    maxRecipeGenerations: 5,
    maxVideoGenerations: 1,
    maxCommunityPosts: 3,
    maxCommunityComments: 10,
    exportToPdf: false,
    aiSuggestions: false,
    prioritySupport: false,
    premiumTemplates: false,
  },
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockRequest = (overrides = {}) => ({
  user: createMockUser(),
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides,
});

export const createMockResponse = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};
