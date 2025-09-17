module.exports = {
  preset: "@shelf/jest-mongodb",
  transform: {
    "^.*\\.tsx?$": "ts-jest",
  },
  testRegex: "^.*\\.test\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^src/(.*)": "<rootDir>/src/$1",
  },
};
