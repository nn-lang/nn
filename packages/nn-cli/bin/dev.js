#!/usr/bin/env node

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

(async () => {
  const oclif = await import("@oclif/core");
  await oclif.execute({ dir: currentDir });
})();
