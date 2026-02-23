import * as E from "fp-ts/Either";
/**
 * Type definitions for parser combinators.
 * @module parser_combinator/types
 */

export interface Error {
  type: string;
  msg: string;
  position?: { line?: number; col?: number; offset: number };
  cause?: Error | Error[];
}

export type Success<State, Value> = { state: State; value: Value };

export type Parser<State, Value> = (
  state: State,
) => E.Either<Error, Success<State, Value>>;

export interface IterableParserState<I extends Iterable<any>> {
  input: I;
  index: number;
}

export interface StringParserState extends IterableParserState<string> {
  input: string;
}
