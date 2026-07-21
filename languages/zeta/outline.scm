(struct_declaration
  "struct" @context
  name: (identifier) @name) @item

(enum_declaration
  "enum" @context
  name: (identifier) @name) @item

(interface_declaration
  "interface" @context
  name: (identifier) @name) @item

(impl_declaration
  "impl" @context
  target: (_) @name) @item

(function_declaration
  signature: (function_signature
    "func" @context
    name: (identifier) @name)) @item

(const_statement
  "const" @context
  name: (identifier) @name) @item

(module_declaration
  "module" @context
  name: (identifier) @name) @item

(enum_variant
  name: (identifier) @name) @item
