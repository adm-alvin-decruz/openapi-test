module.exports = {
  testEnvironment: 'node',
  // Force Jest to exit after tests complete
  // This prevents hanging when there are open handles
  forceExit: true,
  // Detect open handles (useful for debugging)
  detectOpenHandles: false, // Set to true if you want to see what's keeping Jest alive
  // Test timeout (30 seconds)
  testTimeout: 30000,
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
