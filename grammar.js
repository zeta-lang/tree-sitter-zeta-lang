/**
 * @file Zeta grammar for tree-sitter
 * @author Wildered
 * @license MIT
 */

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
const PREC = {
  ASSIGN: 1,
  RANGE: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  BIT_OR: 5,
  BIT_XOR: 6,
  BIT_AND: 7,
  EQUALITY: 8,
  COMPARISON: 9,
  SHIFT: 10,
  ADDITIVE: 11,
  MULTIPLICATIVE: 12,
  CAST: 13,
  UNARY: 14,
  CALL: 15,
  FIELD: 16,
};

module.exports = grammar({
  name: "zeta",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  word: ($) => $.identifier,

  externals: ($) => [$.block_comment, $.generic_open, $.generic_close],

  conflicts: ($) => [
    [$.named_type],
    [$.this_type, $.provenance_annotation],
    [$.named_type, $.provenance_annotation],
    [$.dyn_type],
    [$.generic_parameter],
    [$._type],
    [$.function_type],
  ],

  inline: ($) => [$._visibility_keyword],

  rules: {
    source_file: ($) => repeat($._top_level_item),

    // ---------------------------------------------------------------
    // Top level / statements
    // ---------------------------------------------------------------

    _top_level_item: ($) => choice($._statement),

    _statement: ($) =>
      choice(
        $.let_statement,
        $.static_statement,
        $.import_statement,
        $.package_statement,
        $.module_declaration,
        $.struct_declaration,
        $.enum_declaration,
        $.impl_declaration,
        $.interface_declaration,
        $.function_declaration,
        $.const_statement,
        $.while_statement,
        $.for_statement,
        $.match_statement,
        $.defer_statement,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.panic_statement,
        $.expression_statement,
      ),

    _visibility_keyword: ($) =>
      choice("public", "private", "module", "internal"),

    visibility: ($) => $._visibility_keyword,

    import_statement: ($) => seq("import", field("path", $.path), ";"),

    package_statement: ($) => seq("package", field("path", $.path), ";"),

    path: ($) =>
      seq(
        field("segment", $.identifier),
        repeat(seq("::", field("segment", $.identifier))),
        optional(seq(".", field("member", $.identifier))),
      ),

    module_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "module",
        field("name", $.identifier),
        field("body", $.block),
      ),

    // ---------------------------------------------------------------
    // struct / enum / impl / interface
    // ---------------------------------------------------------------

    struct_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "struct",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        choice(
          ";",
          seq(field("fields", $.tuple_struct_fields), ";"),
          field("body", $.struct_body),
        ),
      ),

    struct_body: ($) => seq("{", repeat($.field_declaration), "}"),

    field_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        optional(","),
      ),

    tuple_struct_fields: ($) =>
      seq(
        "(",
        optional(
          seq(
            $.tuple_field,
            repeat(seq(",", $.tuple_field)),
            optional(","),
          ),
        ),
        ")",
      ),

    tuple_field: ($) =>
      seq(optional(field("visibility", $.visibility)), field("type", $._type)),

    enum_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "enum",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        "{",
        optional(
          seq(
            $.enum_variant,
            repeat(seq(",", $.enum_variant)),
            optional(","),
          ),
        ),
        "}",
      ),

    enum_variant: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          seq(
            "{",
            optional(
              seq(
                $.field_declaration_no_trailing,
                repeat(seq(",", $.field_declaration_no_trailing)),
                optional(","),
              ),
            ),
            "}",
          ),
        ),
      ),

    field_declaration_no_trailing: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        field("name", $.identifier),
        ":",
        field("type", $._type),
      ),

    impl_declaration: ($) =>
      seq(
        "impl",
        optional(field("generics", $.generic_parameters)),
        field("target", $._type),
        optional(seq("by", field("interface", $._type))),
        field("body", $.impl_body),
      ),

    impl_body: ($) =>
      seq("{", repeat(choice($.const_statement, $.function_declaration)), "}"),

    interface_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        optional("sealed"),
        "interface",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        optional(field("permits", $.permits_clause)),
        "{",
        repeat($.interface_method),
        "}",
      ),

    permits_clause: ($) =>
      seq("permits", $._type, repeat(seq(",", $._type))),

    interface_method: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        field("signature", $.function_signature),
        choice(";", field("body", $.block)),
      ),

    const_statement: ($) =>
      seq(
        "const",
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        "=",
        field("value", $._expression),
        ";",
      ),

    // ---------------------------------------------------------------
    // functions
    // ---------------------------------------------------------------

    function_modifiers: ($) =>
      repeat1(
        choice(
          "inline",
          "noinline",
          "unsafe",
          seq("extern", "(", field("abi", $.string_literal), ")"),
        ),
      ),

    function_signature: ($) =>
      seq(
        optional(field("modifiers", $.function_modifiers)),
        "func",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        field("parameters", $.parameters),
        optional(seq(":", field("return_type", $._type))),
      ),

    function_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        field("signature", $.function_signature),
        choice(";", field("body", $.block)),
      ),

    generic_parameters: ($) =>
      seq(
        "<",
        $.generic_parameter,
        repeat(seq(",", $.generic_parameter)),
        ">",
      ),

    generic_parameter: ($) =>
      seq(
        optional(choice("const", "static")),
        field("name", $.identifier),
        optional(seq(":", $._type, repeat(seq(choice("+", ","), $._type)))),
      ),

    parameters: ($) =>
      seq(
        "(",
        optional(seq($._parameter, repeat(seq(",", $._parameter)))),
        optional(","),
        ")",
      ),

    _parameter: ($) => choice($.this_parameter, $.normal_parameter),

    this_parameter: ($) =>
      seq(
        optional(
          choice(
            seq("&", optional("mut")),
            "mut",
          ),
        ),
        "this",
      ),

    normal_parameter: ($) =>
      seq(
        optional("mut"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        optional(seq("=", field("default", $._expression))),
      ),

    // ---------------------------------------------------------------
    // let / static / control flow
    // ---------------------------------------------------------------

    let_statement: ($) =>
      seq(
        "let",
        optional("mut"),
        field("name", $.identifier),
        choice(
          seq(":", field("type", $._type), "=", field("value", $._expression)),
          seq(":=", field("value", $._expression)),
        ),
        optional(field("catch", $.catch_clause)),
        optional(field("else", $.else_unwrap_clause)),
        ";",
      ),

    static_statement: ($) =>
      seq(
        "static",
        "let",
        optional("mut"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        "=",
        field("value", $._expression),
        ";",
      ),

    catch_clause: ($) => seq("catch", choice($.catch_single, $.catch_multiple)),

    catch_single: ($) =>
      seq(
        "(",
        field("error_type", $._type),
        optional(field("binding", $.identifier)),
        ")",
        "=>",
        field("body", $.block),
      ),

    catch_multiple: ($) =>
      seq(
        "{",
        optional(
          seq(
            $.catch_branch,
            repeat(seq(",", $.catch_branch)),
            optional(","),
          ),
        ),
        "}",
      ),

    catch_branch: ($) =>
      seq(
        field("error_type", $._type),
        optional(field("binding", $.identifier)),
        "=>",
        field("body", $.block),
      ),

    else_unwrap_clause: ($) => seq("?", "else", field("body", $.block)),

    while_statement: ($) =>
      seq(
        "while",
        "(",
        field("condition", $._expression),
        ")",
        field("body", $.block),
      ),

    for_statement: ($) =>
      seq(
        "for",
        "(",
        choice(field("init", $.let_statement), ";"),
        optional(field("condition", $._expression)),
        ";",
        optional(field("update", $._expression)),
        ")",
        field("body", $.block),
      ),

    return_statement: ($) =>
      seq("return", optional(field("value", $._expression)), ";"),

    break_statement: ($) =>
      seq("break", optional(field("value", $._expression)), ";"),

    continue_statement: ($) => seq("continue", ";"),

    panic_statement: ($) =>
      seq("panic", field("message", $._expression), ";"),

    defer_statement: ($) =>
      seq("defer", field("action", choice($.block, $.expression_statement))),

    match_statement: ($) =>
      seq(
        "match",
        field("subject", $._expression_no_struct),
        "{",
        repeat($.match_arm),
        "}",
      ),

    match_arm: ($) =>
      seq(
        "case",
        field("pattern", $._pattern),
        optional(seq("if", field("guard", $._expression))),
        "->",
        field("body", choice($.block, $.expression_statement)),
        optional(","),
      ),

    _pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.number_literal,
        $.string_literal,
        $.boolean_literal,
        $.enum_variant_pattern,
        $.identifier_pattern,
        $.tuple_pattern,
        $.array_pattern,
      ),

    wildcard_pattern: (_$) => "_",
    identifier_pattern: ($) => $.identifier,
    enum_variant_pattern: ($) =>
      seq(
        field("name", $.identifier),
        "(",
        optional(seq($._pattern, repeat(seq(",", $._pattern)))),
        ")",
      ),
    tuple_pattern: ($) =>
      seq("(", optional(seq($._pattern, repeat(seq(",", $._pattern)))), ")"),
    array_pattern: ($) =>
      seq("[", optional(seq($._pattern, repeat(seq(",", $._pattern)))), "]"),

    expression_statement: ($) => seq($._expression, ";"),

    block: ($) => seq("{", repeat($._statement), "}"),

    // ---------------------------------------------------------------
    // expressions
    // ---------------------------------------------------------------

    _expression: ($) =>
      choice(
        $.identifier,
        $.module_path,
        $.this_expression,
        $.number_literal,
        $.decimal_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.null_literal,
        $.undefined_literal,
        $.array_literal,
        $.parenthesized_expression,
        $.unary_expression,
        $.reference_expression,
        $.dereference_expression,
        $._binary_expression,
        $.assignment_expression,
        $.cast_expression,
        $.call_expression,
        $.field_access_expression,
        $.module_access_expression,
        $.array_index_expression,
        $.struct_init_expression,
        $.if_expression,
        $.lambda_expression,
        $.intrinsic_expression,
      ),

    _expression_no_struct: ($) =>
      choice(
        $.identifier,
        $.module_path,
        $.this_expression,
        $.number_literal,
        $.decimal_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.null_literal,
        $.undefined_literal,
        $.array_literal,
        $.parenthesized_expression,
        $.unary_expression_ns,
        $.reference_expression_ns,
        $.dereference_expression_ns,
        $._binary_expression_ns,
        $.assignment_expression_ns,
        $.cast_expression_ns,
        $.call_expression_ns,
        $.field_access_expression_ns,
        $.module_access_expression,
        $.array_index_expression_ns,
        $.if_expression,
        $.lambda_expression,
        $.intrinsic_expression,
      ),

    unary_expression_ns: ($) =>
      prec(
        PREC.UNARY,
        seq(
          field("operator", choice("-", "!", "~")),
          field("operand", $._expression_no_struct),
        ),
      ),

    reference_expression_ns: ($) =>
      prec(
        PREC.UNARY,
        seq("&", optional("mut"), field("value", $._expression_no_struct)),
      ),

    dereference_expression_ns: ($) =>
      prec(PREC.UNARY, seq("*", field("value", $._expression_no_struct))),

    _binary_expression_ns: ($) =>
      choice($.binary_expression_ns, $.comparison_expression_ns),

    binary_expression_ns: ($) => {
      const table = [
        [PREC.LOGICAL_OR, "||"],
        [PREC.LOGICAL_AND, "&&"],
        [PREC.BIT_OR, "|"],
        [PREC.BIT_XOR, "^"],
        [PREC.BIT_AND, "&"],
        [PREC.SHIFT, choice("<<", ">>")],
        [PREC.ADDITIVE, choice("+", "-")],
        [PREC.MULTIPLICATIVE, choice("*", "/", "%")],
        [PREC.RANGE, choice("..", "..<")],
      ];

      return choice(
        ...table.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(
              field("left", $._expression_no_struct),
              field("operator", operator),
              field("right", $._expression_no_struct),
            ),
          ),
        ),
      );
    },

    comparison_expression_ns: ($) =>
      choice(
        prec.left(
          PREC.EQUALITY,
          seq(
            field("left", $._expression_no_struct),
            field("operator", choice("==", "!=")),
            field("right", $._expression_no_struct),
          ),
        ),
        prec.left(
          PREC.COMPARISON,
          seq(
            field("left", $._expression_no_struct),
            field("operator", choice("<", "<=", ">", ">=")),
            field("right", $._expression_no_struct),
          ),
        ),
      ),

    assignment_expression_ns: ($) =>
      prec.right(
        PREC.ASSIGN,
        seq(
          field("left", $._expression_no_struct),
          field(
            "operator",
            choice("=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "|=", "^="),
          ),
          field("right", $._expression_no_struct),
        ),
      ),

    cast_expression_ns: ($) =>
      prec.left(
        PREC.CAST,
        seq(field("value", $._expression_no_struct), "as", field("type", $._type)),
      ),

    call_expression_ns: ($) =>
      prec(
        PREC.CALL,
        choice(
          seq(field("function", $._expression_no_struct), field("arguments", $.arguments)),
          seq($.generic_callee_ns, field("arguments", $.arguments)),
        ),
      ),

    generic_callee_ns: ($) =>
      prec(
        PREC.CALL,
        seq(
          field("function", $._expression_no_struct),
          field("type_arguments", $.generic_arguments),
        ),
      ),

    field_access_expression_ns: ($) =>
      prec(
        PREC.FIELD,
        seq(
          field("object", $._expression_no_struct),
          ".",
          field("field", $.identifier),
        ),
      ),

    array_index_expression_ns: ($) =>
      prec(
        PREC.CALL,
        seq(
          field("array", $._expression_no_struct),
          "[",
          field("index", $._expression),
          "]",
        ),
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    this_expression: (_$) => "this",

    module_path: ($) =>
      prec(
        PREC.FIELD,
        seq($.identifier, repeat1(seq("::", $.identifier))),
      ),

    module_access_expression: ($) =>
      prec(
        PREC.FIELD,
        seq(field("path", $.module_path), ".", field("member", $.identifier)),
      ),

    field_access_expression: ($) =>
      prec(
        PREC.FIELD,
        seq(
          field("object", $._expression),
          ".",
          field("field", $.identifier),
        ),
      ),

    array_index_expression: ($) =>
      prec(
        PREC.CALL,
        seq(
          field("array", $._expression),
          "[",
          field("index", $._expression),
          "]",
        ),
      ),

    call_expression: ($) =>
      prec(
        PREC.CALL,
        choice(
          seq(field("function", $._expression), field("arguments", $.arguments)),
          seq($.generic_callee, field("arguments", $.arguments)),
        ),
      ),

    generic_callee: ($) =>
      prec(
        PREC.CALL,
        seq(field("function", $._expression), field("type_arguments", $.generic_arguments)),
      ),

    arguments: ($) =>
      seq(
        "(",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        optional(","),
        ")",
      ),

    generic_arguments: ($) =>
      seq($.generic_open, $._type, repeat(seq(",", $._type)), $.generic_close),

    type_arguments: ($) =>
      seq("<", $._type, repeat(seq(",", $._type)), $.generic_close),

    struct_init_expression: ($) =>
      prec(
        PREC.CALL,
        seq(
          field("type", choice($.identifier, $.generic_callee)),
          field("body", $.struct_init_body),
        ),
      ),

    struct_init_body: ($) =>
      seq(
        "{",
        optional(
          seq(
            $.field_init,
            repeat(seq(",", $.field_init)),
            optional(","),
          ),
        ),
        "}",
      ),

    field_init: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("value", $._expression))),
      ),

    cast_expression: ($) =>
      prec.left(
        PREC.CAST,
        seq(field("value", $._expression), "as", field("type", $._type)),
      ),

    unary_expression: ($) =>
      prec(
        PREC.UNARY,
        seq(field("operator", choice("-", "!", "~")), field("operand", $._expression)),
      ),

    reference_expression: ($) =>
      prec(
        PREC.UNARY,
        seq("&", optional("mut"), field("value", $._expression)),
      ),

    dereference_expression: ($) =>
      prec(
        PREC.UNARY,
        seq("*", field("value", $._expression)),
      ),

    _binary_expression: ($) =>
      choice(
        $.binary_expression,
        $.comparison_expression,
      ),

    binary_expression: ($) => {
      const table = [
        [PREC.LOGICAL_OR, "||"],
        [PREC.LOGICAL_AND, "&&"],
        [PREC.BIT_OR, "|"],
        [PREC.BIT_XOR, "^"],
        [PREC.BIT_AND, "&"],
        [PREC.SHIFT, choice("<<", ">>")],
        [PREC.ADDITIVE, choice("+", "-")],
        [PREC.MULTIPLICATIVE, choice("*", "/", "%")],
        [PREC.RANGE, choice("..", "..<")],
      ];

      return choice(
        ...table.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(
              field("left", $._expression),
              field("operator", operator),
              field("right", $._expression),
            ),
          ),
        ),
      );
    },

    comparison_expression: ($) =>
      choice(
        prec.left(
          PREC.EQUALITY,
          seq(
            field("left", $._expression),
            field("operator", choice("==", "!=")),
            field("right", $._expression),
          ),
        ),
        prec.left(
          PREC.COMPARISON,
          seq(
            field("left", $._expression),
            field("operator", choice("<", "<=", ">", ">=")),
            field("right", $._expression),
          ),
        ),
      ),

    assignment_expression: ($) =>
      prec.right(
        PREC.ASSIGN,
        seq(
          field("left", $._expression),
          field(
            "operator",
            choice("=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "|=", "^="),
          ),
          field("right", $._expression),
        ),
      ),

    if_expression: ($) =>
      seq(
        "if",
        "(",
        field("condition", $._expression),
        ")",
        field("consequence", $.block),
        optional(seq("else", field("alternative", choice($.if_expression, $.block)))),
      ),

    array_literal: ($) =>
      seq(
        "[",
        optional(seq($._expression, repeat(seq(",", $._expression)))),
        optional(","),
        "]",
      ),

    lambda_expression: ($) =>
      seq(
        optional(field("modifier", choice("suspend", "nosuspend", "blocking"))),
        "func",
        field("parameters", $.lambda_parameters),
        optional(seq("->", field("return_type", $._type))),
        field("body", $.block),
      ),

    lambda_parameters: ($) =>
      seq(
        "(",
        optional(seq($.lambda_parameter, repeat(seq(",", $.lambda_parameter)))),
        optional(","),
        ")",
      ),

    lambda_parameter: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
      ),

    intrinsic_expression: ($) =>
      seq(
        "$",
        field("name", $.identifier),
        optional(field("type_arguments", $.type_arguments)),
        field("arguments", $.arguments),
      ),

    // ---------------------------------------------------------------
    // types
    // ---------------------------------------------------------------

    _type: ($) => seq($._type_kind, optional(field("nullable", "?"))),

    _type_kind: ($) =>
      choice(
        $.primitive_type,
        $.slice_type,
        $.array_type,
        $.unsafe_pointer_type,
        $.safe_pointer_type,
        $.owned_pointer_type,
        $.reference_type,
        $.dyn_type,
        $.function_type,
        $.named_type,
        $.infer_type,
        $.this_type,
      ),

    primitive_type: (_$) =>
      choice(
        "u8", "u16", "u32", "u64", "u128",
        "i8", "i16", "i32", "i64", "i128",
        "usize", "isize",
        "f32", "f64",
        "bool", "char", "str", "void",
      ),

    infer_type: (_$) => "_",
    this_type: (_$) => "this",

    slice_type: ($) => seq("[", "]", field("element", $._type_kind)),

    array_type: ($) =>
      seq(
        "[",
        field("length", $.number_literal),
        "]",
        field("element", $._type_kind),
      ),

    unsafe_pointer_type: ($) =>
      seq(
        "[",
        "*",
        "]",
        field("mutability", choice("mut", "const")),
        field("element", $._type_kind),
      ),

    safe_pointer_type: ($) =>
      seq(
        "*",
        field("mutability", choice("mut", "const")),
        field("element", $._type_kind),
      ),

    owned_pointer_type: ($) => seq("^", field("element", $._type_kind)),

    reference_type: ($) =>
      seq(
        "&",
        optional(field("provenance", $.provenance_annotation)),
        optional(field("mutability", "mut")),
        field("element", $._type_kind),
      ),

    provenance_annotation: ($) =>
      choice(
        seq("this", ".", field("field", $.identifier)),
        "this",
        $.identifier,
      ),

    dyn_type: ($) =>
      seq("dyn", $.named_type, repeat(prec.dynamic(1, seq("+", $.named_type)))),

    function_type: ($) =>
      seq(
        "func",
        "(",
        optional(seq($._type, repeat(seq(",", $._type)))),
        ")",
        optional(seq("->", field("return_type", $._type_kind))),
      ),

    named_type: ($) =>
      seq(
        field("name", $.identifier),
        repeat(seq("::", field("name", $.identifier))),
        optional(seq(".", field("member", $.identifier))),
        optional(field("generics", $.type_arguments)),
      ),

    // ---------------------------------------------------------------
    // literals / tokens
    // ---------------------------------------------------------------

    identifier: (_$) => /[A-Za-z_][A-Za-z0-9_]*/,

    number_literal: (_$) => /\d[\d_]*/,
    decimal_literal: (_$) => /\d[\d_]*\.\d[\d_]*/,

    string_literal: (_$) =>
      token(seq('"', repeat(choice(/[^"\\]/, /\\./)), '"')),

    char_literal: (_$) => token(seq("'", choice(/[^'\\]/, /\\./), "'")),

    boolean_literal: (_$) => choice("true", "false"),
    null_literal: (_$) => "null",
    undefined_literal: (_$) => "undefined",

    line_comment: (_$) => token(seq("//", /.*/)),
  },
});
