import * as R from "./result";
import { Parser } from "./types";
import { pipe } from "fp-ts/lib/function";

//of
export const of =
  <V>(value: V) =>
  <S>(state: S) =>
    R.ok(state, value);

export const ofError =
  (error: R.Error) =>
  <S>(state: S) =>
    R.fail(error);

//fold
export const fold =
  <S, V, A>(
    fn: (success: R.Success<S, V>) => A,
    errFn: (error: R.Error) => A,
  ) =>
  (parser: Parser<S, V>) =>
  (state: S): A =>
    R.fold(fn, errFn)(parser(state));

export const chain =
  <State, ValueA, ValueB>(fn: (value: ValueA) => Parser<State, ValueB>) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
  (state: State) =>
    pipe(
      state,
      fold(
        ({ state: nextState, value }: R.Success<State, ValueA>) =>
          fn(value)(nextState),
        (err) => R.fail(err),
      )(parser),
    );


//map
export const map =
  <ValueA, ValueB>(fn: (value: ValueA) => ValueB) =>
  <State>(parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    chain<State, ValueA, ValueB>((value) => of(fn(value)))(parser);

export const mapError =
  <State, Value>(fn: (error: R.Error) => R.Error) =>
  (parser: Parser<State, Value>): Parser<State, Value> =>
    pipe(
      parser,
      fold(
        (success) => R.ok(success.state, success.value),
        (err) => R.fail(fn(err)),
      ),
    );

export const bimap =
  <State, ValueA, ValueB>(
    fn: (success: ValueA) => ValueB,
    eFn: (error: R.Error) => R.Error,
  ) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    pipe(parser, map(fn), mapError(eFn));

//ap
export const ap =
  <S,A,B>(pf: Parser<S, (a: A) => B>) =>
  (pa: Parser<S, A>): Parser<S, B> =>
    chain<S, (a: A) => B, B>((f) => map<A, B>(f)(pa))(pf);
