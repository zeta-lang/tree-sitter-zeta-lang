[
  "func" "let" "static" "struct" "enum" "impl" "interface" "sealed" "permits"
  "by" "module" "package" "import" "const" "type"
  "return" "break" "continue" "defer"
  "match" "case" "if" "else" "while" "for" "catch"
  "as" "dyn" "unsafe" "extern" "inline" "noinline"
  "suspend" "nosuspend" "blocking" "move"
  "public" "private" "internal"
  "mut" "manual" "alias"
] @keyword

(visibility) @keyword

(number_literal) @number
(decimal_literal) @number
(string_literal) @string
(char_literal) @string
(boolean_literal) @boolean
(null_literal) @constant.builtin
(undefined_literal) @constant.builtin
(uninit_literal) @constant.builtin
(this_expression) @variable.special
(this_type) @type.builtin
(this_parameter "this" @variable.special)
(line_comment) @comment
(block_comment) @comment

(primitive_type) @type.builtin
(infer_type) @type.builtin
(named_type name: (identifier) @type)
(named_type member: (identifier) @type)
(struct_declaration name: (identifier) @type)
(enum_declaration name: (identifier) @type)
(enum_variant name: (identifier) @constructor)
(interface_declaration name: (identifier) @type)
(type_alias_declaration name: (identifier) @type)
(generic_parameter name: (identifier) @type)
(impl_declaration target: (_) @type)
(impl_declaration interface: (_) @type)

(function_signature name: (identifier) @function)
(call_expression function: (identifier) @function)
(call_expression
  function: (generic_expression value: (identifier) @function))
(call_expression
  function: (field_access_expression field: (identifier) @function))
(call_expression
  function: (module_access_expression member: (identifier) @function))
(intrinsic_expression name: (identifier) @function)
(intrinsic_expression "$" @function)

(attribute_list) @attribute
(attribute name: (identifier) @attribute)

(field_declaration name: (identifier) @property)
(variant_field name: (identifier) @property)
(field_init name: (identifier) @property)
(field_pattern name: (identifier) @property)
(parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(const_statement name: (identifier) @constant)
(static_statement name: (identifier) @variable)

(identifier) @variable
(field_access_expression field: (identifier) @property)
(module_access_expression member: (identifier) @variable)
(module_path (identifier) @namespace)
(module_declaration name: (identifier) @namespace)

[ "(" ")" "{" "}" "[" "]" ".{" ] @punctuation.bracket

[ "," "." ":" "::" ";" ] @punctuation.delimiter

[
  "+" "-" "*" "/" "%"
  "==" "!=" "<" "<=" ">" ">="
  "&&" "||" "!" "~"
  "&" "|" "^" "<<" ">>"
  "=" "+=" "-=" "*=" "/=" "%="
  "<<=" ">>=" "&=" "|=" "^="
  "->" "=>" ":="
  "..=" "..<"
  "?"
] @operator
