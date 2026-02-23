/**
 * Parser combinators for building complex parsers from simple ones.
 * @module parser_combinator/combinators
 */

import { Parser, Success, Error } from "./types";
import { of, ap, map, chain, ok, fail } from "./monad";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";

/* --------------------------------------------------------------------------
 * Basic Combinators
 * -------------------------------------------------------------------------- */

/**
 * Combines multiple parsers in sequence.
 * Returns an array of all parsed values.
 */
export const sequenceOf = <T extends Parser<any, any>[]>(
  ...parsers: T
): Parser<
  T extends Parser<infer S, any>[] ? S : never,
  { [K in keyof T]: T[K] extends Parser<any, infer V> ? V : never }
> =>
  pipe(
    of([]) as Parser<any, any[]>,
    (init) =>
      parsers.reduce(
        (acc, parser) =>
          ap(map((arr: any[]) => (v: any) => [...arr, v])(acc))(parser),
        init,
      ) as any,
  );

/**
 * Wraps a parser between two other parsers.
 * Useful for parentheses or brackets.
 */
export const between =
  <S, L, R>(left: Parser<S, L>, right: Parser<S, R>) =>
  <C>(content: Parser<S, C>): Parser<S, C> =>
    map(([_, value, __]: [L, C, R]) => value)(sequenceOf(left, content, right));

/**
 * Tries parsers one by one until one succeeds.
 * Returns the first successful parser's value.
 */
export const choice =
  <T extends Parser<any, any>[]>(
    ...parsers: T
  ): Parser<
    T extends Parser<infer S, any>[] ? S : never,
    T[number] extends Parser<any, infer V> ? V : never
  > =>
  (state) => {
    const tryNext = (
      remaining: Parser<any, any>[],
      errors: Error[] = [],
    ): E.Either<any, any> => {
      if (remaining.length === 0) {
        return fail({
          type: "choice",
          msg: `No parser matched at index ${(state as any).index}`,
          position: { offset: (state as any).index },
          cause: errors.length === 1 ? errors[0] : errors,
        });
      }
      const [head, ...tail] = remaining;
      return E.match(
        (err: Error) => tryNext(tail, [...errors, err]),
        (success: Success<unknown, unknown>) =>
          ok(success.state, success.value),
      )(head(state));
    };
    return tryNext(parsers);
  };

/* --------------------------------------------------------------------------
 * Repetition Combinators
 * -------------------------------------------------------------------------- */

/**
 * Applies a parser zero or more times.
 * Returns an array of results.
 */
export const many = <S, A>(parser: Parser<S, A>): Parser<S, A[]> => {
  const recur: Parser<S, A[]> = (state: S) =>
    E.match(
      () => of<A[]>([])(state),
      (success: Success<S, A>) =>
        map((rest: A[]) => [success.value, ...rest])(recur)(success.state),
    )(parser(state));
  return recur;
};

/**
 * Applies a parser one or more times.
 * Returns an array of results.
 */
export const manyOne = <S, A>(parser: Parser<S, A>): Parser<S, A[]> =>
  ap(map((head: A) => (tail: A[]) => [head, ...tail])(parser))(many(parser));

/**
 * Applies a parser repeatedly until an end parser matches.
 */
export const manyTill =
  <S, A, B>(end: Parser<S, B>) =>
  (parser: Parser<S, A>): Parser<S, A[]> =>
    choice(
      chain(() => of<A[]>([]))(end),
      chain((value: A) =>
        map((rest: A[]) => [value, ...rest])(
          lazy(() => manyTill(end)(parser) as Parser<S, A[]>),
        ),
      )(parser),
    );

/* --------------------------------------------------------------------------
 * Utility Combinators
 * -------------------------------------------------------------------------- */

/**
 * Defers parser execution (lazy parser) to allow recursion.
 */
export const lazy =
  <S, A>(fn: () => Parser<S, A>): Parser<S, A> =>
  (state: S) =>
    fn()(state);

/**
 * Makes a parser optional, returning Option<A>.
 */
export const optional =
  <S, A>(parser: Parser<S, A>): Parser<S, O.Option<A>> =>
  (state: S) =>
    pipe(
      parser(state),
      E.match(
        () => ok<S, O.Option<A>>(state, O.none),
        (success) => ok<S, O.Option<A>>(success.state, O.some(success.value)),
      ),
    );

/**
 * Parses values separated by a specific separator.
 */
export const sepBy =
  <S, A, B>(sep: Parser<S, B>) =>
  (parser: Parser<S, A>): Parser<S, A[]> =>
  (state: S) =>
    E.match(
      () => of<A[]>([])(state),
      (success: Success<S, A>) =>
        map((rest: A[]) => [success.value, ...rest])(
          many((s: S) => chain(() => parser)(sep)(s)),
        )(success.state),
    )(parser(state));

/**
 * Returns the first parser if it succeeds, otherwise the second.
 */
export const orElse =
  <S, A>(p1: Parser<S, A>) =>
  (p2: Parser<S, A>): Parser<S, A> =>
    choice(p1, p2);

/**
 * Ignores the value of a parser, returning void.
 */
export const skip = <S, A>(parser: Parser<S, A>): Parser<S, void> =>
  map(() => undefined)(parser);

/**
 * Returns the value of the first parser, ignoring the second.
 */
export const before =
  <S, A, B>(pa: Parser<S, A>) =>
  (pb: Parser<S, B>): Parser<S, A> =>
    chain((a: A) => map(() => a)(pb))(pa);

/* --------------------------------------------------------------------------
 * Backtracking and Error Utilities
 * -------------------------------------------------------------------------- */

/**
 * Runs a parser but ignores failure (resets state if failed).
 */
export const attempt =
  <S, A>(parser: Parser<S, A>): Parser<S, A> =>
  (state: S) => {
    const result = parser(state);
    if (E.isLeft(result)) return ok(state, undefined as any);
    return result;
  };

/**
 * Labels a parser to improve error messages.
 */
export const label =
  <S, A>(parser: Parser<S, A>, msg: string): Parser<S, A> =>
  (state: S) => {
    const result = parser(state);
    if (E.isLeft(result)) {
      return fail({
        type: "label",
        msg,
        cause: result.left,
        position: (result.left as any).position,
      });
    }
    return result;
  };
