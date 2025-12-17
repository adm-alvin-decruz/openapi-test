module.exports = {
  testEnvironment: 'node',
  // Force Jest to exit after tests complete
  // This prevents hanging when there are open handles (database connections, timers, etc.)
  forceExit: true,
  // Detect open handles (useful for debugging - set to true to see what's keeping Jest alive)
  detectOpenHandles: false,
  // Test timeout (30 seconds)
  testTimeout: 30000,
  // Max workers - limit concurrent test execution to avoid too many database connections
  maxWorkers: 2,
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__test__/**',
    '!src/**/node_modules/**',
  ],
  // Setup files
  setupFilesAfterEnv: [],
  // Clear mocks between tests
  clearMocks: true,
  // Reset mocks between tests
  resetMocks: true,
  // Restore mocks between tests
  restoreMocks: false,
};
