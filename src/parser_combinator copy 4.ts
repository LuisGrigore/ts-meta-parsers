import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";

export interface ParserError {
  type: string;
  msg: string;
  position?: { line: number; col: number; offset: number };
  cause?: ParserError | ParserError[];
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

export type Parser<State, Value> = (state: State) => Result<State, Value>;

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

export const mapState = <S, A>(fn: (s: S) => S) => (parser: Parser<S, A>): Parser<S, A> =>
  (state) => pipe(parser(state), E.map(({ state: s, value }) => ({ state: fn(s), value })));

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

export const lazy = <S, A>(fn: () => Parser<S, A>): Parser<S, A> =>
  (state) => fn()(state);

export const optional = <S, A>(parser: Parser<S, A>): Parser<S, A | null> =>
  (state) => {
    const result = parser(state);
    return E.isRight(result) ? result : ok(state, null);
  };

export const sepBy = <S, A, B>(sep: Parser<S, B>) => (parser: Parser<S, A>): Parser<S, readonly A[]> =>
  (state) => {
    const first = parser(state);
    if (E.isLeft(first)) return ok(state, []);
    const results = [first.right.value];
    let cur = first.right.state;
    while (true) {
      const s = sep(cur);
      if (E.isLeft(s)) return ok(cur, results);
      const p = parser(s.right.state);
      if (E.isLeft(p)) return ok(cur, results);
      results.push(p.right.value);
      cur = p.right.state;
    }
  };