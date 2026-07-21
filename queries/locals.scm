; Scopes
[
  (block)
  (function_declaration)
  (lambda_expression)
  (for_statement)
  (match_arm)
  (source_file)
] @local.scope

; Definitions
(let_statement name: (identifier) @local.definition)
(static_statement name: (identifier) @local.definition)
(normal_parameter name: (identifier) @local.definition)
(lambda_parameter name: (identifier) @local.definition)
(this_parameter) @local.definition
(catch_single binding: (identifier) @local.definition)
(catch_branch binding: (identifier) @local.definition)
(generic_parameter name: (identifier) @local.definition)
(identifier_pattern) @local.definition

(function_declaration
  signature: (function_signature
    name: (identifier) @local.definition))
(struct_declaration name: (identifier) @local.definition)
(enum_declaration name: (identifier) @local.definition)
(interface_declaration name: (identifier) @local.definition)
(const_statement name: (identifier) @local.definition)

; References
(identifier) @local.reference
