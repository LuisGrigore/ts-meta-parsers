import {ok, fail} from './monad'
import {Parser} from './types'

export const eof = <S extends { input: string; index: number }>(): Parser<S, void> =>
  (state: S) =>
    state.index >= state.input.length
      ? ok(state, undefined)
      : fail({
          type: "eof",
          msg: `Expected end of input but found '${state.input[state.index]}'`,
          position: { offset: state.index },
        });

export const satisfy = <S extends { input: string; index: number }>(
  predicate: (char: string) => boolean,
  errMsg?: string
): Parser<S, string> =>
  (state: S) => {
    const char = state.input[state.index];
    if (char !== undefined && predicate(char)) {
      return ok({ ...state, index: state.index + 1 }, char);
    }
    return fail({
      type: "satisfy",
      msg: errMsg ?? `Unexpected character '${char}'`,
      position: { offset: state.index },
    });
  };

export const oneOf = <S extends { input: string; index: number }>(
  chars: string
): Parser<S, string> =>
  satisfy((c) => chars.includes(c), `Expected one of: [${chars}]`);

export const noneOf = <S extends { input: string; index: number }>(
  chars: string
): Parser<S, string> =>
  satisfy((c) => !chars.includes(c), `Unexpected character from: [${chars}]`);