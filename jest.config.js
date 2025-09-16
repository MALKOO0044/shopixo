// DEPRECATED: This CommonJS config is retained only for compatibility with certain IDEs.
// The authoritative Jest config is jest.config.mjs (ESM) and is used by package.json scripts.
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
};

module.exports = createJestConfig(customJestConfig);
