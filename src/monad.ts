/**
 * Monad utilities for parser combinators.
 * Provides helpers to work with parsers as monads over Either<Error, Success<State, Value>>.
 *
 * @module parser_combinator/monad
 */

import * as E from "fp-ts/Either";
import { Parser, Error, Success } from "./types";
import { pipe } from "fp-ts/lib/function";

/* --------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------- */

/**
 * Constructs a successful parser result.
 * @param state - The current parser state.
 * @param value - The parsed value.
 * @returns An Either containing Success.
 */
export const ok = <S, V>(state: S, value: V): E.Either<Error, Success<S, V>> =>
  E.right({ state, value });

/**
 * Constructs a failed parser result.
 * @param error - The parser error.
 * @returns An Either containing Error.
 */
export const fail = <S, V>(error: Error): E.Either<Error, Success<S, V>> =>
  E.left(error);

/**
 * Lifts a value into a parser that succeeds without consuming state.
 * @param value - The value to lift.
 * @returns A parser that returns the value.
 */
export const of =
  <V>(value: V) =>
  <S>(state: S): E.Either<Error, Success<S, V>> =>
    ok(state, value);

/**
 * Lifts an error into a parser that fails without consuming state.
 * @param error - The error to lift.
 * @returns A parser that fails with the given error.
 */
export const ofError =
  (error: Error) =>
  <S>(state: S): E.Either<Error, Success<S, any>> =>
    fail(error);

/* --------------------------------------------------------------------------
 * Functor / Monad Combinators
 * -------------------------------------------------------------------------- */

/**
 * Applies a transformation to the successful result of a parser.
 * @param fn - Function to transform the parsed value.
 * @returns A new parser with the mapped value.
 */
export const map =
  <ValueA, ValueB>(fn: (value: ValueA) => ValueB) =>
  <S>(parser: Parser<S, ValueA>): Parser<S, ValueB> =>
    chain<S, ValueA, ValueB>((value) => of(fn(value)))(parser);

/**
 * Chains two parsers sequentially.
 * The next parser depends on the value of the previous parser.
 * @param fn - Function that returns the next parser.
 * @returns A new parser representing the sequential composition.
 */
export const chain =
  <S, A, B>(fn: (value: A) => Parser<S, B>) =>
  (parser: Parser<S, A>): Parser<S, B> =>
  (state: S) =>
    pipe(
      parser(state),
      E.match(
        (err) => fail(err),
        ({ state: nextState, value }: Success<S, A>) => fn(value)(nextState),
      ),
    );

/**
 * Applies a parser containing a function to a parser containing a value.
 * Implements the applicative `ap` combinator.
 * @param pf - Parser returning a function.
 * @returns A parser that applies the function to the value parser.
 */
export const ap =
  <S, A, B>(pf: Parser<S, (a: A) => B>) =>
  (pa: Parser<S, A>): Parser<S, B> =>
    chain<S, (a: A) => B, B>((f) => map(f)(pa))(pf);

/* --------------------------------------------------------------------------
 * Error Handling
 * -------------------------------------------------------------------------- */

/**
 * Transforms parser errors.
 * @param fn - Function to map the Error to a new Error.
 * @returns A parser with transformed errors.
 */
export const mapError =
  <S, V>(fn: (error: Error) => Error) =>
  (parser: Parser<S, V>): Parser<S, V> =>
  (state: S) =>
    E.match<Error, Success<S, V>, E.Either<Error, Success<S, V>>>(
      (err) => fail(fn(err)),
      (success) => ok(success.state, success.value),
    )(parser(state));

/**
 * Applies a transformation to both success and failure results.
 * @param fn - Function to transform the successful value.
 * @param eFn - Function to transform the error.
 * @returns A parser with transformed success and error.
 */
export const bimap =
  <S, A, B>(fn: (value: A) => B, eFn: (error: Error) => Error) =>
  (parser: Parser<S, A>): Parser<S, B> =>
    pipe(parser, map(fn), mapError(eFn));
