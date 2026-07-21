; Zeta doesn't have an embedded-language literal form visible in the
; sources this grammar was derived from (e.g. no raw SQL/regex/HTML
; string syntax). Left as a scaffold: if Zeta gains something like a
; `re"..."` or `sql"..."` literal later, inject here, e.g.:
;
; (
;   (string_literal) @injection.content
;   (#set! injection.language "regex")
; )
