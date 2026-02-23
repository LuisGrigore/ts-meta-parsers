import * as E from "fp-ts/Either";
import {
  eof,
  matchChar,
  matchString,
  matchRegex,
  matchNumber,
  alpha,
  digit,
  alphaNum,
  digits,
} from "../src/string_parser_primitives";

import { StringParserState } from "../src/types";

const state = (input: string, index = 0): StringParserState => ({
  input,
  index,
});

/* -------------------------------------------------------------------------- */
/* eof                                                                        */
/* -------------------------------------------------------------------------- */

describe("eof", () => {
  it("should succeed at end of input", () => {
    const parser = eof();
    const result = parser(state(""));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBeUndefined();
      expect(result.right.state.index).toBe(0);
    }
  });

  it("should fail if not at end of input", () => {
    const parser = eof();
    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("eof");
      expect(result.left.position?.offset).toBe(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* matchChar                                                                  */
/* -------------------------------------------------------------------------- */

describe("matchChar", () => {
  it("should match exact character", () => {
    const parser = matchChar("a");
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if character does not match", () => {
    const parser = matchChar("x");
    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* matchString                                                                */
/* -------------------------------------------------------------------------- */

describe("matchString", () => {
  it("should match exact string", () => {
    const parser = matchString("abc");
    const result = parser(state("abcdef"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("abc");
      expect(result.right.state.index).toBe(3);
    }
  });

  it("should fail if string does not match", () => {
    const parser = matchString("xyz");
    const result = parser(state("abcdef"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* matchRegex                                                                 */
/* -------------------------------------------------------------------------- */

describe("matchRegex", () => {
  it("should match regex at current position", () => {
    const parser = matchRegex(/^\d+/);
    const result = parser(state("123abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("123");
      expect(result.right.state.index).toBe(3);
    }
  });

  it("should fail if regex does not match at position 0", () => {
    const parser = matchRegex(/^\d+/);
    const result = parser(state("abc123"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* matchNumber                                                                */
/* -------------------------------------------------------------------------- */

describe("matchNumber", () => {
  it("should parse integer", () => {
    const result = matchNumber(state("42abc"));
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe(42);
      expect(result.right.state.index).toBe(2);
    }
  });

  it("should parse float", () => {
    const result = matchNumber(state("3.14xyz"));
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe(3.14);
      expect(result.right.state.index).toBe(4);
    }
  });

  it("should handle negative numbers", () => {
    const result = matchNumber(state("-7abc"));
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe(-7);
      expect(result.right.state.index).toBe(2);
    }
  });

  it("should fail if no number found", () => {
    const result = matchNumber(state("abc"));
    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* alpha                                                                      */
/* -------------------------------------------------------------------------- */

describe("alpha", () => {
  it("should match single letter", () => {
    const parser = alpha();
    const result = parser(state("a1"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if not a letter", () => {
    const parser = alpha();
    const result = parser(state("1a"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* digit                                                                      */
/* -------------------------------------------------------------------------- */

describe("digit", () => {
  it("should match single digit", () => {
    const parser = digit();
    const result = parser(state("5a"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("5");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if not a digit", () => {
    const parser = digit();
    const result = parser(state("a5"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* alphaNum                                                                   */
/* -------------------------------------------------------------------------- */

describe("alphaNum", () => {
  it("should match letter", () => {
    const parser = alphaNum();
    const result = parser(state("b9"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("b");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should match digit", () => {
    const parser = alphaNum();
    const result = parser(state("9b"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("9");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail for non-alphanumeric", () => {
    const parser = alphaNum();
    const result = parser(state("#"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* digits                                                                     */
/* -------------------------------------------------------------------------- */

describe("digits", () => {
  it("should parse multiple digits", () => {
    const parser = digits();
    const result = parser(state("123abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["1", "2", "3"]);
      expect(result.right.state.index).toBe(3);
    }
  });

  it("should parse single digit", () => {
    const parser = digits();
    const result = parser(state("5abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["5"]);
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should return empty array if no digits", () => {
    const parser = digits();
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual([]);
      expect(result.right.state.index).toBe(0);
    }
  });
});