import { Parser } from "./types";
import * as R from "./result";
import { of, ap, map, fold, chain } from "./monad";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";

// export const sequenceOf =
//   <T extends readonly Parser<any, any>[]>(
//     ...parsers: T
//   ): Parser<
//     T extends readonly Parser<infer S, any>[] ? S : never,
//     { [K in keyof T]: T[K] extends Parser<any, infer V> ? V : never }
//   > =>
//   (state) => {
//     let currentState = state;
//     const values: any[] = [];
//     for (const parser of parsers) {
//       const result = parser(currentState);
//       if (E.isLeft(result)) return R.fail(result.left);
//       currentState = result.right.state;
//       values.push(result.right.value);
//     }
//     return ok(currentState, values as any);
//   };

export const sequenceOf = <T extends readonly Parser<any, any>[]>(
  ...parsers: T
): Parser<
  T extends readonly Parser<infer S, any>[] ? S : never,
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

export const between =
  <S, L, R>(leftParser: Parser<S, L>, rightParser: Parser<S, R>) =>
  <C>(contentParser: Parser<S, C>): Parser<S, C> =>
    map((results: [L, C, R]) => results[1])(
      sequenceOf(leftParser, contentParser, rightParser),
    );

export const choice =
  <T extends Parser<any, any>[]>(
    ...parsers: T
  ): Parser<
    T extends readonly Parser<infer S, any>[] ? S : never,
    T[number] extends Parser<any, infer V> ? V : never
  > =>
  (state) => {
    const tryNext = (
      remaining: Parser<any, any>[],
      errors: R.Error[] = [],
    ): R.Result<any, any> => {
      if (remaining.length === 0) {
        return R.fail({
          type: "choice",
          msg: `No parser matched at index ${state.index}`,
          position: { offset: state.index },
          cause: errors.length === 1 ? errors[0] : errors,
        });
      }
      const [head, ...tail] = remaining;
      return fold(
        (success) => R.ok(success.state, success.value),
        (err) => tryNext(tail, [...errors, err]),
      )(head)(state);
    };

    return tryNext(parsers);
  };

// export const many =
//   <S, A>(parser: Parser<S, A>): Parser<S, readonly A[]> =>
//   (state: S) => {
//     const results: A[] = [];
//     let currentState: S = state;

//     while (true) {
//       const next = parser(currentState);

//       if (E.isLeft(next)) {
//         // no hay más elementos, terminamos
//         return ok(currentState, results as readonly A[]);
//       }

//       results.push(next.right.value);
//       currentState = next.right.state;
//     }
//   };

export const many = <S, A>(parser: Parser<S, A>): Parser<S, A[]> => {
  const recur: Parser<S, A[]> = (state: S) =>
    fold(
      (success: R.Success<S, A>) =>
        map((rest: A[]) => [success.value, ...rest])(recur)(success.state),
      () => of<A[]>([])(state),
    )(parser)(state);
  return recur;
};

export const manyOne = <S, A>(parser: Parser<S, A>): Parser<S, A[]> =>
  ap(map((head: A) => (tail: A[]) => [head, ...tail])(parser))(many(parser));

export const lazy =
  <S, A>(fn: () => Parser<S, A>): Parser<S, A> =>
  (state) =>
    fn()(state);

export const optional = <S, A>(parser: Parser<S, A>): Parser<S, O.Option<A>> =>
  map((success: A) => O.some(success))(parser);

export const sepBy = <S, A, B>(sep: Parser<S, B>) => (parser: Parser<S, A>): Parser<S, A[]> => (state: S) =>
  fold(
    (success: R.Success<S, A>) =>
      map((rest: A[]) => [success.value, ...rest])(
        many((s: S) =>
          chain(() => parser)(sep)(s)
        )
      )(success.state),
    () => of<A[]>([])(state)
  )(parser)(state);