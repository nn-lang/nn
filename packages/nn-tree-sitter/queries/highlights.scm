(comment) @comment

(single_quoted_string) @string
(double_quoted_string) @string
(number) @number

"import" @keyword
"from" @keyword

"=" @operator
"|>" @operator
"+" @operator
"-" @operator
"*" @operator
"/" @operator
"^" @operator

(declaration_statement
  name: (ident) @function)

(expression_call
  callee: (ident) @function.call)

(argument_declaration
  (ident) @variable.parameter)

(size_ident
  (ident) @variable.parameter)
