/// <reference types="tree-sitter-cli/dsl" />

function seperated_list(item, seperator, prefix, postfix, allow_empty) {
  return seq(
    ...(prefix ? [prefix] : []),
    allow_empty
      ? field("item_first", optional(item))
      : field("item_first", item),
    repeat(seq(seperator, field("item_remain", item))),
    optional(seperator),
    ...(postfix ? [postfix] : [])
  );
}

module.exports = grammar({
  name: "nn",
  rules: {
    source_file: ($) =>
      repeat(choice($.declaration_statement, $.import_statement)),

    declaration_statement: ($) =>
      seq(
        field("comment_leading", repeat($.comment)),
        field("name", $.ident),
        field("size_declaration_list", optional($.size_declaration_list)),
        field("argument_declaration_list", $.argument_declaration_list),
        optional(seq(":", field("return_type", $.type))),
        optional(
          field(
            "expressions",
            seq(
              "=",
              field("comment_trailing", repeat($.comment)),
              field("first_pipe", optional("|>")),
              field("expression_first", $.expression),
              repeat(seq("|>", field("expression_remain", $.expression)))
            )
          )
        )
      ),
    import_statement: ($) =>
      seq(
        "import",
        seperated_list($.ident, ",", "{", "}", true),
        "from",
        field("target", $.string),
      ),

    size_declaration_list: ($) => seperated_list($.ident, ",", "[", "]"),
    argument_declaration: ($) => seq($.ident, ":", $.type),
    argument_declaration_list: ($) =>
      seperated_list($.argument_declaration, ",", "(", ")"),
    argument_list: ($) =>
      seperated_list($.expression_plain, ",", "(", ")", true),

    expression: ($) =>
      choice(
        $.expression_call,
        $.expression_tuple,
        $.expression_assign,
        $.expression_ident,
        $.expression_string
      ),
    expression_plain: ($) =>
      choice($.expression_call, $.expression_ident, $.expression_string),
    expression_call: ($) =>
      prec(
        20,
        seq(
          field("callee", $.ident),
          field("sizes", optional($.size_type)),
          field("arguments", $.argument_list)
        )
      ),
    expression_tuple: ($) =>
      prec(10, seq($.expression_plain, repeat1(seq(",", $.expression_plain)))),
    expression_assign: ($) =>
      prec.right(5, seq($.ident, "=", $.expression_plain)),
    expression_ident: ($) => prec(0, $.ident),
    expression_string: ($) => $.string,

    size_type: ($) => seperated_list($.size, ",", "[", "]"),
    size: ($) =>
      choice(
        $.size_pow,
        $.size_mul,
        $.size_div,
        $.size_add,
        $.size_sub,
        $.size_paren,
        $.size_ident,
        $.size_number
      ),
    size_operation: ($) =>
      choice($.size_pow, $.size_mul, $.size_div, $.size_add, $.size_sub),
    size_pow: ($) => prec.left(20, seq($.size, "^", $.size)),
    size_mul: ($) => prec.left(10, seq($.size, "*", $.size)),
    size_div: ($) => prec.left(10, seq($.size, "/", $.size)),
    size_add: ($) => prec.left(0, seq($.size, "+", $.size)),
    size_sub: ($) => prec.left(0, seq($.size, "-", $.size)),
    size_paren: ($) => seq("(", $.size_operation, ")"),
    size_ident: ($) => $.ident,
    size_number: ($) => $.number,

    type: ($) => seq($.ident, optional($.size_type)),
    ident: () => token(/[a-zA-Z_$][\w_]*/),

    string: ($) => choice($.single_quoted_string, $.double_quoted_string),
    single_quoted_string: () => /'[^']*'/,
    double_quoted_string: () => /"[^"]*"/,

    number: () => /-?\d+(\.\d+)?/,
    comment: () => token(/#.*\n/),
  },
  extras: ($) => [$.comment, /[\s\uFEFF\u2060\u200B\u00A0]/],
});
