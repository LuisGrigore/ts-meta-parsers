/**
 * Monad utilities for parser combinators.
 * @module parser_combinator/monad
 */

import * as E from "fp-ts/Either";
import { Parser, Error, Success } from "./types";
import { pipe } from "fp-ts/lib/function";

export const ok = <S, V>(state: S, value: V): E.Either<Error, Success<S, V>> =>
  E.right({ state: state, value: value });

export const fail = <S, V>(error: Error): E.Either<Error, Success<S, V>> =>
  E.left(error);

export const of =
  <V>(value: V) =>
  <S>(state: S) =>
    ok(state, value);

export const ofError =
  (error: Error) =>
  <S>(state: S) =>
    fail(error);

export const chain =
  <State, ValueA, ValueB>(fn: (value: ValueA) => Parser<State, ValueB>) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
  (state: State) =>
    pipe(
      parser(state),
      E.match(
        (err) => fail(err),
        ({ state: nextState, value }: Success<State, ValueA>) =>
          fn(value)(nextState),
      ),
    );

export const map =
  <ValueA, ValueB>(fn: (value: ValueA) => ValueB) =>
  <State>(parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    chain<State, ValueA, ValueB>((value) => of(fn(value)))(parser);

export const mapError =
  <State, Value>(fn: (error: Error) => Error) =>
  (parser: Parser<State, Value>): Parser<State, Value> =>
  (state: State) =>
    E.match<Error, Success<State, Value>, E.Either<Error, Success<State, Value>>>(
      (err) => fail(fn(err)),
      (success) => ok(success.state, success.value),
    )(parser(state));

export const bimap =
  <State, ValueA, ValueB>(
    fn: (success: ValueA) => ValueB,
    eFn: (error: Error) => Error,
  ) =>
  (parser: Parser<State, ValueA>): Parser<State, ValueB> =>
    pipe(parser, map(fn), mapError(eFn));

export const ap =
  <S, A, B>(pf: Parser<S, (a: A) => B>) =>
  (pa: Parser<S, A>): Parser<S, B> =>
    chain<S, (a: A) => B, B>((f) => map<A, B>(f)(pa))(pf);
