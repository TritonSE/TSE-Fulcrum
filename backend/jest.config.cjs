module.exports = {
  preset: "@shelf/jest-mongodb",
  transform: {
    "^.*\\.tsx?$": "ts-jest",
  },
  testRegex: "^.*\\.test\\.(jsx?|tsx?)$",
  testPathIgnorePatterns: ["/node_modules", "<rootDir>/dist/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^src/(.*)": "<rootDir>/src/$1",
    "^\\.\\./firebase$": "<rootDir>/tests/mocks/firebase.ts",
  },
};
