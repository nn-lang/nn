const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("oxc-transform");
const ts = require("typescript");

const projectRoot = process.cwd();
const packageArg = process.argv[2];

if (!packageArg) {
  console.error("Usage: node scripts/oxc-build.cjs <package-path>");
  process.exit(1);
}

const packageRoot = path.resolve(projectRoot, packageArg);
const srcRoot = path.join(packageRoot, "src");
const outRoot = path.join(packageRoot, "out");
const outSrcRoot = path.join(outRoot, "src");

if (!fs.existsSync(srcRoot)) {
  console.error(`Missing src directory: ${srcRoot}`);
  process.exit(1);
}

fs.rmSync(outSrcRoot, { recursive: true, force: true });

const sourceFiles = [];

function collectSourceFiles(currentDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      collectSourceFiles(entryPath);
      continue;
    }

    if (entry.name.endsWith(".d.ts")) {
      continue;
    }

    if (/\.(ts|tsx|cts|mts|js|jsx|cjs|mjs)$/.test(entry.name)) {
      sourceFiles.push(entryPath);
    }
  }
}

function getLangFromExtension(filePath) {
  const ext = path.extname(filePath);

  if (ext === ".ts" || ext === ".cts" || ext === ".mts") {
    return "ts";
  }

  if (ext === ".tsx") {
    return "tsx";
  }

  if (ext === ".jsx") {
    return "jsx";
  }

  return "js";
}

function getOutputExtension(filePath) {
  const ext = path.extname(filePath);

  if (ext === ".cts") {
    return ".cjs";
  }

  if (ext === ".mts") {
    return ".mjs";
  }

  return ".js";
}

collectSourceFiles(srcRoot);

let hasError = false;

for (const sourceFilePath of sourceFiles) {
  const sourceCode = fs.readFileSync(sourceFilePath, "utf8");
  const relativeFromPackage = path
    .relative(packageRoot, sourceFilePath)
    .split(path.sep)
    .join("/");
  const relativeFromSrc = path.relative(srcRoot, sourceFilePath);
  const outputExtension = getOutputExtension(sourceFilePath);
  const outputRelativePath = relativeFromSrc.replace(
    /\.[^.]+$/,
    outputExtension,
  );
  const outputPath = path.join(outSrcRoot, outputRelativePath);
  const result = transformSync(relativeFromPackage, sourceCode, {
    lang: getLangFromExtension(sourceFilePath),
    sourceType: "commonjs",
    sourcemap: false,
    target: "es2015",
  });

  if (result.errors.length > 0) {
    hasError = true;

    for (const error of result.errors) {
      const message = error.codeframe
        ? `${error.message}\n${error.codeframe}`
        : error.message;
      console.error(`[oxc-build] ${relativeFromPackage}: ${message}`);
    }

    continue;
  }

  const transpiled = ts.transpileModule(result.code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
      sourceMap: true,
      esModuleInterop: true,
    },
    fileName: path.basename(outputPath),
  });

  if (transpiled.diagnostics && transpiled.diagnostics.length > 0) {
    hasError = true;

    for (const diagnostic of transpiled.diagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );
      console.error(`[oxc-build] ${relativeFromPackage}: ${message}`);
    }

    continue;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, transpiled.outputText, "utf8");

  if (transpiled.sourceMapText) {
    fs.writeFileSync(`${outputPath}.map`, transpiled.sourceMapText, "utf8");
  }
}

if (hasError) {
  process.exit(1);
}
