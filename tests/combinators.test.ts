import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import {
  sequenceOf,
  between,
  choice,
  many,
  manyOne,
  manyTill,
  optional,
  sepBy,
  orElse,
  skip,
  before,
  attempt,
  label,
  lazy,
} from "../src/combinators";

import { ok, fail, of } from "../src/monad";
import { Parser } from "../src/types";

type TestState = { input: string; index: number };

const state = (input: string, index = 0): TestState => ({
  input,
  index,
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const char =
  (expected: string): Parser<TestState, string> =>
  (s) =>
    s.input[s.index] === expected
      ? ok({ ...s, index: s.index + 1 }, expected)
      : fail({
          type: "char",
          msg: `Expected ${expected}`,
          position: { offset: s.index },
        });

const digit: Parser<TestState, string> = (s) =>
  /\d/.test(s.input[s.index])
    ? ok({ ...s, index: s.index + 1 }, s.input[s.index])
    : fail({
        type: "digit",
        msg: "Expected digit",
        position: { offset: s.index },
      });

/* -------------------------------------------------------------------------- */
/* sequenceOf                                                                 */
/* -------------------------------------------------------------------------- */

describe("sequenceOf", () => {
  it("should parse sequentially", () => {
    const parser = sequenceOf(char("a"), char("b"), char("c"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["a", "b", "c"]);
      expect(result.right.state.index).toBe(3);
    }
  });

  it("should fail if any parser fails", () => {
    const parser = sequenceOf(char("a"), char("x"));
    const result = parser(state("ab"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* between                                                                    */
/* -------------------------------------------------------------------------- */

describe("between", () => {
  it("should parse content between delimiters", () => {
    const parser = between(char("("), char(")"))(char("a"));
    const result = parser(state("(a)"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* choice                                                                     */
/* -------------------------------------------------------------------------- */

describe("choice", () => {
  it("should return first successful parser", () => {
    const parser = choice(char("x"), char("a"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
    }
  });

  it("should fail if all fail", () => {
    const parser = choice(char("x"), char("y"));
    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* many / manyOne                                                             */
/* -------------------------------------------------------------------------- */

describe("many", () => {
  it("should parse zero or more", () => {
    const parser = many(char("a"));
    const result = parser(state("aaab"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["a", "a", "a"]);
    }
  });

  it("should succeed with empty array if none match", () => {
    const parser = many(char("a"));
    const result = parser(state("bbb"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual([]);
    }
  });
});

describe("manyOne", () => {
  it("should require at least one match", () => {
    const parser = manyOne(char("a"));
    const result = parser(state("aaa"));

    expect(E.isRight(result)).toBe(true);
  });

  it("should fail if none match", () => {
    const parser = manyOne(char("a"));
    const result = parser(state("bbb"));

    expect(E.isLeft(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* manyTill                                                                   */
/* -------------------------------------------------------------------------- */

describe("manyTill", () => {
  it("should parse until end parser matches", () => {
    const parser = manyTill(char("!"))(char("a"));
    const result = parser(state("aaa!"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["a", "a", "a"]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* optional                                                                   */
/* -------------------------------------------------------------------------- */

describe("optional", () => {
  it("should return Some if parser succeeds", () => {
    const parser = optional(char("a"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(O.isSome(result.right.value)).toBe(true);
    }
  });

  it("should return None if parser fails", () => {
    const parser = optional(char("x"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(O.isNone(result.right.value)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* sepBy                                                                      */
/* -------------------------------------------------------------------------- */

describe("sepBy", () => {
  it("should parse separated values", () => {
    const parser = sepBy(char(","))(digit);
    const result = parser(state("1,2,3"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual(["1", "2", "3"]);
    }
  });

  it("should return empty array if first fails", () => {
    const parser = sepBy(char(","))(digit);
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toEqual([]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* orElse                                                                     */
/* -------------------------------------------------------------------------- */

describe("orElse", () => {
  it("should return first if success", () => {
    const parser = orElse(char("a"))(char("b"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* skip                                                                       */
/* -------------------------------------------------------------------------- */

describe("skip", () => {
  it("should ignore value", () => {
    const parser = skip(char("a"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBeUndefined();
    }
  });
});

/* -------------------------------------------------------------------------- */
/* before                                                                     */
/* -------------------------------------------------------------------------- */

describe("before", () => {
  it("should keep first value", () => {
    const parser = before(char("a"))(char("b"));
    const result = parser(state("ab"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* attempt                                                                    */
/* -------------------------------------------------------------------------- */

describe("attempt", () => {
  it("should reset state on failure", () => {
    const parser = attempt(char("x"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.state.index).toBe(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* label                                                                      */
/* -------------------------------------------------------------------------- */

describe("label", () => {
  it("should override error message", () => {
    const parser = label(char("x"), "Expected X");
    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.msg).toBe("Expected X");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* lazy                                                                       */
/* -------------------------------------------------------------------------- */

describe("lazy", () => {
  it("should defer parser execution", () => {
    const parser = lazy(() => char("a"));
    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
  });
});