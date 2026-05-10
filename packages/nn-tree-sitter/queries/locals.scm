; Scope definitions
(source_file) @local.scope

; Declaration introduces a new scope
(declaration_statement) @local.scope

; Size parameter declarations are definitions
(size_declaration_list
  (ident) @local.definition)

; Argument declarations are definitions
(argument_declaration
  (ident) @local.definition)

; References
(size_ident
  (ident) @local.reference)

(expression_ident
  (ident) @local.reference)

(expression_call
  callee: (ident) @local.reference)
