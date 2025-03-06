module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    transform: {
      '^.+\\.tsx?$': 'babel-jest', // Use babel-jest for .tsx and .ts files
    },
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
    transformIgnorePatterns: [
      "/node_modules/(?!axios|mynth-use-cardano)"
    ],
  };
  