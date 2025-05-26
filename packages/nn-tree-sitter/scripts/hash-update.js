const { writeFileSync, readFileSync } = require("fs");

const target = require("crypto")
  .createHash("sha256")
  .update(readFileSync("./grammar.js", "utf8"))
  .digest("hex");

writeFileSync("./scripts/.build-hash", target);
