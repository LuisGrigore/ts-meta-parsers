import * as E from "fp-ts/Either";

export interface Error {
  type: string;
  msg: string;
  position?: { line?: number; col?: number; offset: number };
  cause?: Error | Error[];
}

export type Success<State, Value> = { state: State; value: Value };

export type Result<State, Value> = E.Either<Error, Success<State, Value>>;
