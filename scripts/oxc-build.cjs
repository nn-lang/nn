const fs = require("node:fs");
const path = require("node:path");
const { transformSync } = require("oxc-transform");

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

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function resolveSourceSpecifier(sourceFilePath, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  const sourceDir = path.dirname(sourceFilePath);
  const resolvedPath = path.resolve(sourceDir, specifier);
  const ext = path.extname(resolvedPath);

  if (ext) {
    return specifier;
  }

  const candidates = [
    resolvedPath,
    `${resolvedPath}.ts`,
    `${resolvedPath}.tsx`,
    `${resolvedPath}.mts`,
    `${resolvedPath}.cts`,
    `${resolvedPath}.js`,
    `${resolvedPath}.jsx`,
    `${resolvedPath}.mjs`,
    `${resolvedPath}.cjs`,
    path.join(resolvedPath, "index.ts"),
    path.join(resolvedPath, "index.tsx"),
    path.join(resolvedPath, "index.mts"),
    path.join(resolvedPath, "index.cts"),
    path.join(resolvedPath, "index.js"),
    path.join(resolvedPath, "index.jsx"),
    path.join(resolvedPath, "index.mjs"),
    path.join(resolvedPath, "index.cjs"),
  ];

  const targetPath = candidates.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );

  if (!targetPath) {
    return `${specifier}.js`;
  }

  const outputExtension = getOutputExtension(targetPath);
  const outputTargetPath = targetPath.replace(/\.[^.]+$/, outputExtension);
  let relativePath = toPosixPath(path.relative(sourceDir, outputTargetPath));

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

function rewriteModuleSpecifiers(code, sourceFilePath) {
  return code
    .replace(
      /\b(from\s*["'])([^"']+)(["'])/g,
      (_match, prefix, specifier, suffix) =>
        `${prefix}${resolveSourceSpecifier(sourceFilePath, specifier)}${suffix}`,
    )
    .replace(
      /\b(import\s*\(\s*["'])([^"']+)(["']\s*\))/g,
      (_match, prefix, specifier, suffix) =>
        `${prefix}${resolveSourceSpecifier(sourceFilePath, specifier)}${suffix}`,
    );
}

collectSourceFiles(srcRoot);

let hasError = false;
const packageJsonPath = path.join(packageRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const outputSourceRoot =
  typeof packageJson.main === "string" &&
  packageJson.main.startsWith("out/src/")
    ? outSrcRoot
    : outRoot;

fs.rmSync(outputSourceRoot, { recursive: true, force: true });

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
  const outputPath = path.join(outputSourceRoot, outputRelativePath);
  const transformed = transformSync(relativeFromPackage, sourceCode, {
    lang: getLangFromExtension(sourceFilePath),
    sourceType: "module",
    sourcemap: true,
    target: "es2022",
  });

  if (transformed.errors.length > 0) {
    hasError = true;

    for (const error of transformed.errors) {
      const message = error.codeframe
        ? `${error.message}\n${error.codeframe}`
        : error.message;
      console.error(`[oxc-build] ${relativeFromPackage}: ${message}`);
    }

    continue;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const outputCode = rewriteModuleSpecifiers(transformed.code, sourceFilePath);

  fs.writeFileSync(
    outputPath,
    `${outputCode}\n//# sourceMappingURL=${path.basename(outputPath)}.map\n`,
    "utf8",
  );

  if (transformed.map) {
    fs.writeFileSync(
      `${outputPath}.map`,
      JSON.stringify(transformed.map),
      "utf8",
    );
  }
}

if (hasError) {
  process.exit(1);
}
