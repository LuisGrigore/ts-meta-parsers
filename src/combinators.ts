import { Parser, Success, Error } from "./types";
import { of, ap, map, chain, ok, fail } from "./monad";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as E from "fp-ts/Either";

/**
 * Parser combinators for building complex parsers from simple ones.
 * @module parser_combinator/combinators
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
 * Combines multiple parsers into a single parser that succeeds if all parsers succeed.
 * @param parsers - An array of parsers to combine.
 * @returns A parser that succeeds if all parsers succeed.
 */

export const between =
  <S, L, R>(leftParser: Parser<S, L>, rightParser: Parser<S, R>) =>
  <C>(contentParser: Parser<S, C>): Parser<S, C> =>
    map((results: [L, C, R]) => results[1])(
      sequenceOf(leftParser, contentParser, rightParser),
    );

/**
 * Tries each parser in sequence until one succeeds.
 * @param parsers - An array of parsers to try.
 * @returns A parser that returns the result of the first successful parser.
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
          msg: `No parser matched at index ${state.index}`,
          position: { offset: state.index },
          cause: errors.length === 1 ? errors[0] : errors,
        });
      }
      const [head, ...tail] = remaining;
      return E.match(
        (err:Error) => tryNext(tail, [...errors, err]),
        (success:Success<unknown,unknown>) => ok(success.state, success.value),
      )(head(state));
    };

    return tryNext(parsers);
  };

/**
 * Applies a parser zero or more times.
 * @param parser - The parser to apply.
 * @returns A parser that returns an array of results.
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
 * @param parser - The parser to apply.
 * @returns A parser that returns an array of results.
 */

export const manyOne = <S, A>(parser: Parser<S, A>): Parser<S, A[]> =>
  ap(map((head: A) => (tail: A[]) => [head, ...tail])(parser))(many(parser));

/**
 * Creates a parser that defers its execution until invoked.
 * @param fn - A function that returns a parser.
 * @returns A parser that executes the deferred parser.
 */

export const lazy =
  <S, A>(fn: () => Parser<S, A>): Parser<S, A> =>
  (state:S) =>
    fn()(state);

/**
 * Creates a parser that optionally applies another parser.
 * @param parser - The parser to apply.
 * @returns A parser that returns an option of the result.
 */

export const optional =
  <S, A>(parser: Parser<S, A>): Parser<S, O.Option<A>> =>
  (state: S) =>
    pipe(
      parser(state),
      E.match(
        () => ok<S, O.Option<A>>(state, O.none),
        (success) =>
          ok<S, O.Option<A>>(success.state, O.some(success.value)),
      )
    );

/**
 * Parses a value separated by a specified separator.
 * @param sep - The separator parser.
 * @returns A parser that returns an array of results.
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


export const orElse =
  <S, A>(p1: Parser<S, A>) =>
  (p2: Parser<S, A>): Parser<S, A> =>
    choice(p1, p2);

export const skip =
  <S, A>(parser: Parser<S, A>): Parser<S, void> =>
    map(() => undefined)(parser);

export const before =
  <S, A, B>(pa: Parser<S, A>) =>
  (pb: Parser<S, B>): Parser<S, A> =>
    chain((a:A) => map(() => a)(pb))(pa);

export const manyTill =
  <S, A, B>(end: Parser<S, B>) =>
  (parser: Parser<S, A>): Parser<S, A[]> =>
    choice(
      chain(() => of<A[]>([]))(end),
      chain((value: A) =>
        map((rest: A[]) => [value, ...rest])(
          lazy(() => manyTill(end)(parser) as Parser<S, A[]>)
        )
      )(parser)
    );

export const attempt = <S, A>(parser: Parser<S, A>): Parser<S, A> =>
  (state: S) => {
    const result = parser(state);
    if (E.isLeft(result)) return ok(state, undefined as any);
    return result;
  };

export const label = <S, A>(parser: Parser<S, A>, msg: string): Parser<S, A> =>
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