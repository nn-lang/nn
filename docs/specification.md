# The nn Language Specification

Status: Draft, descriptive of the current implementation.

This document specifies the `nn` language: a domain-specific language for
describing deep neural network models in terms of named *flows* whose tensor
shapes are checked at compile time.

## 1. Scope

This specification defines the **language core**:

- lexical structure,
- module (source file) structure and imports,
- declarations,
- expressions and the pipeline operator,
- the type system,
- the size system, and
- the static checks a conforming implementation performs.

Tooling behavior — command-line interfaces, code generation, parameter/cost
analysis, and editor integration — is **out of scope** for this document.

Features that are recognized by the grammar but not yet fully defined, as well
as ambiguous or under-specified points, are recorded separately in
[`draft-features.md`](./draft-features.md) and are **not** part of this
specification.

## 2. Conformance

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in RFC 2119.

A **conforming program** is a sequence of source files that satisfies every
"MUST"/"SHALL" requirement in this specification.

A **conforming implementation**:

- MUST accept every conforming program.
- MUST reject every program that violates a "MUST"/"SHALL" requirement, and
  SHOULD report the violation as a diagnostic referring to the offending
  source location.
- MUST NOT require any construct listed in `draft-features.md`.

A diagnostic is a non-fatal report; an implementation MAY report more than one
diagnostic for a single program and SHOULD continue checking after a
recoverable error where practical.

## 3. Notation

Grammar is given in an EBNF-like form:

- `"x"` denotes the literal text `x`.
- `a b` denotes `a` followed by `b`.
- `a | b` denotes a choice.
- `a?` denotes zero or one `a`.
- `a*` denotes zero or more `a`.
- `a+` denotes one or more `a`.
- `( … )` groups.

Lexical patterns are given as regular expressions where convenient.

## 4. Lexical Structure

### 4.1 Source text

A source file is a sequence of Unicode characters. Tokens are separated by
*whitespace* and *comments*, which are insignificant except as token
separators. Whitespace consists of spaces, tabs, line breaks, and the
characters U+FEFF, U+2060, U+200B, and U+00A0.

### 4.2 Comments

```
comment ::= "#" /[^\n]*/
```

A comment begins with `#` and extends to the end of the line. Comments MAY
appear anywhere whitespace is allowed. Comments that immediately precede a
declaration are *leading comments* of that declaration; a conforming
implementation MAY associate them with the declaration for documentation
purposes, but they carry no semantic meaning.

### 4.3 Identifiers

```
identifier ::= /[A-Za-z_$][A-Za-z0-9_]*/
```

An identifier MUST begin with an ASCII letter, `_`, or `$`, followed by ASCII
letters, digits, or `_`. Identifiers are case-sensitive.

Identifiers are used for flow names, size names, value names, and the tensor
type name `Tensor`. The language has no general keyword set; `Tensor` and the
built-in flow name `Trainable` (§9.3) are the only reserved meanings, and they
are recognized contextually.

### 4.4 Numbers

```
number ::= /-?[0-9]+(\.[0-9]+)?/
```

Numeric literals appear only as size literals (§8). A conforming program
SHOULD use non-negative integer size literals; the handling of negative and
fractional size literals is unspecified (see `draft-features.md`).

### 4.5 String literals

```
string ::= "'" /([^'\\]|\\.)*/ "'"
         | "\"" /([^"\\]|\\.)*/ "\""
```

A string literal is delimited by matching single (`'`) or double (`"`) quotes.
A backslash introduces an escape sequence. String literals appear only as
call arguments (§6.5) and as the import target (§5.3).

## 5. Modules

### 5.1 Source files

```
source_file ::= ( import_statement | declaration )*
```

A source file is a sequence of import statements and declarations in any
order. Each source file is a module identified by its location.

### 5.2 Top-level names

The top-level names of a module are the names of its declarations (§6) together
with the names introduced by its imports (§5.3). Within a single module, every
top-level flow name MUST be unique.

### 5.3 Imports

```
import_statement ::= "import" "{" ident_list? "}" "from" string
ident_list       ::= identifier ( "," identifier )* ","?
```

An import statement makes selected top-level flow names of another module
available in the importing module under the same names. The string is the
*import target* and MUST be a path reference resolved relative to the importing
module's location.

The following rules apply:

- The target MUST resolve to an existing module. If it does not, the program
  is invalid.
- Each imported name MUST be a top-level flow name of the target module. An
  imported name that the target module does not provide is invalid.
- An imported name is usable wherever a flow name is expected (§6.6) and refers
  to the same flow as in the target module.

The import list MAY be empty, in which case the statement only requires the
target module to exist.

## 6. Declarations

### 6.1 Grammar

