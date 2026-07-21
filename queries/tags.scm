(function_declaration
  signature: (function_signature
    name: (identifier) @name)) @definition.function

(struct_declaration
  name: (identifier) @name) @definition.struct

(enum_declaration
  name: (identifier) @name) @definition.enum

(interface_declaration
  name: (identifier) @name) @definition.interface

(impl_declaration
  target: (_) @name) @definition.impl

(const_statement
  name: (identifier) @name) @definition.constant

(module_declaration
  name: (identifier) @name) @definition.module

(call_expression
  function: (identifier) @name) @reference.call

(generic_callee
  function: (identifier) @name) @reference.call
