import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

export interface ParserError {
  type: string;
  msg: string;
  cause?: ParserError;
}

export type ParserSuccess<State, Value> = { state: State; value: Value };

export type Result<State, Value> = E.Either<
  ParserError,
  ParserSuccess<State, Value>
>;

export const ok = <S, V>(state: S, value: V): Result<S, V> =>
  E.right({ state:state, value:value });

export const fail = <S, V>(error: ParserError): Result<S, V> => E.left(error);

type FoldResult = {
  <State, Value, A>(
    fn: (state: State, value: Value) => A,
    errFn: (error: ParserError) => A,
  ): (result: Result<State, Value>) => A;

  <State, Value, A>(
    fn: (success: ParserSuccess<State, Value>) => A,
    errFn: (error: ParserError) => A,
  ): (result: Result<State, Value>) => A;
};

export const foldResult: FoldResult =
  <State, Value, A>(
    fn:
      | ((state: State, value: Value) => A)
      | ((success: ParserSuccess<State, Value>) => A),
    errFn: (error: ParserError) => A,
  ) =>
  (result: Result<State, Value>) =>
    E.fold(
      errFn,
      (success: ParserSuccess<State,Value>) =>
        fn.length === 1
          ? (fn as (s: ParserSuccess<State, Value>) => A)(success)
          : (fn as (s: State, v: Value) => A)(
              success.state,
              success.value,
            ),
    )(result);


//const nextResult = <State, Value>(state: State, value: Value) => (result: Result<State, Value>) => fold(())

export type Parser<State, Value> = (state: State) => Result<State, Value>;

// export const chain =
//   <State, ValueA, ValueB>(fn: (value: ValueA) => Parser<State, ValueB>) =>
//   (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
//   (state: State) => {
//     const result = parser(state);
//     if (E.isLeft(result)) {
//       return result;
//     }
//     const { state: nextState, value: value } = result.right;
//     return fn(value)(nextState);
//   };

export const chain =
  <State, ValueA, ValueB>(fn: (value: ValueA) => Parser<State, ValueB>) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
  (state: State) =>
    pipe(
      parser(state),
      foldResult(
        (nextState, value) => fn(value)(nextState),
        (err) => fail(err),
      ),
    );

// export const attemptChain =
//   <AO1, AO2>(fn: (state: Result<AO1>) => Parser<AO1, AO2>) =>
//   <AI1>(parser: Parser<AI1, AO1>): Parser<AI1, AO2> =>
//   (state) => {
//     const result = parser(state);

//     const nextParser = fn(result);
//     return nextParser(result);
//   };

