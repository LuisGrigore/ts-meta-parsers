import * as E from "fp-ts/Either";
import { Lazy, pipe as fPipe } from "fp-ts/function";

export type ParserError = {
  msg: string;
  cause: ParserError;
};

export type StateContainer<E, A> = Lazy<E.Either<E, A>>;

export type Parser<EI, AI, EO = EI, AO = AI> = (
  state: StateContainer<EI, AI>,
) => StateContainer<EO, AO>;

export const chain =
  <EI2, AO1, EO2, AO2>(
    fn: (value: AO1) => Parser<EI2, AO1, EO2, AO2>
  ) =>
  <EI1, AI1, EO1>(
    parser: Parser<EI1, AI1, EO1, AO1>
  ): Parser<EI1, AI1, EO1 | EO2, AO2> =>
  (state: StateContainer<EI1, AI1>) => () => {
    const result = parser(state)();

    if (E.isLeft(result)) {
      return E.left(result.left);
    }

    const nextParser = fn(result.right);
    const nextState: StateContainer<EI2, AO1> = () => E.right(result.right);

    return nextParser(nextState)();
  };


export const attemptChain =
  <EO1, AO1, EO2, AO2>(
    fn: (state: StateContainer<EO1, AO1>) => Parser<EO1, AO1, EO2, AO2>
  ) =>
  <EI1, AI1>(
    parser: Parser<EI1, AI1, EO1, AO1>
  ): Parser<EI1, AI1, EO1 | EO2, AO2> =>
  (state) => () => {
    const result = parser(state)();

    const nextParser = fn(() => result);
    return nextParser(() => result)();
  };


export const map =
  <AO1, AO2>(fn: (stateContainer: AO1) => AO2) =>
  <EI, AI, EO>(parser: Parser<EI, AI, EO, AO1>): Parser<EI, AI, EO, AO2> =>
  (state: StateContainer<EI, AI>): StateContainer<EO, AO2> =>
  () =>
    E.map(fn)(parser(state)());

export const mapError =
  <EO1, EO2>(fn: (stateContainer: EO1) => EO2) =>
  <EI, AI, AO>(parser: Parser<EI, AI, EO1, AO>): Parser<EI, AI, EO2, AO> =>
  (state: StateContainer<EI, AI>): StateContainer<EO2, AO> =>
  () =>
    E.mapLeft(fn)(parser(state)());

export const bimap =
  <EI, AI, EO1, EO2, AO1, AO2>(fn: (a: AO1) => AO2, eFn: (e: EO1) => EO2) =>
  (parser: Parser<EI, AI, EO1, AO1>): Parser<EI, AI, EO2, AO2> =>
    fPipe(parser, map(fn), mapError(eFn));

export const run =
  <AI>(input: AI) =>
  <EI, EO, AO>(parser: Parser<EI, AI, EO, AO>): E.Either<EO, AO> =>
    parser(() => E.right(input))();

type In<P> =
  P extends Parser<infer E1, infer A1, any, any>
    ? StateContainer<E1, A1>
    : never;

type Out<P> =
  P extends Parser<any, any, infer E2, infer A2>
    ? StateContainer<E2, A2>
    : never;

type ParserChain<T extends Parser<any, any, any, any>[]> = T extends [
  infer P1,
  infer P2,
  ...infer Rest,
]
  ? P1 extends Parser<any, any, any, any>
    ? P2 extends Parser<any, any, any, any>
      ? [Out<P1>] extends [In<P2>]
        ? [
            P1,
            ...ParserChain<
              [P2, ...(Rest extends Parser<any, any, any, any>[] ? Rest : [])]
            >,
          ]
        : never
      : never
    : never
  : T;

type FirstInput<T extends Parser<any, any, any, any>[]> = T extends [
  infer P,
  ...any[],
]
  ? In<P>
  : never;

type LastOutput<T extends Parser<any, any, any, any>[]> = T extends [
  ...any[],
  infer P,
]
  ? Out<P>
  : never;

