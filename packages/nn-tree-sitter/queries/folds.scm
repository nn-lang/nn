(source_file
  (declaration_statement) @fold)

(source_file
  (import_statement) @fold)

(declaration_statement
  argument_declaration_list: (argument_declaration_list) @fold)

(declaration_statement
  expressions: (_) @fold)