export const map =
  <ValueA, ValueB>(fn: (value: ValueA) => ValueB) =>
  <State>(parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    chain<State, ValueA, ValueB>(
      (value) => (state) => E.right({ state: state, value: fn(value) }),
    )(parser);

export const mapError =
  <State, Value>(fn: (error: ParserError) => ParserError) =>
  (parser: Parser<State, Value>): Parser<State, Value> =>
  (state: State) => {
    const result = parser(state);

    if (E.isLeft(result)) {
      return E.left(fn(result.left));
    }

    return result;
  };

export const bimap =
  <State, ValueA, ValueB>(
    fn: (success: ValueA) => ValueB,
    eFn: (error: ParserError) => ParserError,
  ) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    pipe(parser, map(fn), mapError(eFn));

export const run =
  <State>(input: State) =>
  <Value>(parser: Parser<State, Value>): Result<State, Value> =>
    parser(input);

// type State<P> = P extends Parser<infer State, any> ? Result<State,any> : never;

// type Out<P> = P extends Parser<any, infer A2> ? Result<A2> : never;

// type ParserChain<T extends Parser<any, any>[]> = T extends [
//   infer P1,
//   infer P2,
//   ...infer Rest,
// ]
//   ? P1 extends Parser<any, any>
//     ? P2 extends Parser<any, any>
//       ? [Out<P1>] extends [State<P2>]
//         ? [
//             P1,
//             ...ParserChain<
//               [P2, ...(Rest extends Parser<any, any>[] ? Rest : [])]
//             >,
//           ]
//         : never
//       : never
//     : never
//   : T;

// type FirstInput<T extends Parser<any, any>[]> = T extends [infer P, ...any[]]
//   ? State<P>
//   : never;

// type LastOutput<T extends Parser<any, any>[]> = T extends [...any[], infer P]
//   ? Out<P>
//   : never;

type ParserState<P> = P extends Parser<infer S, any> ? S : never;

type ParserValue<P> = P extends Parser<any, infer A> ? A : never;

type ParserStateIntersection<T extends readonly Parser<any, any>[]> =
  T extends readonly [infer P, ...infer Rest]
    ? P extends Parser<any, any>
      ? Rest extends readonly Parser<any, any>[]
        ? ParserState<P> & ParserStateIntersection<Rest>
        : ParserState<P>
      : never
    : unknown;

type ParserValueIntersection<T extends readonly Parser<any, any>[]> =
  T extends readonly [infer P, ...infer Rest]
    ? P extends Parser<any, any>
      ? Rest extends readonly Parser<any, any>[]
        ? ParserValue<P> & ParserValueIntersection<Rest>
        : ParserValue<P>
      : never
    : unknown;

// type ParserChain<T extends Parser<any, any>[]> =
//   T extends [infer P1, infer P2, ...infer Rest]
//     ? P1 extends Parser<any, any>
//       ? P2 extends Parser<any, any>
//         ? ParserState<P1> extends ParserState<P2>
//           ? [
//               P1,
//               ...ParserChain<
//                 [P2, ...(Rest extends Parser<any, any>[] ? Rest : [])]
//               >
//             ]
//           : never
//         : never
//       : never
//     : T;

// type FirstState<T extends Parser<any, any>[]> =
//   T extends [infer P, ...any[]]
//     ? ParserState<P>
//     : never;

// type LastValue<T extends Parser<any, any>[]> =
//   T extends [...any[], infer P]
//     ? ParserValue<P>
//     : never;

// export function pipeParsers<T extends Parser<any, any>[]>(
//   ...parsers: ParserChain<T>
// ) {
//   return (state: FirstInput<T>): LastOutput<T> =>
//     parsers.reduce((acc, p) => p(acc), state as any);
// }

type ValuesOf<T extends /*readonly*/ Parser<any, any>[]> = {
  [K in keyof T]: ParserValue<T[K]>;
};

type SameState<T extends readonly Parser<any, any>[]> = T extends readonly [
  infer P,
  ...infer Rest,
]
  ? P extends Parser<infer S, any>
    ? Rest[number] extends Parser<S, any>
      ? T
      : never
    : never
  : never;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

// type StateUnion<P extends readonly Parser<any, any>[]> = UnionToIntersection<
//   ParserState<P[number]>
// >;

export const sequenceOf =
  <const T extends /*readonly*/ Parser<any, any>[]>(
    ...parsers: T
  ): Parser<ParserStateIntersection<T>, ValuesOf<T>> =>
  (initialState) => {
    let currentState = initialState;
    const results: unknown[] = [];

    for (const parser of parsers) {
      const res = parser(currentState);

      if (E.isLeft(res)) {
        return res;
      }

      results.push(res.right.value);
      currentState = res.right.state;
    }

    return ok(currentState, results as ValuesOf<T>);
  };

export const between =
  <StateL, StateR, L, R>(
    leftParser: Parser<StateL, L>,
    rightParser: Parser<StateR, R>,
  ) =>
  <A, StateC>(
    contentParser: Parser<StateC, A>,
  ): Parser<StateL & StateR & StateC, A> =>
    map((results: [L, A, R]) => results[1])(
      sequenceOf(leftParser, contentParser, rightParser),
    );

// export const between =
//   <State, L, R>(leftParser: Parser<State, L>, rightParser: Parser<State, R>) =>
//   <A>(contentParser: Parser<State, A>): Parser<State, A> =>
//     map((results: [L, A, R]) => results[1])(
//       sequenceOf(leftParser, contentParser, rightParser),
//     );

//type ParserValue<P> = P extends Parser<any, infer V> ? V : never;

// export const choice = <S, T extends /*readonly*/ Parser< S, any>[]>(
//   ...parsers: T
// ) => {
//   return (state: S) => {
//     const errors: ParserError[] = [];

//     for (const parser of parsers) {
//       const result = parser(state);

//       if (E.isRight(result)) {
//         return result as Result<S, ParserValue<T[number]>>;
//       }

//       errors.push(result.left);
//     }

//     return fail({
//       type: "choice",
//       msg: "No parser matched in choice",
//       cause:
//         errors.length === 1
//           ? errors[0]
//           : {
//               type: "multiple",
//               msg: "Multiple choice errors",
//               cause: undefined,
//             },
//     });
//   };
// }

export const choice =
  <const T extends readonly Parser<any, any>[]>(
    ...parsers: T
  ): Parser<ParserStateIntersection<T>, ParserValue<T[number]>> =>
  (state) => {
    const errors: ParserError[] = [];

    for (const parser of parsers) {
      const result = parser(state);

      if (E.isRight(result)) {
        return result;
      }

      errors.push(result.left);
    }

    return fail({
      type: "choice",
      msg: "No parser matched in choice",
      cause:
        errors.length === 1
          ? errors[0]
          : {
              type: "multiple",
              msg: "Multiple choice errors",
              cause: undefined,
            },
    });
  };

export const many =
  <S, A>(parser: Parser<S, A>): Parser<S, readonly A[]> =>
  (state: S) => {
    const results: A[] = [];
    let currentState: S = state;

    while (true) {
      const next = parser(currentState);

      if (E.isLeft(next)) {
        // no hay más elementos, terminamos
        return ok(currentState, results as readonly A[]);
      }

      results.push(next.right.value);
      currentState = next.right.state;
    }
  };

export const manyOne =
  <S, A>(parser: Parser<S, A>): Parser<S, readonly A[]> =>
  (state: S) => {
    const results: A[] = [];
    let currentState: S = state;
    const errors: ParserError[] = [];

    while (true) {
      const next = parser(currentState);

      if (E.isLeft(next)) {
        errors.push(next.left);

        // Si no hemos obtenido ningún resultado, fallamos con error explícito
        if (results.length === 0) {
          return fail({
            type: "manyOne",
            msg: "Expected at least one successful parse",
            cause:
              errors.length === 1
                ? errors[0]
                : {
                    type: "multiple",
                    msg: "Multiple parse failures",
                    cause: undefined,
                  },
          });
        }

        // Termina la iteración y devuelve los resultados acumulados
        return ok(currentState, results as readonly A[]);
      }

      results.push(next.right.value);
      currentState = next.right.state;
    }
  };
