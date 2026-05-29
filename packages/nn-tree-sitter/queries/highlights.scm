(declaration_statement
  name: (ident) @function)

(import_statement
  "import" @keyword
  "from" @keyword
  target: (string) @string)

(expression_call
  callee: (ident) @function.call)

(ident) @variable

(type
  (ident) @type)

(size_number) @number
(size_ident
  (ident) @variable.parameter)

(argument_declaration
  (ident) @variable.parameter)

(string) @string
(single_quoted_string) @string
(double_quoted_string) @string

(number) @number
(comment) @comment

"import" @keyword
"from" @keyword

"=" @operator
"|>" @operator
":" @operator
"+" @operator
"-" @operator
"*" @operator
"/" @operator
"^" @operator

"[" @punctuation.bracket
"]" @punctuation.bracket
"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"," @punctuation.delimiter
