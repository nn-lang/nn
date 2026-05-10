; Declarations
(declaration_statement
  name: (ident) @function)

; Import statements
(import_statement
  "import" @keyword
  "from" @keyword
  target: (string) @string)

; Identifiers
(ident) @variable

; Types
(type
  (ident) @type)

; Size expressions
(size_number) @number
(size_ident (ident) @variable.parameter)

; Strings
(string) @string
(single_quoted_string) @string
(double_quoted_string) @string

; Numbers
(number) @number

; Comments
(comment) @comment

; Operators
"=" @operator
"|>" @operator
":" @operator
"+" @operator
"-" @operator
"*" @operator
"/" @operator
"^" @operator

; Punctuation
"[" @punctuation.bracket
"]" @punctuation.bracket
"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket
"," @punctuation.delimiter
