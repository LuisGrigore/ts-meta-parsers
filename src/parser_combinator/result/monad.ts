import { pipe } from "fp-ts/lib/function";
import { Result, Error, Success } from "./types";
import * as E from "fp-ts/Either";

//of
export const ok = <S, V>(state: S, value: V): Result<S, V> =>
  E.right({ state: state, value: value });

export const fail = <S, V>(error: Error): Result<S, V> => E.left(error);

//fold
export const fold =
  <State, Value, A>(
    fn: (success: Success<State, Value>) => A,
    errFn: (error: Error) => A,
  ) =>
  (result: Result<State, Value>): A =>
    E.match(errFn, fn)(result);

//chain
export const chain =
  <S, A, B>(fn: (success: Success<S, A>) => Result<S, B>) =>
  (res: Result<S, A>): Result<S, B> =>
    fold(
      (success: Success<S, A>) => fn(success),
      (err) => fail(err),
    )(res);

//map
export const map =
  <S, A, B>(fn: (success: Success<S, A>) => Success<S, B>) =>
  (res: Result<S, A>): Result<S, B> =>
    chain<S, A, B>((a) => {
      const { state, value } = fn(a);
      return ok(state, value);
    })(res);

export const mapError =
  (fnErr: (error: Error) => Error) =>
  <S, A>(res: Result<S, A>): Result<S, A> =>
    fold(
      (succcess: Success<S, A>) => ok(succcess.state, succcess.value),
      (error: Error) => fail(fnErr(error)),
    )(res);

export const bimap =
  <S, A, B>(
    fn: (success: Success<S, A>) => Success<S, B>,
    fnErr: (error: Error) => Error,
  ) =>
  (res: Result<S, A>): Result<S, B> =>
    pipe(res, mapError(fnErr), map(fn));

//ap
export const ap =
  <S, A, B>(rf: Result<S, (a: A) => B>) =>
  (ra: Result<S, A>): Result<S, B> =>
    fold<S, (a: A) => B, Result<S, B>>(
      ({ state: stateF, value: f }) =>
        fold<S, A, Result<S, B>>(
          ({ state: stateA, value: a }) => ok(stateA, f(a)),
          (err) => fail(err),
        )(ra),
      (err) => fail(err),
    )(rf);
