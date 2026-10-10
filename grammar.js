/**
 * @file Zeta grammar for tree-sitter
 * @author Wildered
 * @license MIT

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */

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

const INT_SUFFIX = "(?:[iu](?:8|16|32|64|128|size))";
const FLOAT_SUFFIX = "(?:f32|f64)";

/** `a (, a)*` */
const commaSep1 = (rule) => seq(rule, repeat(seq(",", rule)));
/** `a (, a)* [,]` */
const commaSep1Trailing = (rule) => seq(commaSep1(rule), optional(","));
/** `[a (, a)* [,]]` */
const commaSepTrailing = (rule) => optional(commaSep1Trailing(rule));

module.exports = grammar({
  name: "zeta",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  word: ($) => $.identifier,

  // Order must match `enum TokenType` in src/scanner.c.
  externals: ($) => [
    $.block_comment,
    $._generic_open,
    $._generic_close,
    $._error_sentinel,
  ],

  supertypes: ($) => [$._statement, $._expression, $._type, $._pattern],

  inline: ($) => [$._visibility_keyword],

  conflicts: ($) => [
    // `match x {` : `x {` could start a struct literal. GLR picks whichever survives.
    [$._expression, $.struct_init_expression],

    // `&Foo Bar` (provenance + type) vs `&Foo` (type) / generic bound `&name`.
    [$.provenance_annotation, $.named_type],
    [$.named_type],
    [$.dyn_type],

    // `if (..) {..} <next statement>` vs `if (..) {..}` used as an operand.
    [$._expression, $._block_like_expression],
  ],

  rules: {
    source_file: ($) => repeat($._statement),

    // ---------------------------------------------------------------
    // Statements
    // ---------------------------------------------------------------

    _statement: ($) =>
      choice(
        $.attributed_statement,
        $._declaration,
        $.let_statement,
        $.shorthand_let_statement,
        $.static_statement,
        $.const_statement,
        $.import_statement,
        $.package_statement,
        $.while_statement,
        $.for_statement,
        $.defer_statement,
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.block,
        $.expression_statement,
      ),

    _declaration: ($) =>
      choice(
        $.module_declaration,
        $.struct_declaration,
        $.enum_declaration,
        $.impl_declaration,
        $.interface_declaration,
        $.function_declaration,
        $.type_alias_declaration,
      ),

    // `#[a, b(1, "x"), c = ident]`
    attributed_statement: ($) =>
      seq($.attribute_list, field("statement", $._statement)),

    attribute_list: ($) =>
      seq("#", "[", commaSep1Trailing($.attribute), "]"),

    attribute: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          choice(
            seq("(", commaSepTrailing($._attribute_argument), ")"),
            seq("=", field("value", $._attribute_argument)),
          ),
        ),
      ),

    _attribute_argument: ($) =>
      choice(
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        $.attribute_key_value,
        $.attribute_call,
        $.identifier,
      ),

    attribute_key_value: ($) =>
      seq(field("key", $.identifier), "=", field("value", $._attribute_argument)),

    attribute_call: ($) =>
      seq(
        field("name", $.identifier),
        "(",
        commaSepTrailing($._attribute_argument),
        ")",
      ),

    _visibility_keyword: (_$) =>
      choice("public", "private", "module", "internal", "package"),

    visibility: ($) => $._visibility_keyword,

    // ---------------------------------------------------------------
    // import / package / module
    // ---------------------------------------------------------------

    import_statement: ($) =>
      seq("import", field("path", $.path), optional(";")),

    package_statement: ($) =>
      seq("package", field("path", $.path), optional(";")),

    // `foo`, `foo::bar`, `foo::bar.Baz`
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
    // struct / enum / impl / interface / type alias
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
        optional("manual"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        optional(","),
      ),

    tuple_struct_fields: ($) =>
      seq("(", commaSepTrailing($.tuple_field), ")"),

    tuple_field: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        optional("manual"),
        field("type", $._type),
      ),

    enum_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "enum",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        "{",
        commaSepTrailing($.enum_variant),
        "}",
      ),

    // `Name` or `Name { field: Type, .. }`
    enum_variant: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          seq("{", commaSepTrailing($.variant_field), "}"),
        ),
      ),

    variant_field: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        optional("manual"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
      ),

    impl_declaration: ($) =>
      seq(
        optional("unsafe"),
        "impl",
        optional(field("generics", $.generic_parameters)),
        field("target", choice($.any_slice_type, $._type)),
        optional(seq("by", field("interface", $._type))),
        field("body", $.impl_body),
      ),

    // `impl [] by Foo { .. }`
    any_slice_type: (_$) => seq("[", "]"),

    impl_body: ($) =>
      seq(
        "{",
        repeat(
          choice(
            $.const_statement,
            $.function_declaration,
            alias($._attributed_impl_item, $.attributed_statement),
          ),
        ),
        "}",
      ),

    _attributed_impl_item: ($) =>
      seq(
        repeat1($.attribute_list),
        field("statement", choice($.const_statement, $.function_declaration)),
      ),

    interface_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        optional("sealed"),
        "interface",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        optional(field("permits", $.permits_clause)),
        field("body", $.interface_body),
      ),

    interface_body: ($) => seq("{", repeat($.function_declaration), "}"),

    permits_clause: ($) => seq("permits", commaSep1($._type)),

    type_alias_declaration: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "type",
        field("name", $.identifier),
        optional(field("generics", $.generic_parameters)),
        "=",
        field("type", $._type),
        optional(";"),
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
          seq("extern", field("abi", $.string_literal)),
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
      seq("<", commaSep1($.generic_parameter), $._generic_close),

    // `T`, `const N`, `static S`, `T: A + B + &static`, `T = i32`
    generic_parameter: ($) =>
      seq(
        optional(choice("const", "static")),
        field("name", $.identifier),
        optional(seq(":", $._bound, repeat(seq("+", $._bound)))),
        optional(seq("=", field("default", $._type))),
      ),

    _bound: ($) => choice($.provenance_bound, $._type),

    // `&static`, `&this`, `&this.field`, `&name` used as a lower bound
    provenance_bound: ($) => prec.dynamic(2, seq("&", $.provenance_annotation)),

    parameters: ($) =>
      seq("(", commaSepTrailing($._parameter), ")"),

    _parameter: ($) => choice($.this_parameter, $.parameter),

    // `this`, `mut this`, `&this`, `&mut this`, `&alias this`, `this.{ &a, &mut b }`
    this_parameter: ($) =>
      seq(
        optional(
          choice(seq("&", optional(choice("mut", "alias"))), "mut"),
        ),
        "this",
        optional($.multi_place),
      ),

    parameter: ($) =>
      seq(
        optional("mut"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        optional($.multi_place),
        optional(seq("=", field("default", $._expression))),
      ),

    // `.{ &a.b, &mut c[i], &alias d }`
    multi_place: ($) =>
      seq(".{", commaSepTrailing($.effect_access), "}"),

    effect_access: ($) =>
      seq(
        "&",
        optional(choice("mut", "alias")),
        field("path", $.effect_path),
      ),

    effect_path: ($) =>
      seq(
        $.identifier,
        repeat(
          choice(
            seq(".", $.identifier),
            seq("[", field("index", $._expression), "]"),
          ),
        ),
      ),

    // ---------------------------------------------------------------
    // let / static / const / control flow
    // ---------------------------------------------------------------

    // `let [mut] [manual] name: Type = expr [catch ..] [;]`
    let_statement: ($) =>
      seq($._let_head, optional(";")),

    // same thing without the `;` (the `for (` header owns the separator)
    _for_init_let: ($) => alias($._let_head, $.let_statement),

    _let_head: ($) =>
      seq(
        "let",
        optional("mut"),
        optional("manual"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        "=",
        field("value", $._expression),
        optional(field("catch", $.catch_clause)),
      ),

    // `[mut] [manual] name := expr [catch ..] [;]`
    shorthand_let_statement: ($) =>
      seq($._shorthand_let_head, optional(";")),

    _for_init_shorthand: ($) =>
      alias($._shorthand_let_head, $.shorthand_let_statement),

    _shorthand_let_head: ($) =>
      seq(
        optional("mut"),
        optional("manual"),
        field("name", $.identifier),
        ":=",
        field("value", $._expression),
        optional(field("catch", $.catch_clause)),
      ),

    static_statement: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "static",
        "let",
        optional("mut"),
        optional("manual"),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        "=",
        field("value", $._expression),
        optional(field("catch", $.catch_clause)),
        optional(";"),
      ),

    const_statement: ($) =>
      seq(
        optional(field("visibility", $.visibility)),
        "const",
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        "=",
        field("value", $._expression),
        optional(";"),
      ),

    catch_clause: ($) => seq("catch", choice($.catch_single, $.catch_multiple)),

    // `catch (ErrType e) -> { .. }`
    catch_single: ($) =>
      seq(
        "(",
        field("error_type", $._type),
        optional(field("binding", $.identifier)),
        ")",
        choice("->", "=>"),
        field("body", $.block),
      ),

    // `catch { ErrA a => { .. }, ErrB => { .. } }`
    catch_multiple: ($) =>
      seq("{", commaSepTrailing($.catch_branch), "}"),

    catch_branch: ($) =>
      seq(
        field("error_type", $._type),
        optional(field("binding", $.identifier)),
        "=>",
        field("body", $.block),
      ),

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
        optional(field("init", choice($._for_init_let, $._for_init_shorthand))),
        ";",
        optional(field("condition", $._expression)),
        ";",
        optional(field("update", $._expression)),
        ")",
        field("body", $.block),
      ),

    return_statement: ($) =>
      choice(
        prec.left(1, seq("return", field("value", $._expression), optional(";"))),
        seq("return", optional(";")),
      ),

    break_statement: ($) =>
      choice(
        prec.left(1, seq("break", field("value", $._expression), optional(";"))),
        seq("break", optional(";")),
      ),

    continue_statement: (_$) => seq("continue", optional(";")),

    defer_statement: ($) =>
      seq("defer", field("action", choice($.block, $.expression_statement))),

    // Statements ending in a block never need a `;`, and the next statement
    // must not be glued on as a binary/call continuation (`if (..) {..} *p = 1;`).
    expression_statement: ($) =>
      choice(
        prec(-1, seq($._expression, optional(";"))),
        prec.dynamic(2, prec(1, $._block_like_expression)),
      ),

    _block_like_expression: ($) =>
      choice($.if_expression, $.match_expression, $.unsafe_block),

    block: ($) => seq("{", repeat($._statement), "}"),

    unsafe_block: ($) => seq("unsafe", field("block", $.block)),

    // ---------------------------------------------------------------
    // match / patterns
    // ---------------------------------------------------------------

    match_expression: ($) =>
      seq(
        "match",
        field("subject", $._expression),
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
        field(
          "body",
          choice(
            $.block,
            $.return_statement,
            $.break_statement,
            $.continue_statement,
            $.expression_statement,
          ),
        ),
        optional(","),
      ),

    _pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.null_literal,
        $.number_literal,
        $.string_literal,
        $.boolean_literal,
        $.mut_pattern,
        $.enum_variant_pattern,
        $.struct_pattern,
        $.qualified_pattern,
        $.identifier_pattern,
        $.tuple_pattern,
        $.array_pattern,
      ),

    wildcard_pattern: (_$) => "_",

    identifier_pattern: ($) => $.identifier,

    mut_pattern: ($) => seq("mut", field("name", $.identifier)),

    // `Color.Red`, `shapes::Shape.Circle`
    _pattern_path: ($) =>
      seq(
        $.identifier,
        repeat1(seq(choice(".", "::"), $.identifier)),
      ),

    qualified_pattern: ($) => alias($._pattern_path, $.qualified_pattern_path),

    // `Some(x)`, `Shape.Circle(r)`
    enum_variant_pattern: ($) =>
      seq(
        field("name", choice($.identifier, alias($._pattern_path, $.qualified_pattern_path))),
        "(",
        commaSepTrailing($._pattern),
        ")",
      ),

    // `Point { x, y: 0 }`
    struct_pattern: ($) =>
      seq(
        field("name", choice($.identifier, alias($._pattern_path, $.qualified_pattern_path))),
        "{",
        commaSepTrailing($.field_pattern),
        "}",
      ),

    field_pattern: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("pattern", $._pattern))),
      ),

    tuple_pattern: ($) => seq("(", commaSepTrailing($._pattern), ")"),

    array_pattern: ($) => seq("[", commaSepTrailing($._pattern), "]"),

    // ---------------------------------------------------------------
    // Expressions
    // ---------------------------------------------------------------

    _expression: ($) =>
      choice(
        $.identifier,
        $.module_path,
        $.this_expression,
        $.primitive_type,
        $.number_literal,
        $.decimal_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.null_literal,
        $.undefined_literal,
        $.uninit_literal,
        $.array_literal,
        $.parenthesized_expression,
        $.tuple_expression,
        $.unary_expression,
        $.reference_expression,
        $.dereference_expression,
        $.postfix_dereference_expression,
        $.binary_expression,
        $.comparison_expression,
        $.assignment_expression,
        $.cast_expression,
        $.call_expression,
        $.generic_expression,
        $.field_access_expression,
        $.module_access_expression,
        $.array_index_expression,
        $.or_else_expression,
        $.struct_init_expression,
        $.if_expression,
        $.match_expression,
        $.unsafe_block,
        $.lambda_expression,
        $.intrinsic_expression,
      ),

    this_expression: (_$) => "this",

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    // `()`, `(a,)`, `(a, b)`  (a lone `(a)` is parenthesized)
    tuple_expression: ($) =>
      choice(
        seq("(", ")"),
        seq("(", $._expression, ",", commaSepTrailing($._expression), ")"),
      ),

    array_literal: ($) =>
      seq("[", commaSepTrailing($._expression), "]"),

    unary_expression: ($) =>
      prec(
        PREC.UNARY,
        seq(
          field("operator", choice("-", "!", "~")),
          field("operand", $._expression),
        ),
      ),

    reference_expression: ($) =>
      prec(
        PREC.UNARY,
        seq("&", optional(choice("mut", "alias")), field("value", $._expression)),
      ),

    dereference_expression: ($) =>
      prec(PREC.UNARY, seq("*", field("value", $._expression))),

    // `p.*`
    postfix_dereference_expression: ($) =>
      prec(PREC.FIELD, seq(field("value", $._expression), ".", "*")),

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
        [PREC.RANGE, choice("..=", "..<")],
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

    cast_expression: ($) =>
      prec.left(
        PREC.CAST,
        seq(field("value", $._expression), "as", field("type", $._type)),
      ),

    call_expression: ($) =>
      prec(
        PREC.CALL,
        seq(field("function", $._expression), field("arguments", $.arguments)),
      ),

    arguments: ($) => seq("(", commaSepTrailing($._expression), ")"),

    // `foo<i32>`, only produced when the scanner emits `_generic_open`
    generic_expression: ($) =>
      prec(
        PREC.CALL,
        seq(
          field("value", $._expression),
          field("type_arguments", $.generic_arguments),
        ),
      ),

    generic_arguments: ($) =>
      seq($._generic_open, commaSep1($._type), $._generic_close),

    field_access_expression: ($) =>
      prec(
        PREC.FIELD,
        seq(field("object", $._expression), ".", field("field", $.identifier)),
      ),

    // `a::b::c`
    module_path: ($) =>
      prec(PREC.FIELD, seq($.identifier, repeat1(seq("::", $.identifier)))),

    // `a::b.Member`
    module_access_expression: ($) =>
      prec(
        PREC.FIELD + 1,
        seq(field("path", $.module_path), ".", field("member", $.identifier)),
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

    // `value else { .. }`
    or_else_expression: ($) =>
      prec.left(
        PREC.CALL,
        seq(field("value", $._expression), "else", field("else_block", $.block)),
      ),

    // `Point { x, y: 1 }`, `Box<i32> { .. }`, `m.Point { .. }`
    struct_init_expression: ($) =>
      prec.dynamic(
        1,
        seq(
          field(
            "type",
            choice(
              $.identifier,
              $.field_access_expression,
              $.module_access_expression,
              $.generic_expression,
            ),
          ),
          field("body", $.struct_init_body),
        ),
      ),

    struct_init_body: ($) => seq("{", commaSepTrailing($.field_init), "}"),

    field_init: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("value", $._expression))),
      ),

    if_expression: ($) =>
      prec.right(
        seq(
          "if",
          "(",
          field("condition", $._expression),
          ")",
          field("consequence", $.block),
          optional(
            seq("else", field("alternative", choice($.if_expression, $.block))),
          ),
        ),
      ),

    // `[move] [suspend|nosuspend|blocking] func (a, b: i32) -> T { .. }`
    lambda_expression: ($) =>
      seq(
        optional("move"),
        optional(field("modifier", choice("suspend", "nosuspend", "blocking"))),
        "func",
        field("parameters", $.lambda_parameters),
        optional(seq("->", field("return_type", $._type))),
        field("body", $.block),
      ),

    lambda_parameters: ($) =>
      seq("(", commaSepTrailing($.lambda_parameter), ")"),

    lambda_parameter: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        optional($.multi_place),
      ),

    // `$sizeof<T>()`
    intrinsic_expression: ($) =>
      seq(
        "$",
        field("name", $.identifier),
        optional(field("type_arguments", $.type_arguments)),
        field("arguments", $.arguments),
      ),

    // ---------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------

    _type: ($) =>
      choice(
        $.primitive_type,
        $.infer_type,
        $.this_type,
        $.named_type,
        $.tuple_type,
        $.function_type,
        $.slice_type,
        $.array_type,
        $.unsafe_pointer_type,
        $.safe_pointer_type,
        $.owned_pointer_type,
        $.reference_type,
        $.dyn_type,
        $.nullable_type,
      ),

    primitive_type: (_$) =>
      choice(
        "u8", "u16", "u32", "u64", "u128",
        "i8", "i16", "i32", "i64", "i128",
        "usize", "isize",
        "f32", "f64",
        "bool", "char", "str", "void", "never",
      ),

    infer_type: (_$) => "_",

    // `This`
    this_type: (_$) => "This",

    // `?T` or `[]T?`
    nullable_type: ($) =>
      choice(
        prec.right(1, seq("?", field("inner", $._type))),
        prec.right(
          1,
          seq(
            field("inner", choice($.slice_type, $.array_type, $.unsafe_pointer_type)),
            "?",
          ),
        ),
      ),

    slice_type: ($) => seq("[", "]", field("element", $._type)),

    array_type: ($) =>
      seq("[", field("length", $.number_literal), "]", field("element", $._type)),

    // `[*]mut T`, `[*]const T`
    unsafe_pointer_type: ($) =>
      seq(
        "[",
        "*",
        "]",
        field("mutability", choice("mut", "const")),
        field("element", $._type),
      ),

    // `*mut T`, `*const T`
    safe_pointer_type: ($) =>
      seq(
        "*",
        field("mutability", choice("mut", "const")),
        field("element", $._type),
      ),

    // `^T`, `^arena T`, `^this.arena T`
    owned_pointer_type: ($) =>
      seq(
        "^",
        optional(field("allocator", $.provenance_annotation)),
        field("element", $._type),
      ),

    // `&T`, `&mut T`, `&alias T`, `&static T`, `&this.world Player`
    reference_type: ($) =>
      seq(
        "&",
        optional(field("provenance", $.provenance_annotation)),
        optional(field("mutability", choice("mut", "alias"))),
        field("element", $._type),
      ),

    provenance_annotation: ($) =>
      choice(
        seq("this", ".", field("field", $.identifier)),
        "this",
        "static",
        $.identifier,
      ),

    dyn_type: ($) =>
      seq(
        "dyn",
        $.named_type,
        repeat(prec.dynamic(1, seq("+", $.named_type))),
      ),

    // `func(i32, name: str): bool`
    function_type: ($) =>
      seq(
        "func",
        "(",
        commaSepTrailing(choice($._type, $.function_type_parameter)),
        ")",
        optional(seq(":", field("return_type", $._type))),
      ),

    function_type_parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    // `()`, `(T,)`, `(A, B)`  (a lone `(T)` is just T)
    tuple_type: ($) =>
      choice(
        seq("(", ")"),
        seq("(", $._type, ",", commaSepTrailing($._type), ")"),
        seq("(", $._type, ")"),
      ),

    // `Foo`, `a::b::Foo`, `a::Foo.Member`, `Vec<T>`
    named_type: ($) =>
      seq(
        field("name", $.identifier),
        repeat(seq("::", field("name", $.identifier))),
        optional(seq(".", field("member", $.identifier))),
        optional(field("generics", $.type_arguments)),
      ),

    type_arguments: ($) =>
      seq(choice("<", $._generic_open), commaSep1($._type), $._generic_close),

    // ---------------------------------------------------------------
    // Literals / tokens
    // ---------------------------------------------------------------

    identifier: (_$) => /[\p{L}_][\p{L}\p{N}_]*/,

    number_literal: (_$) =>
      token(
        choice(
          new RegExp(`0[xX][0-9a-fA-F_]+${INT_SUFFIX}?`),
          new RegExp(`0[oO][0-7_]+${INT_SUFFIX}?`),
          new RegExp(`0[bB][01_]+${INT_SUFFIX}?`),
          new RegExp(`\\d[\\d_]*(?:${INT_SUFFIX}|${FLOAT_SUFFIX})?`),
        ),
      ),

    decimal_literal: (_$) =>
      token(
        new RegExp(`\\d[\\d_]*\\.\\d[\\d_]*(?:[eE][+-]?\\d+)?${FLOAT_SUFFIX}?`),
      ),

    string_literal: (_$) => token(/"(?:[^"\\]|\\[\s\S])*"/),

    char_literal: (_$) => token(/'(?:[^'\\\n]|\\.[^'\n]*)'/),

    boolean_literal: (_$) => choice("true", "false"),
    null_literal: (_$) => "null",
    undefined_literal: (_$) => "undefined",
    uninit_literal: (_$) => "uninit",

    line_comment: (_$) => token(seq("//", /[^\n]*/)),
  },
});
