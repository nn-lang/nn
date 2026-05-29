(source_file) @local.scope

(declaration_statement) @local.scope

(declaration_statement
  name: (ident) @local.definition.function)

(size_declaration_list
  item_first: (ident) @local.definition.parameter)

(size_declaration_list
  item_remain: (ident) @local.definition.parameter)

(argument_declaration
  (ident) @local.definition.parameter)

(size_ident
  (ident) @local.reference)

(expression_ident
  (ident) @local.reference)

(expression_call
  callee: (ident) @local.reference)
