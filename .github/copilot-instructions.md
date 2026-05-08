# Copilot Instructions

## Commands

```bash
yarn install && yarn build   # install deps and build all packages
yarn build                   # build all packages in parallel (uses OXC-based builder)
yarn test                    # run all tests (jest, in nn-test package)
yarn lint                    # run oxlint
yarn lint:fix                # run oxlint with auto-fix
yarn format                  # run oxfmt (write mode)
yarn format:check            # run oxfmt in check mode

# Run a single test by name pattern
yarn workspace @nn-lang/nn-test test -- --testNamePattern "should type check Linear.nn"

# Run the CLI locally
yarn nn-cli check input.nn
yarn nn-cli onnx input.nn --size A=0 --target Model -o output.onnx
```

## Architecture

This is a compiler/toolchain for `nn`, a DSL for defining deep neural network models. The pipeline is:

```
.nn source files
  → nn-tree-sitter  (Tree-sitter grammar → parse tree)
  → nn-language     (parse tree → AST, Workspace/SourceFile management)
  → nn-type-checker (name resolution + type/size constraint checking)
  → nn-analyzer     (static parameter count analysis via Polynomial)
  → nn-codegen      (code generation: Python/tinygrad, ONNX)
  → nn-cli          (oclif-based CLI that wires everything together)
```

**`nn-language`**: Defines the AST (`ast.ts`), the `Workspace` and `SourceFile` types, and the Tree-sitter → AST transform (`transform/tree-sitter.ts`). `Workspace` manages a dependency graph of `SourceFile`s resolved from import statements. Every AST node extends `Node` (has `id`, `position`, `source`, `type`) and is created via `createNode()`.

**`nn-type-checker`**: Two sequential phases:
1. **Resolve** (`resolver/`): Builds `WorkspaceScope` by walking declarations, resolving imports, detecting circular flows and duplicate names.
2. **Checker** (`checker/`): Iterative constraint propagation — collects `Vertex` (typed node) and `Edge` (constraint between nodes) objects, then repeatedly calls `Edge.solve()` until all are resolved. Types are always `Tensor` with a `SizeType[]` shape; size arithmetic uses a `Polynomial` representation.

**`nn-type-checker` / `nn-analyzer`**: The only public tensor type is `{ type: "Tensor", shape: SizeType[] }`. `Polynomial` is used for symbolic size arithmetic at analysis time.

**`nn-test`**: Integration tests. Test cases are `.nn` files in `tests/cases/`. Files named `*.error.json` describe expected diagnostics. Tests use a `TestFileSystem` shim (`utils.ts`) to avoid real I/O.

## Key Conventions

### Namespace pattern for static methods
Types expose operations as TypeScript `namespace` members rather than class static methods:
```ts
TypeChecker.check(workspace)   // not new TypeChecker()
Workspace.create(uris, opts, parser)
Type.from(node, scope)
Polynomial.add(a, b)
```

### `ts-features` for Result/Option
Never throw for recoverable errors. Use `ok`/`err` for `Result<T, E>` and `Some`/`None` for `Option<T>` from the `ts-features` package:
```ts
return err(`File ${path} not found`);
return ok(result);
value.mapOrElse(fallback, (v) => use(v));
```

### Diagnostics are non-throwing
Errors are collected as `Diagnostic[]` on `SourceFile`, `Workspace`, or `TypeChecker` — never thrown. `TypeChecker.nonRecoverable` gates whether the checker phase runs.

### Unused variables
Prefix intentionally unused parameters/variables with `_` (oxlint enforces this):
```ts
function foo(_unused: string, used: number) { ... }
```

### Import sorting
Import declarations are sorted by `oxfmt` (`sortImports: true`), and import members should remain alphabetically sorted for consistency.

### TypeScript strictness
All strict flags are enabled (`strict`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, etc.). Always handle potentially-undefined index access results.

### Package naming
Public packages are scoped as `@nn-lang/<name>` (e.g., `@nn-lang/nn-language`). The test and tree-sitter packages are private and unscoped.
