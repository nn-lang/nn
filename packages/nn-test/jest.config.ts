import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  roots: ["./tests"],
  extensionsToTreatAsEsm: [".ts"],
  maxWorkers: 1,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  preset: "ts-jest/presets/default-esm",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Bundler",
        },
        useESM: true,
      },
    ],
  },
};

export default config;
