[
  "func"
  "let"
  "static"
  "struct"
  "enum"
  "impl"
  "interface"
  "sealed"
  "permits"
  "by"
  "module"
  "package"
  "import"
  "const"
  "return"
  "break"
  "continue"
  "defer"
  "panic"
  "match"
  "case"
  "if"
  "else"
  "while"
  "for"
  "catch"
  "as"
  "dyn"
  "unsafe"
  "extern"
  "inline"
  "noinline"
  "suspend"
  "nosuspend"
  "blocking"
  "public"
  "private"
  "internal"
  "mut"
] @keyword

(visibility) @keyword

(number_literal) @number
(decimal_literal) @number
(string_literal) @string
(char_literal) @string
(boolean_literal) @boolean
(null_literal) @constant.builtin
(undefined_literal) @constant.builtin
(this_expression) @variable.special
(this_type) @variable.special
(line_comment) @comment
(block_comment) @comment

(primitive_type) @type.builtin
(infer_type) @type.builtin
(named_type name: (identifier) @type)
(struct_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(enum_variant name: (identifier) @constructor)
(interface_declaration name: (identifier) @type)
(generic_parameter name: (identifier) @type)
(impl_declaration target: (_) @type)
(impl_declaration interface: (_) @type)

(function_signature name: (identifier) @function)
(call_expression function: (identifier) @function)
(generic_callee function: (identifier) @function)
(intrinsic_expression name: (identifier) @function)

(field_declaration name: (identifier) @property)
(field_declaration_no_trailing name: (identifier) @property)
(field_init name: (identifier) @property)
(normal_parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(const_statement name: (identifier) @constant)

(identifier) @variable
(field_access_expression field: (identifier) @property)
(module_access_expression member: (identifier) @variable)

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  ","
  "."
  ":"
  "::"
  ";"
] @punctuation.delimiter

[
  "+" "-" "*" "/" "%"
  "==" "!=" "<" "<=" ">" ">="
  "&&" "||" "!" "~"
  "&" "|" "^" "<<" ">>"
  "=" "+=" "-=" "*=" "/=" "%="
  "<<=" ">>=" "&=" "|=" "^="
  "->" "=>" ":="
  ".." "..<"
  "?"
] @operator
