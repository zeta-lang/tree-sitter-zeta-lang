; Keywords
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
] @keyword

[
  "public"
  "private"
  "internal"
] @keyword.modifier

(visibility) @keyword.modifier

"mut" @keyword.modifier
"const" @keyword.modifier

; Literals
(number_literal) @number
(decimal_literal) @number.float
(string_literal) @string
(char_literal) @string
(boolean_literal) @constant.builtin.boolean
(null_literal) @constant.builtin
(undefined_literal) @constant.builtin
(this_expression) @variable.builtin
(this_type) @variable.builtin
(line_comment) @comment
(block_comment) @comment

; Types
(primitive_type) @type.builtin
(infer_type) @type.builtin
(named_type name: (identifier) @type)
(struct_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(enum_variant name: (identifier) @constructor)
(interface_declaration name: (identifier) @type)
(generic_parameter name: (identifier) @type.parameter)
(impl_declaration target: (_) @type)
(impl_declaration interface: (_) @type)

; Functions
(function_signature name: (identifier) @function)
(call_expression function: (identifier) @function.call)
(generic_callee function: (identifier) @function.call)
(intrinsic_expression name: (identifier) @function.builtin)
(lambda_expression) @function

; Fields / params / variables
(field_declaration name: (identifier) @property)
(field_declaration_no_trailing name: (identifier) @property)
(field_init name: (identifier) @property)
(normal_parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(let_statement name: (identifier) @variable)
(static_statement name: (identifier) @variable)
(const_statement name: (identifier) @constant)

(identifier) @variable
(field_access_expression field: (identifier) @property)
(module_access_expression member: (identifier) @variable)

; Punctuation / operators
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

"^" @operator
