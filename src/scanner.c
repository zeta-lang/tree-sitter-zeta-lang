/*
 * External scanner for tree-sitter-zeta.
 *
 * Tokens (order must match `externals` in grammar.js):
 *   block_comment   `/* ... *\/`, nestable, unterminated runs to EOF
 *   _generic_open   a `<` that starts a generic argument list in expression
 *                   position (port of `is_generic_argument_list`)
 *   _generic_close  a single `>`. Emitting exactly one character is what makes
 *                   `Vec<Vec<T>>` work: `>>` / `>>>` are never lexed as shifts
 *                   while a generic close is valid.
 *   _error_sentinel never produced; only valid during error recovery.
 */

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <wctype.h>

enum TokenType {
  BLOCK_COMMENT,
  GENERIC_OPEN,
  GENERIC_CLOSE,
  ERROR_SENTINEL,
};

#define MAX_NESTING 64
#define MAX_STEPS 4096

static inline void advance(TSLexer *l) { l->advance(l, false); }
static inline void skip(TSLexer *l) { l->advance(l, true); }

static inline bool is_ident_start(int32_t c) { return c == '_' || iswalpha((wint_t)c); }
static inline bool is_ident_char(int32_t c) { return c == '_' || iswalnum((wint_t)c); }

static void skip_ws(TSLexer *l) {
  while (!l->eof(l) && iswspace((wint_t)l->lookahead)) advance(l);
}

/* Reads an identifier-like word (up to 15 chars kept) at the cursor. */
static void read_word(TSLexer *l, char *buf, size_t cap) {
  size_t n = 0;
  while (!l->eof(l) && is_ident_char(l->lookahead)) {
    if (n + 1 < cap) buf[n++] = (char)(l->lookahead < 128 ? l->lookahead : '?');
    advance(l);
  }
  buf[n] = '\0';
}

static bool is_type_prefix_word(const char *w) {
  return !strcmp(w, "mut") || !strcmp(w, "const") || !strcmp(w, "alias") ||
         !strcmp(w, "dyn") || !strcmp(w, "static") || !strcmp(w, "this");
}

/* After the outermost `>`: is the next token one the parser accepts after a
 * generic argument list? */
static bool follow_is_generic_continuation(TSLexer *l) {
  skip_ws(l);
  if (l->eof(l)) return false;
  switch (l->lookahead) {
    case '(': case '{': case '.': case ',': case ';': case ')': case '}': case ']':
      return true;
    case ':':
      advance(l);
      return l->lookahead == ':';
    default:
      break;
  }
  if (l->lookahead == 'a') {
    char w[8];
    read_word(l, w, sizeof w);
    return !strcmp(w, "as");
  }
  return false;
}

/* Called with the cursor just after `<`. Decides whether `< ... >` is a type
 * argument list by walking a small type-shaped state machine; anything that
 * cannot occur inside a type (`&&`, `+` after a non-dyn atom, digits outside
 * `[N]`, `;`, `==`, calls ...) means it is a comparison. */
