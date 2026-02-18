import { pipe } from "fp-ts/lib/function";
import * as PC from "./parser_combinator";
import * as E from "fp-ts/Either";

type StringState = {
  input: string;
  index: number;
};

type NumberState = {
  inputString: number;
  index: number;
};

const str_parser_generator =
  (s: string): PC.Parser<StringState, string> =>
  (state: StringState) =>
    pipe(state, ({ input: input, index }) => {
      const remaining = input.slice(index);

      return remaining.startsWith(s)
        ? PC.ok(
            {
              input: input,
              index: index + s.length,
            },
            s,
          )
        : PC.fail({
            type: "StringParser",
            msg: `Tried to match "${s}" but got "${remaining.slice(0, 10)}"`,
          });
    });

const regex_parser_generator =
  (regex: RegExp): PC.Parser<StringState, string> =>
  (state: StringState) =>
    pipe(state, ({ input: input, index }) => {
      const remaining = input.slice(index);
      const regexMatch = remaining.match(regex);
      return regexMatch
        ? PC.ok(
            {
              input: input,
              index: index + regexMatch[0].length,
            },
            regexMatch[0],
          )
        : E.left({
            type: "RegexParser",
            msg: `"${remaining[0]}" does not match regex "${regex}"`,
          });
    });

const number_parser_generator =
  (num: number): PC.Parser<StringState, number> =>
  (state: StringState) =>
    pipe(state, ({ input: input, index }) => {
      const remaining = input.slice(index);

      return remaining.startsWith(num.toString())
        ? PC.ok(
            {
              input: input,
              index: index + num.toString().length,
            },
            num,
          )
        : PC.fail({
            type: "NumberParser",
            msg: `Tried to match "${num}" but got "${remaining.slice(0, 10)}..."`,
          });
    });

const printResult = <S, V>(result: PC.Result<S, V>) =>
  PC.foldResult(
    (success) => console.log(success),
    (error) => console.log(error),
  )(result);

const printResultWithTitle =
  (title: string) =>
  <S, V>(result: PC.Result<S, V>) => {
    (console.log("\n" + title + ":"), printResult(result));
  };

console.log("REGEX PARSERS:");
//Parser Tests
let title = "";
//Alpha parser
const alpha_parser = regex_parser_generator(/^[A-Za-z]/);
title = "AlphaParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc", index: 0 })(alpha_parser),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "123", index: 0 })(alpha_parser),
);
//Alphas parser
const alphas_parser = regex_parser_generator(/^[A-Za-z]+/);
title = "AlphasParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc123", index: 0 })(alphas_parser),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "123abc", index: 0 })(alphas_parser),
);
//Digit parser
const digit_parser = regex_parser_generator(/^[0-9]/);
title = "DigitParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "123abc", index: 0 })(digit_parser),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "abc123", index: 0 })(digit_parser),
);
//Digit parser
const digits_parser = regex_parser_generator(/^[0-9]+/);
title = "DigitsParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "123abc", index: 0 })(digits_parser),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "abc123", index: 0 })(digits_parser),
);

const lettersThenNumber = PC.sequenceOf(alphas_parser, digits_parser);
const manyLettersThenNumbers = PC.many(lettersThenNumber);
const manyOneLettersThenNumbers = PC.manyOne(lettersThenNumber);
const letters_or_numbers = PC.choice(alphas_parser, digits_parser);
const between_parenth = PC.between(
  str_parser_generator("("),
  str_parser_generator(")"),
)(digits_parser);