import * as E from "fp-ts/Either";
import {
  ok,
  fail,
  of,
  ofError,
  map,
  chain,
  ap,
  mapError,
  bimap,
} from "../src/monad";

import { Parser, Error } from "../src/types";

type TestState = { count: number };

const initialState: TestState = { count: 0 };

const sampleError = {
  type: "test",
  msg: "Something went wrong",
  position: { offset: 0 },
};

describe("Monad utilities", () => {
  /* ------------------------------------------------------------------------
   * ok / fail
   * ---------------------------------------------------------------------- */

  describe("ok", () => {
    it("should return a Right containing Success", () => {
      const result = ok(initialState, 42);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.state).toEqual(initialState);
        expect(result.right.value).toBe(42);
      }
    });
  });

  describe("fail", () => {
    it("should return a Left containing Error", () => {
      const result = fail(sampleError);

      expect(E.isLeft(result)).toBe(true);

      if (E.isLeft(result)) {
        expect(result.left).toEqual(sampleError);
      }
    });
  });

  /* ------------------------------------------------------------------------
   * of / ofError
   * ---------------------------------------------------------------------- */

  describe("of", () => {
    it("should lift a value without modifying state", () => {
      const parser = of(123);
      const result = parser(initialState);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.value).toBe(123);
        expect(result.right.state).toEqual(initialState);
      }
    });
  });

  describe("ofError", () => {
    it("should lift an error without modifying state", () => {
      const parser = ofError(sampleError);
      const result = parser(initialState);

      expect(E.isLeft(result)).toBe(true);

      if (E.isLeft(result)) {
        expect(result.left).toEqual(sampleError);
      }
    });
  });

  /* ------------------------------------------------------------------------
   * map
   * ---------------------------------------------------------------------- */

  describe("map", () => {
    it("should transform the successful value", () => {
      const parser: Parser<TestState, number> = of(10);

      const mapped = map((x: number) => x * 2)(parser);
      const result = mapped(initialState);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.value).toBe(20);
      }
    });

    it("should not transform errors", () => {
      const parser: Parser<TestState, number> = ofError(sampleError);

      const mapped = map((x: number) => x * 2)(parser);
      const result = mapped(initialState);

      expect(E.isLeft(result)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------------
   * chain
   * ---------------------------------------------------------------------- */

  describe("chain", () => {
    it("should sequence parsers", () => {
      const p1: Parser<TestState, number> = (state) =>
        ok({ count: state.count + 1 }, 5);

      const p2 = (value: number): Parser<TestState, number> => (state) =>
        ok({ count: state.count + 1 }, value * 2);

      const chained = chain(p2)(p1);
      const result = chained(initialState);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.value).toBe(10);
        expect(result.right.state.count).toBe(2);
      }
    });

    it("should short-circuit on error", () => {
      const p1: Parser<TestState, number> = ofError(sampleError);

      const p2 = (value: number): Parser<TestState, number> =>
        of(value * 2);

      const chained = chain(p2)(p1);
      const result = chained(initialState);

      expect(E.isLeft(result)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------------
   * ap
   * ---------------------------------------------------------------------- */

  describe("ap", () => {
    it("should apply a parser function to a parser value", () => {
      const pf: Parser<TestState, (x: number) => number> = of((x) => x + 3);
      const pa: Parser<TestState, number> = of(7);

      const applied = ap(pf)(pa);
      const result = applied(initialState);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.value).toBe(10);
      }
    });

    it("should propagate error from function parser", () => {
      const pf: Parser<TestState, (x: number) => number> =
        ofError(sampleError);
      const pa: Parser<TestState, number> = of(7);

      const applied = ap(pf)(pa);
      const result = applied(initialState);

      expect(E.isLeft(result)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------------
   * mapError
   * ---------------------------------------------------------------------- */

  describe("mapError", () => {
    it("should transform errors", () => {
      const parser: Parser<TestState, number> = ofError(sampleError);

      const transformed = mapError<TestState, number>((err:Error) => ({
        ...err,
        msg: "Transformed",
      }))(parser);

      const result = transformed(initialState);

      expect(E.isLeft(result)).toBe(true);

      if (E.isLeft(result)) {
        expect(result.left.msg).toBe("Transformed");
      }
    });

    it("should not modify success values", () => {
      const parser: Parser<TestState, number> = of(5);

      const transformed = mapError<TestState, number>((err) => ({
        ...err,
        msg: "Transformed",
      }))(parser);

      const result = transformed(initialState);

      expect(E.isRight(result)).toBe(true);

      if (E.isRight(result)) {
        expect(result.right.value).toBe(5);
      }
    });
  });

  /* ------------------------------------------------------------------------
   * bimap
   * ---------------------------------------------------------------------- */

  describe("bimap", () => {
    it("should transform both success and error", () => {
      const successParser: Parser<TestState, number> = of(3);

      const mappedSuccess = bimap<TestState, number, number>(
        (x: number) => x * 10,
        (err:Error) => err
      )(successParser);

      const successResult = mappedSuccess(initialState);

      expect(E.isRight(successResult)).toBe(true);
      if (E.isRight(successResult)) {
        expect(successResult.right.value).toBe(30);
      }

      const errorParser: Parser<TestState, number> = ofError(sampleError);

      const mappedError = bimap<TestState, number, number>(
        (x: number) => x * 10,
        (err) => ({ ...err, msg: "Changed" })
      )(errorParser);

      const errorResult = mappedError(initialState);

      expect(E.isLeft(errorResult)).toBe(true);
      if (E.isLeft(errorResult)) {
        expect(errorResult.left.msg).toBe("Changed");
      }
    });
  });
});