static bool looks_like_generic_args(TSLexer *l) {
  char stack[MAX_NESTING];
  int sp = 0;
  stack[sp++] = '<';
  bool start = true;  /* expecting the start of a type (vs. just finished an atom) */
  bool saw_dyn = false;

  for (int steps = 0; steps < MAX_STEPS; steps++) {
    skip_ws(l);
    if (l->eof(l)) return false;
    int32_t c = l->lookahead;
    char top = stack[sp - 1];

    if (start) {
      switch (c) {
        case '?': case '&': case '^': case '*':
          advance(l);
          continue;
        case '[':
          advance(l);
          skip_ws(l);
          if (l->lookahead == ']') {
            advance(l);
          } else if (l->lookahead == '*') {
            advance(l);
            skip_ws(l);
            if (l->lookahead != ']') return false;
            advance(l);
          } else if (l->lookahead >= '0' && l->lookahead <= '9') {
            while (l->lookahead >= '0' && l->lookahead <= '9') advance(l);
            skip_ws(l);
            if (l->lookahead != ']') return false;
            advance(l);
          } else {
            return false;
          }
          continue;
        case '(':
          if (sp >= MAX_NESTING) return false;
          advance(l);
          stack[sp++] = '(';
          continue;
        case ')':
          /* `()` or a trailing comma */
          if (top != '(' && top != 'F') return false;
          goto close_paren;
        default:
          break;
      }
      if (is_ident_start(c)) {
        char w[16];
        read_word(l, w, sizeof w);
        if (!strcmp(w, "dyn")) saw_dyn = true;
        if (is_type_prefix_word(w)) continue;
        if (!strcmp(w, "func")) {
          skip_ws(l);
          if (l->lookahead != '(' || sp >= MAX_NESTING) return false;
          advance(l);
          stack[sp++] = 'F';
          continue;
        }
        start = false;
        continue;
      }
      return false;
    }

    /* just finished a type atom */
    switch (c) {
      case ':':
        advance(l);
        if (l->lookahead == ':') {
          advance(l);
          start = true;
          continue;
        }
        if (top == 'F') {  /* `func(name: T)` */
          start = true;
          continue;
        }
        return false;
      case '.':
        advance(l);
        start = true;
        continue;
      case '<':
        if (sp >= MAX_NESTING) return false;
        advance(l);
        if (l->lookahead == '=' || l->lookahead == '<') return false;
        stack[sp++] = '<';
        start = true;
        continue;
      case ',':
        if (top != '<' && top != '(' && top != 'F') return false;
        advance(l);
        saw_dyn = false;
        start = true;
        continue;
      case '+':
        if (!saw_dyn) return false;
        advance(l);
        start = true;
        continue;
      case '?':
        advance(l);
        continue;
      case '>':
        if (top != '<') return false;
        advance(l);
        sp--;
        if (sp == 0) return follow_is_generic_continuation(l);
        continue;
      case ')':
        if (top != '(' && top != 'F') return false;
        goto close_paren;
      default:
        return false;
    }

  close_paren:
    advance(l);
    sp--;
    start = false;
    if (top == 'F') {  /* optional `: ReturnType` */
      skip_ws(l);
      if (l->lookahead == ':') {
        advance(l);
        if (l->lookahead == ':') return false;
        start = true;
      }
    }
    continue;
  }
  return false;
}

static bool scan_block_comment(TSLexer *l) {
  advance(l);  /* '/' */
  if (l->lookahead != '*') return false;
  advance(l);

  int depth = 1;
  while (depth > 0 && !l->eof(l)) {
    if (l->lookahead == '/') {
      advance(l);
      if (l->lookahead == '*') {
        advance(l);
        depth++;
      }
    } else if (l->lookahead == '*') {
      advance(l);
      if (l->lookahead == '/') {
        advance(l);
        depth--;
      }
    } else {
      advance(l);
    }
  }
  l->result_symbol = BLOCK_COMMENT;
  l->mark_end(l);
  return true;
}

void *tree_sitter_zeta_external_scanner_create(void) { return NULL; }
void tree_sitter_zeta_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_zeta_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_zeta_external_scanner_deserialize(void *payload, const char *buffer,
                                                   unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_zeta_external_scanner_scan(void *payload, TSLexer *lexer,
                                            const bool *valid_symbols) {
  (void)payload;

  /* Error recovery marks every symbol valid; emit nothing then. */
  if (valid_symbols[ERROR_SENTINEL]) return false;

  while (!lexer->eof(lexer) && iswspace((wint_t)lexer->lookahead)) skip(lexer);

  if (lexer->lookahead == '/' && valid_symbols[BLOCK_COMMENT]) {
    return scan_block_comment(lexer);
  }

  if (lexer->lookahead == '>' && valid_symbols[GENERIC_CLOSE]) {
    advance(lexer);
    lexer->mark_end(lexer);
    lexer->result_symbol = GENERIC_CLOSE;
    return true;
  }

  if (lexer->lookahead == '<' && valid_symbols[GENERIC_OPEN]) {
    advance(lexer);
    lexer->mark_end(lexer);  /* the token is just `<`; the rest is lookahead */
    if (lexer->lookahead == '=' || lexer->lookahead == '<') return false;
    if (!looks_like_generic_args(lexer)) return false;
    lexer->result_symbol = GENERIC_OPEN;
    return true;
  }

  return false;
}