```
declaration            ::= identifier size_decl_list? argument_list
                           ( ":" type )? body?
size_decl_list         ::= "[" ident_list "]"
argument_list          ::= "(" argument_decl_list? ")"
argument_decl_list     ::= argument_decl ( "," argument_decl )* ","?
argument_decl          ::= identifier ":" type
body                   ::= "=" "|>"? expression ( "|>" expression )*
```

A declaration defines a *flow*: a named transformation from input tensors to an
output tensor.

### 6.2 Size declaration list

The optional `[ … ]` list following the flow name declares *size variables*
(§8.3) that are in scope throughout the declaration. Declared size names MUST be
distinct within a single declaration.

### 6.3 Argument list

The argument list declares the flow's input *values*. Each argument binds a
value name to a tensor type. Argument value names MUST be distinct within a
declaration.

Size names that appear in an argument type but are not in the size declaration
list are **implicitly declared** as size variables of the flow upon their first
appearance (§8.3).

### 6.4 Return type

The optional `: type` annotates the flow's output type.

- For a declaration with no body (§6.7), the return type is REQUIRED and
  defines the flow's output type.
- For a declaration with a body, the output type is the type of the body's
  final expression (§6.6); the relationship between an explicit return-type
  annotation and the inferred body type is not defined by this specification
  (see `draft-features.md`).

Every size name appearing in the return type MUST already be in scope (§8.3);
the return type MUST NOT introduce new size variables.

### 6.5 Body and the pipeline

A body is an `=` followed by one or more expressions separated by `|>` (the
*pipeline operator*), with an OPTIONAL leading `|>`.

The pipeline threads values from one stage to the next:

- The result of each stage is supplied as the **leading argument(s)** of the
  next stage's call, prepended before that call's explicit arguments.
- A stage that is a tuple expression (§7.2) yields multiple values, which become
  multiple leading arguments of the following stage in order.
- Every stage after the first MUST be a call expression (§7.1).
- The first stage MUST be a call expression if the body begins with a leading
  `|>`. Otherwise the first stage MAY be any expression and its value is the
  starting value of the pipeline.

The output type of the flow is the type of the final stage.

### 6.6 Name scoping within a body

Within a body the following names are in scope:

- the flow's size variables (§6.2, §6.3),
- the flow's argument value names, and
- value names introduced by assignment expressions (§7.3).

A value name MUST be defined before the point at which it is used; use of a
value before its definition is invalid. Use of an undeclared value name, size
name, or flow name is invalid.

### 6.7 Signature-only declarations

A declaration MAY omit the body. Such a declaration is a *signature-only* flow:
it declares the flow's size variables, argument types, and return type without
defining its computation. A signature-only declaration MUST provide a return
type (§6.4). Signature-only declarations are used to describe externally
provided operators.

## 7. Expressions

```
expression ::= call_expression
             | tuple_expression
             | assignment_expression
             | identifier_expression
             | string_expression
```

### 7.1 Call expressions

```
call_expression ::= identifier size_type? argument_list_call
argument_list_call ::= "(" ( expression ( "," expression )* ","? )? ")"
size_type          ::= "[" size ( "," size )* ","? "]"
```

A call expression applies a flow named by the identifier. The optional
`[ … ]` supplies *size arguments* (§8); the parenthesized list supplies value
arguments. Both lists MAY be empty.

Applying a call requires (§9):

- the callee MUST be an in-scope flow name (a local declaration, an imported
  name, or a built-in §9.3),
- the number of value arguments MUST equal the callee's argument count, and
- when size arguments are supplied, their count MUST equal the callee's
  declared size-variable count.

### 7.2 Tuple expressions

```
tuple_expression ::= plain_expression ( "," plain_expression )+
```

A tuple expression groups two or more values. Tuples are used to supply
multiple values into a pipeline stage (§6.5). A `plain_expression` is a call,
identifier, or string expression.

### 7.3 Assignment expressions

```
assignment_expression ::= identifier "=" plain_expression
```

An assignment binds a value name to the value of its right-hand expression and
makes that name available to subsequent expressions in the body (§6.6). The
bound name MUST NOT be referenced within its own right-hand expression.

### 7.4 Identifier expressions

An identifier used as an expression refers to an in-scope value (§6.6) and
evaluates to that value's type.

### 7.5 String expressions

A string literal used as a call argument is *metadata* (for example, a
parameter name). String arguments are not tensor operands: they do not
participate in shape checking and are not counted among a callee's value
arguments for arity purposes (§9.1).

## 8. Size System

### 8.1 Sizes

```
size      ::= size "^" size
            | size "*" size
            | size "/" size
            | size "+" size
            | size "-" size
            | "(" size ")"
            | identifier
            | number
```

A *size* is a symbolic non-negative integer expression describing one dimension
of a tensor shape. A size is built from size variables (§8.3), integer
literals, and the arithmetic operators below.

### 8.2 Operators and precedence

The size operators, from highest to lowest binding, are:

