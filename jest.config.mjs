import nextJest from 'next/jest.js'
 
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const config = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: [
    '/node_modules/(?!lucide-react)/',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/tests/', '/tests-examples/'],
  moduleNameMapper: {
    // Handle CSS imports (if you're using CSS Modules)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
 
    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}
 
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
