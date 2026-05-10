(declaration_statement
  name: (ident) @local.definition.function)

(argument_declaration
  (ident) @local.definition.parameter)

(size_declaration_list
  item_first: (ident) @local.definition.parameter)

(size_declaration_list
  item_remain: (ident) @local.definition.parameter)

(expression_ident
  (ident) @local.reference)

(size_ident
  (ident) @local.reference)
