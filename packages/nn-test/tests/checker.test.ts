import * as fs from "fs";
import * as path from "path";

import { SourceFile } from 'nn-language';
import { TypeChecker } from "@nn-lang/nn-type-checker";

const file = fs.readdirSync(path.join(__dirname, 'cases'));
const sources = file.filter((f) => f.endsWith('.nn'));

describe("checker", () => {
  sources.forEach((file) => {
    it(`should type check ${file}`, async () => {
      const parserInput = fs.readFileSync(path.join(__dirname, 'cases', file), 'utf8');

      const source = SourceFile.parse(parserInput, file);
      expect(() => TypeChecker.check(source))
        .not.toThrow();
    });
  });
})