1. `^` (exponentiation),
2. `*` and `/` (multiplication, division),
3. `+` and `-` (addition, subtraction).

`*`, `/`, `+`, and `-` are left-associative; `^` is left-associative.
Parentheses override precedence. Two sizes are equal when they denote the same
value under ordinary integer arithmetic (for example, `A * 2` and `2 * A` are
equal, and `A + B` equals `B + A`).

### 8.3 Size variables and scope

Size variables are introduced:

- by a size declaration list (§6.2), or
- by their first appearance in an argument type (§6.3).

Size variables are scoped to the declaration that introduces them. A size name
used in a return type or in a body MUST already be in scope; such positions
MUST NOT introduce new size variables.

### 8.4 Size arguments and inference

A flow's size variables are determined at each call site by:

- explicit size arguments in `[ … ]` (§7.1), and/or
- inference from the shapes of the value arguments (§9.2).

After a call is resolved, every size variable of the callee MUST be determined.
A size variable that cannot be determined is *ambiguous* and makes the call
invalid.

## 9. Type System and Checking

### 9.1 Types

The only type is the tensor type:

```
type ::= "Tensor" size_type?
```

A tensor type has a *shape*: an ordered list of sizes (§8). The shape MAY be
empty (`Tensor`), denoting a tensor of unspecified rank/shape for the purpose of
this specification. There is no scalar or non-tensor type.

Two tensor types are equal when their shapes have the same length and
corresponding sizes are equal (§8.2).

### 9.2 Argument matching and shape propagation

When checking a call, each value argument's type is matched against the
corresponding declared argument type of the callee:

- For the **first** value argument (including a value threaded in by the
  pipeline), the argument's shape MAY have additional **leading** dimensions
  beyond those required by the callee. The required trailing dimensions MUST
  match the callee's declared shape, and the extra leading dimensions are
  carried through and prepended to the call's result shape.
- For every **subsequent** value argument, the shape length MUST equal the
  callee's declared argument shape length, and corresponding sizes MUST match.

Through this matching, the callee's size variables are bound to concrete sizes
derived from the argument shapes; these bindings, together with any explicit
size arguments, MUST be mutually consistent. An inconsistent binding (the same
size variable forced to two unequal values) makes the call invalid.

The result type of a call is the callee's return type with its size variables
replaced by their bound sizes, with any carried leading dimensions prepended.

### 9.3 The `Trainable` built-in

`Trainable` is a built-in flow available in every module without import. A call
`Trainable[s1, …, sn]('name')` has type `Tensor[s1, …, sn]`: its size arguments
are its shape, and its string argument names the trainable parameter. A
conforming program MUST NOT redeclare `Trainable` as a meaning other than this
built-in.

### 9.4 Flow call graph

The flow-call relation MUST be acyclic:

- A flow MUST NOT call itself directly (self-recursion is invalid).
- A set of flows MUST NOT form a cycle of calls (mutual recursion is invalid).

### 9.5 Conditions a conforming implementation MUST reject

A conforming implementation MUST reject a program in which any of the following
occurs:

1. A syntax error (an unexpected or unrecognized token).
2. Two top-level flows in one module share a name (§5.2).
3. An import target that does not resolve to an existing module (§5.3).
4. An imported name that the target module does not provide (§5.3).
5. Use of an undeclared flow name, value name, or size name (§6.6, §8.3).
6. Use of a value before it is defined (§6.6).
7. A pipeline stage after the first that is not a call expression, or a
   leading-`|>` body whose first stage is not a call (§6.5).
8. A call whose value-argument count differs from the callee's (§7.1, §9.1).
9. A call whose explicit size-argument count differs from the callee's, when
   size arguments are supplied (§7.1).
10. A shape mismatch between an argument and the callee's declared argument
    type (§9.2).
11. An inconsistent size-variable binding (§9.2).
12. An ambiguous (undetermined) callee size variable (§8.4).
13. Direct or mutual recursion in the flow-call graph (§9.4).

## 10. Examples

The following conforming examples illustrate the language. They are
non-normative.

Identity flow with inferred size variables from the argument type:

```nn
Bypass(x: Tensor[a, b, c]) =
  x
```

A flow that uses a built-in and an imported operator:

```nn
import { Gemm } from "./onnx.nn"

Linear[input, output](x: Tensor[input]): Tensor[output] =
  |> Gemm(Trainable[input, output]('weight'), Trainable[output]('bias'))
```

Signature-only operator declarations:

```nn
Gemm(a: Tensor[K], b: Tensor[K, N], c: Tensor[N]): Tensor[N]
Concat(x: Tensor[Cx, H, W], y: Tensor[Cy, H, W]): Tensor[Cx + Cy, H, W]
```

Size arithmetic in shapes:

```nn
Upsample[sH, sW](x: Tensor[H, W]): Tensor[H * sH, W * sW]
```
