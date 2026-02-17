import * as E from "fp-ts/Either";
import { pipe as fPipe } from "fp-ts/function";

export interface ParserError {
  type: string;
  msg: string;
  cause?: ParserError;
}

export type State<A> = E.Either<ParserError, A>;

export type Parser<AI, AO = AI> = (state: State<AI>) => State<AO>;

export const chain =
  <AO1, AO2>(fn: (value: AO1) => Parser<AO1, AO2>) =>
  <AI1>(parser: Parser<AI1, AO1>): Parser<AI1, AO2> =>
  (state: State<AI1>) => {
    const result = parser(state);

    if (E.isLeft(result)) {
      return E.left(result.left);
    }

    const nextParser = fn(result.right);
    const nextState: State<AO1> = E.right(result.right);

    return nextParser(nextState);
  };

export const attemptChain =
  <AO1, AO2>(fn: (state: State<AO1>) => Parser<AO1, AO2>) =>
  <AI1>(parser: Parser<AI1, AO1>): Parser<AI1, AO2> =>
  (state) => {
    const result = parser(state);

    const nextParser = fn(result);
    return nextParser(result);
  };

export const map =
  <AO1, AO2>(fn: (success: AO1) => AO2) =>
  <AI>(parser: Parser<AI, AO1>): Parser<AI, AO2> =>
  (state: State<AI>): State<AO2> =>
    E.map(fn)(parser(state));

export const mapError =
  (fn: (error: ParserError) => ParserError) =>
  <AI, AO>(parser: Parser<AI, AO>): Parser<AI, AO> =>
  (state: State<AI>): State<AO> =>
    E.mapLeft(fn)(parser(state));

export const bimap =
  <AI, AO1, AO2>(
    fn: (success: AO1) => AO2,
    eFn: (error: ParserError) => ParserError,
  ) =>
  (parser: Parser<AI, AO1>): Parser<AI, AO2> =>
    fPipe(parser, map(fn), mapError(eFn));

export const run =
  <AI>(input: AI) =>
  <AO>(parser: Parser<AI, AO>): E.Either<ParserError, AO> =>
    parser(E.right(input));

type In<P> = P extends Parser<infer A1, any> ? State<A1> : never;

type Out<P> = P extends Parser<any, infer A2> ? State<A2> : never;

type ParserChain<T extends Parser<any, any>[]> = T extends [
  infer P1,
  infer P2,
  ...infer Rest,
]
  ? P1 extends Parser<any, any>
    ? P2 extends Parser<any, any>
      ? [Out<P1>] extends [In<P2>]
        ? [
            P1,
            ...ParserChain<
              [P2, ...(Rest extends Parser<any, any>[] ? Rest : [])]
            >,
          ]
        : never
      : never
    : never
  : T;

type FirstInput<T extends Parser<any, any>[]> = T extends [infer P, ...any[]]
  ? In<P>
  : never;

type LastOutput<T extends Parser<any, any>[]> = T extends [...any[], infer P]
  ? Out<P>
  : never;

export function pipeParsers<T extends Parser<any, any>[]>(
  ...parsers: ParserChain<T>
) {
  return (state: FirstInput<T>): LastOutput<T> =>
    parsers.reduce((acc, p) => p(acc), state as any);
}

export const sequenceOf = <
  T extends Parser<any, any>[],
  ResultTuple extends readonly unknown[] = {
    [K in keyof T]: T[K] extends Parser<any, infer A> ? A : never;
  },
>(
  ...parsers: ParserChain<T>
): Parser<FirstInput<T> extends State<infer A1> ? A1 : never, ResultTuple> =>
  ((stateContainer: FirstInput<T>) => {
    let currentState = stateContainer;
    if (E.isLeft(currentState)) return E.left(currentState.left);
    let value = currentState.right;
    let results: unknown[] = [];
    for (const parser of parsers) {
      const next = parser(E.right(value));
      if (E.isLeft(next)) return E.left(next.left);
      value = next.right;
      results.push(value);
    }
    return E.right(results as unknown as ResultTuple);
  }) as Parser<FirstInput<T> extends State<infer A1> ? A1 : never, ResultTuple>;

export const between =
  <AI1, AO1, AO2, AO3>(
    leftParser: Parser<AI1, AO1>,
    rightParser: Parser<AO2, AO3>,
  ) =>
  (contentParser: Parser<AO1, AO2>) =>
    map((results: [AO1, AO2, AO3]) => results[1])(
      sequenceOf(leftParser, contentParser, rightParser),
    );

export type ChoiceError = {
  msg: string;
};

export const choice =
  <T extends Parser<any, any>[]>(
    ...parsers: T
  ): Parser<
    T[number] extends Parser<infer AI, any> ? AI : never,
    T[number] extends Parser<any, infer AO> ? AO : never
  > =>
  (
    stateContainer: State<T[number] extends Parser<infer AI, any> ? AI : never>,
  ) => {
    for (const parser of parsers) {
      const result = parser(stateContainer);
      if (E.isRight(result)) {
        return result as any;
      }
    }
    return E.left({
      type: "choice",
      msg: "choiceError",
    });
  };


export const many =
  <AI, AO extends AI>(parser: Parser<AI, AO>): Parser<AI, AO[]> =>
  (stateContainer: State<AI>) => {
    const results: AO[] = [];
    let currentState: State<AI> = stateContainer;

    while (true) {
      const next = parser(currentState);
      if (E.isLeft(next)) {
        return E.right(results);
      }
      results.push(next.right);
      currentState = E.right(next.right);
    }
  };

export const manyOne =
  <AI, AO extends AI>(parser: Parser<AI, AO>): Parser<AI, AO[]> =>
  (stateContainer) => {
    const result = many(parser)(stateContainer);

    if (E.isRight(result) && result.right.length > 0) {
      return result;
    }

    return E.left({
      type: "many",
      msg: "manyError",
    });
  };
