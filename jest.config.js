const tsJestTransformer = require.resolve('ts-jest');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test', '<rootDir>/frontend/src'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)sx?$': tsJestTransformer,
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', 'frontend/src/**/*.(t|j)sx?'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@scheduling/(.*)$': '<rootDir>/src/scheduling/$1',
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
  },
};
