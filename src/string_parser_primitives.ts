
import { ok, fail } from "./monad";
import { Parser, StringParserState } from "./types";
import { matchElem, satisfy } from "./parser_primitives";

export const eof = (): Parser<StringParserState, void> => (state) =>
  state.index >= state.input.length
    ? ok(state, undefined)
    : fail({
        type: "eof",
        msg: `Expected end of input but found '${state.input[state.index]}'`,
        position: { offset: state.index },
      });

export const matchChar = (char: string): Parser<StringParserState, string> =>
  matchElem<string, string>(char);

export const matchString =
  (str: string): Parser<StringParserState, string> =>
  (state) => {
    const remaining = state.input.slice(state.index);

    if (remaining.startsWith(str)) {
      return ok({ ...state, index: state.index + str.length }, str);
    }

    return fail({
      type: "matchString",
      msg: `Expected "${str}"`,
      position: { offset: state.index },
    });
  };

export const matchRegex =
  (regex: RegExp): Parser<StringParserState, string> =>
  (state) => {
    const remaining = state.input.slice(state.index);
    const match = regex.exec(remaining);

    if (match && match.index === 0) {
      const value = match[0];
      return ok({ ...state, index: state.index + value.length }, value);
    }

    return fail({
      type: "matchRegex",
      msg: `Expected pattern ${regex}`,
      position: { offset: state.index },
    });
  };

export const matchNumber: Parser<StringParserState, number> = (state) => {
  const remaining = state.input.slice(state.index);
  const match = /^[+-]?\d+(\.\d+)?/.exec(remaining);

  if (match) {
    const value = parseFloat(match[0]);
    return ok({ ...state, index: state.index + match[0].length }, value);
  }

  return fail({
    type: "matchNumber",
    msg: "Expected a number",
    position: { offset: state.index },
  });
};

export const alpha = (): Parser<StringParserState, string> =>
  satisfy<string, string>(
    (c) => /^[a-zA-Z]$/.test(c),
    "Expected alpha character",
  );

export const digit = (): Parser<StringParserState, string> =>
  satisfy<string, string>((c) => /^[0-9]$/.test(c), "Expected digit");

export const alphaNum = (): Parser<StringParserState, string> =>
  satisfy<string, string>(
    (c) => /^[a-zA-Z0-9]$/.test(c),
    "Expected alphanumeric character",
  );

export const digits = (): Parser<StringParserState, string[]> => (state) => {
  const result: string[] = [];
  let current = state;

  while (true) {
    const r = digit()(current);
    if ("left" in r) break;

    result.push(r.right.value);
    current = r.right.state;
  }

  return ok(current, result);
};
