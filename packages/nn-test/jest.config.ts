import { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  roots: ["./tests"],
  preset: "ts-jest",
};

export default config;
