; Indent after pipe operator
(declaration_statement
  "|>" @indent)

; Indent inside brackets
[
  "["
  "("
  "{"
] @indent

[
  "]"
  ")"
  "}"
] @outdent
