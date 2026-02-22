import { Result } from "./result";
export type Parser<State, Value> = (state: State) => Result<State, Value>;
