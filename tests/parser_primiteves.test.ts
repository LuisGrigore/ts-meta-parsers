import * as E from "fp-ts/Either";
import {
  satisfy,
  matchElem,
  oneOf,
  noneOf,
} from "../src/parser_primitives";

import { IterableParserState } from "../src/types";

/* -------------------------------------------------------------------------- */
/* Test State                                                                 */
/* -------------------------------------------------------------------------- */

type TestState<I extends Iterable<any>> = IterableParserState<I>;

const state = <I extends Iterable<any>>(
  input: I,
  index = 0
): TestState<I> => ({
  input,
  index,
});

/* -------------------------------------------------------------------------- */
/* satisfy                                                                    */
/* -------------------------------------------------------------------------- */

describe("satisfy", () => {
  it("should succeed when predicate matches", () => {
    const parser = satisfy<string, string>((c) => c === "a");

    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail when predicate does not match", () => {
    const parser = satisfy<string, string>((c) => c === "b");

    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.type).toBe("satisfy");
      expect(result.left.position?.offset).toBe(0);
    }
  });

  it("should fail on end of input", () => {
    const parser = satisfy<string, string>(() => true);

    const result = parser(state("", 0));

    expect(E.isLeft(result)).toBe(true);
  });

  it("should work with arrays (generic iterable)", () => {
    const parser = satisfy<number[], number>((n) => n === 1);

    const result = parser(state([1, 2, 3]));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe(1);
      expect(result.right.state.index).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* matchElem                                                                  */
/* -------------------------------------------------------------------------- */

describe("matchElem", () => {
  it("should match exact element", () => {
    const parser = matchElem<string, string>("a");

    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if element does not match", () => {
    const parser = matchElem<string, string>("x");

    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
  });

  it("should work with number arrays", () => {
    const parser = matchElem<number[], number>(2);

    const result = parser(state([2, 3, 4]));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe(2);
      expect(result.right.state.index).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* oneOf                                                                      */
/* -------------------------------------------------------------------------- */

describe("oneOf", () => {
  it("should succeed if element is in allowed list", () => {
    const parser = oneOf<string, string>(["a", "b", "c"]);

    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if element is not in allowed list", () => {
    const parser = oneOf<string, string>(["x", "y"]);

    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
  });

  it("should work with custom equality comparator", () => {
    type Token = { type: string };

    const equals = (a: Token, b: Token) => a.type === b.type;

    const parser = oneOf<Token, Token[]>(
      [{ type: "PLUS" }],
      equals,
    );

    const result = parser(
      state([{ type: "PLUS" }, { type: "MINUS" }]),
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value.type).toBe("PLUS");
      expect(result.right.state.index).toBe(1);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* noneOf                                                                     */
/* -------------------------------------------------------------------------- */

describe("noneOf", () => {
  it("should succeed if element is NOT in disallowed list", () => {
    const parser = noneOf<string, string>(["x", "y"]);

    const result = parser(state("abc"));

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value).toBe("a");
      expect(result.right.state.index).toBe(1);
    }
  });

  it("should fail if element is in disallowed list", () => {
    const parser = noneOf<string, string>(["a", "b"]);

    const result = parser(state("abc"));

    expect(E.isLeft(result)).toBe(true);
  });

  it("should work with custom equality comparator", () => {
    type Token = { type: string };

    const equals = (a: Token, b: Token) => a.type === b.type;

    const parser = noneOf<Token, Token[]>(
      [{ type: "PLUS" }],
      equals,
    );

    const result = parser(
      state([{ type: "MINUS" }]),
    );

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.value.type).toBe("MINUS");
      expect(result.right.state.index).toBe(1);
    }
  });
});