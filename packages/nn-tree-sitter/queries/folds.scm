; Fold entire declarations
(declaration_statement
  "=" @fold.start
  (#set! fold.end "@end"))

; Fold import groups
(import_statement) @fold
