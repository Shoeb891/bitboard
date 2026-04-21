// Jest config — integration tests against a Dockerised Postgres, Supabase auth mocked.
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  globalSetup: "<rootDir>/tests/globalSetup.js",
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 30000,
  verbose: true,
};
