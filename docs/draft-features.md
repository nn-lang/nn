# nn Draft & Unspecified Features

Status: Non-normative.

This document records language constructs and behaviors that are **not** part of
[`specification.md`](./specification.md). They fall into three groups:

- **In progress** — syntax that appears in examples but is not yet accepted by
  the implementation (it currently produces parse errors).
- **Under-specified** — constructs the implementation accepts but whose meaning
  is not fully defined.
- **Ambiguous lexical/semantic points** — details that need a decision before
  they can be made normative.

A conforming implementation MUST NOT require any feature listed here. These
items are expected to change.

## 1. In-progress syntax (not yet accepted)

The following constructs are used in design sketches (notably the Transformer
example) but are rejected as syntax errors by the current parser. They are
candidates for future standardization.

### 1.1 Pipeline argument placeholders: `$` and `$N`

Intended to reference the value(s) flowing through the pipeline explicitly, so a
piped value can be placed at a position other than the leading argument, or used
more than once. Example sketch:

```nn
|> MultiHeadAttention[Hidden, Heads]($, $, $)
|> LayerNorm($0)
```

Open questions: meaning of bare `$` vs indexed `$0`/`$1`; interaction with the
implicit leading-argument threading defined in the spec (§6.5).

### 1.2 Per-element application: `.each`

Intended to apply a flow across a collection/axis. Example sketch:

```nn
|> Linear.each[Input]()
|> Reshape.each[Heads, Seq / Heads, Output]
```

Open questions: what `.each` ranges over; resulting shape; whether the trailing
call parentheses are optional.

### 1.3 Repetition operator: `@`

Intended to apply a flow a number of times given by a size. Example sketch:

```nn
|> EncoderLayer@Layers[Filter, Heads]()
|> DecoderLayer@Layers[Filter, Heads]()
```

Open questions: evaluation order; how the repeated stage threads values;
relationship between the repetition count and size variables.

### 1.4 Scalar expressions and scalar function calls in bodies

Sketches use scalar-valued arithmetic and functions inside a body:

```nn
MatMul(q, Transpose[Heads, Input, Seq](k)) / sqrt(Input)
```

This requires (a) a scalar/number type distinct from `Tensor`, (b) arithmetic
operators on expressions (not only on sizes), and (c) built-in scalar functions
such as `sqrt`. None of these exist in the current type system, which has only
the tensor type.

## 2. Under-specified behavior

### 2.1 Return-type annotation vs inferred body type

A declaration MAY carry both an explicit return type and a body:

```nn
Linear[input, output](x: Tensor[input]): Tensor[output] =
  |> Gemm(...)
```

For a declaration with a body, the implementation currently uses the **inferred
type of the final expression** as the flow's output type and does not verify it
against the explicit annotation. Whether the annotation should be (a) checked
for equality with the inferred type, (b) used to coerce/constrain it, or
(c) treated purely as documentation, is undecided. The spec therefore leaves
this relationship undefined (§6.4).

### 2.2 Empty tensor shape (`Tensor`)

A type may be written as bare `Tensor` with no shape. Its precise meaning —
unknown rank, rank zero, or "any shape" — is not defined. Shape-matching rules
against a shapeless tensor are not specified.

### 2.3 Duplicate top-level names

The spec requires top-level flow names to be unique within a module. The exact
diagnostic and recovery behavior when a name is duplicated is left to the
implementation and is not standardized here.

## 3. Ambiguous lexical points

### 3.1 Numeric size literals

The number grammar admits a sign and a fractional part
(`/-?[0-9]+(\.[0-9]+)?/`), but sizes are conceptually non-negative integers and
the implementation interprets size literals as integers. The status of negative
and fractional size literals is undecided; conforming programs should use
non-negative integers.

### 3.2 String literal quoting and escapes

Single- and double-quoted strings are both accepted and currently treated
identically. Whether the two forms should differ (for example, in escape
processing) and the exact set of recognized escape sequences are not finalized.
String literals presently appear only as parameter-name metadata and as import
targets.

### 3.3 The `$` character in identifiers

`$` is a legal identifier character (`/[A-Za-z_$][A-Za-z0-9_]*/`). This overlaps
visually with the proposed pipeline placeholder syntax (§1.1). The interaction
between `$`-containing identifiers and placeholder syntax must be resolved
before placeholders are standardized.
