import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  roots: ["./tests"],
  preset: "ts-jest",
  maxWorkers: 1,
};

export default config;
