/**
 * Primitive and basic parsers for parser combinators.
 * Uses a unified state object to allow future expandability.
 * @module parser_combinator/primitives
 */

import { ok, fail } from "./monad";
import { Parser, IterableParserState } from "./types";

export const satisfy =
  <I extends Iterable<any>, T = any>(
    predicate: (elem: T) => boolean,
    errMsg?: string,
  ): Parser<IterableParserState<I>, T> =>
  (state) => {
    const elem = (state.input as any)[state.index] as T;

    if (elem !== undefined && predicate(elem)) {
      return ok({ ...state, index: state.index + 1 }, elem);
    }

    return fail({
      type: "satisfy",
      msg: errMsg ?? `Unexpected element '${elem}'`,
      position: { offset: state.index },
    });
  };

export const matchElem = <I extends Iterable<any>, T>(
  elem: T,
): Parser<IterableParserState<I>, T> =>
  satisfy<I, T>((x) => x === elem, `Expected '${elem}'`);

export const oneOf = <T, I extends Iterable<T>>(
  elems: readonly T[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): Parser<IterableParserState<I>, T> =>
  satisfy<I, T>(
    (c) => elems.some((e) => equals(e, c)),
    `Expected one of: ${String(elems)}`,
  );

export const noneOf = <T, I extends Iterable<T>>(
  elems: readonly T[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): Parser<IterableParserState<I>, T> =>
  satisfy<I, T>(
    (c) => !elems.some((e) => equals(e, c)),
    `Unexpected element from: ${String(elems)}`,
  );