export function pipeParsers<T extends Parser<any, any, any, any>[]>(
  ...parsers: ParserChain<T>
) {
  return (state: FirstInput<T>): LastOutput<T> =>
    parsers.reduce((acc, p) => p(acc), state as any);
}

export const sequenceOf = <
  T extends Parser<any, any, any, any>[],
  ResultTuple extends readonly unknown[] = {
    [K in keyof T]: T[K] extends Parser<any, any, any, infer A> ? A : never;
  },
>(
  ...parsers: ParserChain<T>
): Parser<
  FirstInput<T> extends StateContainer<infer E1, any> ? E1 : never,
  FirstInput<T> extends StateContainer<any, infer A1> ? A1 : never,
  LastOutput<T> extends StateContainer<infer E2, any> ? E2 : never,
  ResultTuple
> =>
  ((stateContainer: FirstInput<T>) => () => {
    let currentState = stateContainer();
    if (E.isLeft(currentState)) return E.left(currentState.left);
    let value = currentState.right;
    let results: unknown[] = [];
    for (const parser of parsers) {
      const next = parser(() => E.right(value))();
      if (E.isLeft(next)) return E.left(next.left);
      value = next.right;
      results.push(value);
    }
    return E.right(results as unknown as ResultTuple);
  }) as Parser<
    FirstInput<T> extends StateContainer<infer E1, any> ? E1 : never,
    FirstInput<T> extends StateContainer<any, infer A1> ? A1 : never,
    LastOutput<T> extends StateContainer<infer E2, any> ? E2 : never,
    ResultTuple
  >;

export const between =
  <EI1, AI1, EO1, AO1, EO2, AO2, EO3, AO3>(
    leftParser: Parser<EI1, AI1, EO1, AO1>,
    rightParser: Parser<EO2, AO2, EO3, AO3>,
  ) =>
  (contentParser: Parser<EO1, AO1, EO2, AO2>) =>
    map((results: [AO1, AO2, AO3]) => results[1])(
      sequenceOf(leftParser, contentParser, rightParser),
    );

export type ChoiceError = {
  msg: string;
};

export const choice =
  <T extends Parser<any, any, any, any>[]>(
    ...parsers: T
  ): Parser<
    T[number] extends Parser<infer EI, any, any, any> ? EI : never,
    T[number] extends Parser<any, infer AI, any, any> ? AI : never,
    ChoiceError,
    T[number] extends Parser<any, any, any, infer AO> ? AO : never
  > =>
  (
    stateContainer: StateContainer<
      T[number] extends Parser<infer EI, any, any, any> ? EI : never,
      T[number] extends Parser<any, infer AI, any, any> ? AI : never
    >,
  ) =>
  () => {
    for (const parser of parsers) {
      const result = parser(stateContainer)();
      if (E.isRight(result)) {
        return result as any;
      }
    }
    return E.left({ errors: "aaaaa" });
  };

export type ManyError = {
  msg: string;
};

export const many =
  <EI, AI, EO extends EI, AO extends AI>(
    parser: Parser<EI, AI, EO, AO>,
  ): Parser<EI, AI, never, AO[]> =>
  (stateContainer: StateContainer<EI, AI>) =>
  () => {
    const results: AO[] = [];
    let currentState: StateContainer<EI, AI> = stateContainer;

    while (true) {
      const next = parser(currentState)();
      if (E.isLeft(next)) {
        return E.right(results);
      }
      results.push(next.right);
      currentState = () => E.right(next.right);
    }
  };

export const manyOne =
  <EI, AI, EO extends EI, AO extends AI>(
    parser: Parser<EI, AI, EO, AO>,
  ): Parser<EI, AI, ManyError, AO[]> =>
  (stateContainer) =>
  () => {
    const result = many(parser)(stateContainer)();

    if (E.isRight(result) && result.right.length > 0) {
      return result;
    }

    return E.left({
      msg: "manyOne: expected at least one match",
    });
  };
