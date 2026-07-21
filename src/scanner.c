#include "tree_sitter/parser.h"
#include <wctype.h>

enum TokenType {
  BLOCK_COMMENT,
  GENERIC_OPEN,
  GENERIC_CLOSE,
};

void *tree_sitter_zeta_external_scanner_create(void) { return NULL; }

void tree_sitter_zeta_external_scanner_destroy(void *payload) {
  (void)payload;
}

unsigned tree_sitter_zeta_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_zeta_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool scan_block_comment(TSLexer *lexer) {
  while (iswspace(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead != '/') {
    return false;
  }
  advance(lexer);

  if (lexer->lookahead != '*') {
    return false;
  }
  advance(lexer);

  unsigned depth = 1;

  for (;;) {
    if (lexer->eof(lexer)) {
      lexer->result_symbol = BLOCK_COMMENT;
      return true;
    }

    if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '*') {
        advance(lexer);
        depth++;
        continue;
      }
      continue;
    }

    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        depth--;
        if (depth == 0) {
          lexer->result_symbol = BLOCK_COMMENT;
          return true;
        }
      }
      continue;
    }

    advance(lexer);
  }
}

#define MAX_LOOKAHEAD 512

static bool scan_generic_open(TSLexer *lexer) {
  if (lexer->lookahead != '<') {
    return false;
  }
  advance(lexer);
  lexer->mark_end(lexer);

  int angle_depth = 1;
  int paren_depth = 0;
  int bracket_depth = 0;

  for (unsigned steps = 0; steps < MAX_LOOKAHEAD; steps++) {
    if (lexer->eof(lexer)) {
      return false;
    }

    int32_t c = lexer->lookahead;

    if (c == '<') {
      angle_depth++;
      advance(lexer);
      continue;
    }

    if (c == '>') {
      angle_depth--;
      advance(lexer);
      if (angle_depth == 0) {
        if (paren_depth != 0 || bracket_depth != 0) {
          return false;
        }
        while (iswspace(lexer->lookahead)) {
          advance(lexer);
        }
        int32_t next = lexer->lookahead;
        if (next == '(' || next == '{' || next == '.' || next == ':') {
          lexer->result_symbol = GENERIC_OPEN;
          return true;
        }
        return false;
      }
      continue;
    }

    if (c == '(') {
      paren_depth++;
      advance(lexer);
      continue;
    }
    if (c == ')') {
      if (paren_depth == 0) {
        return false;
      }
      paren_depth--;
      advance(lexer);
      continue;
    }
    if (c == '[') {
      bracket_depth++;
      advance(lexer);
      continue;
    }
    if (c == ']') {
      if (bracket_depth == 0) {
        return false;
      }
      bracket_depth--;
      advance(lexer);
      continue;
    }

    if (iswalnum(c) || c == '_' || c == ',' || c == '.' || c == ':' ||
        c == '*' || c == '&' || c == '^' || c == '?' || c == '+' ||
        c == '-' || iswspace(c)) {
      advance(lexer);
      continue;
    }

    return false;
  }

  return false;
}

static bool scan_generic_close(TSLexer *lexer) {
  if (lexer->lookahead != '>') {
    return false;
  }
  advance(lexer);
  lexer->mark_end(lexer);
  lexer->result_symbol = GENERIC_CLOSE;
  return true;
}

bool tree_sitter_zeta_external_scanner_scan(void *payload, TSLexer *lexer,
                                             const bool *valid_symbols) {
  (void)payload;

  if (valid_symbols[GENERIC_CLOSE] && lexer->lookahead == '>') {
    return scan_generic_close(lexer);
  }

  if (valid_symbols[GENERIC_OPEN] && lexer->lookahead == '<') {
    if (scan_generic_open(lexer)) {
      return true;
    }
  }

  if (valid_symbols[BLOCK_COMMENT]) {
    return scan_block_comment(lexer);
  }

  return false;
}
