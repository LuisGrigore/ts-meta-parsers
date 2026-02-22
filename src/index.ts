import { pipe } from "fp-ts/lib/function";
import * as PC from "./parser_combinator";
import * as E from "fp-ts/Either";
import { abort } from "node:process";

type StringState = {
  input: string;
  index: number;
};

type NumberState = {
  inputString: number;
  index: number;
};

const strGenerator =
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

const regexGenerator =
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

const numberGenerator =
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
//Alpha
const alpha = regexGenerator(/^[A-Za-z]/);
title = "AlphaParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc", index: 0 })(alpha),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "123", index: 0 })(alpha),
);
//Alphas
const alphas = regexGenerator(/^[A-Za-z]+/);
title = "AlphasParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc123", index: 0 })(alphas),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "123abc", index: 0 })(alphas),
);
//Digit
const digit = regexGenerator(/^[0-9]/);
title = "DigitParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "123abc", index: 0 })(digit),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "abc123", index: 0 })(digit),
);
//Digit
const digits = regexGenerator(/^[0-9]+/);
title = "DigitsParser";
printResultWithTitle(title + "Success")(
  PC.run({ input: "123abc", index: 0 })(digits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "abc123", index: 0 })(digits),
);

//Sequence Of
const alphasThenDigits = PC.sequenceOf(alphas, digits);
title = "SequenceOfAlphasThenDigits";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc123", index: 0 })(alphasThenDigits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "123abc", index: 0 })(alphasThenDigits),
);
//Many
const manyAlphasThenDigits = PC.many(alphasThenDigits);
title = "ManyAlphasThenDigits";
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc123def456ghi789$%&&$abc", index: 0 })(manyAlphasThenDigits),
);
printResultWithTitle(title + "Success")(
  PC.run({ input: "", index: 0 })(manyAlphasThenDigits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "$%&%··$%%&", index: 0 })(manyAlphasThenDigits),
);
// //Many One
// const manyOneAlphasThenDigits = PC.manyOne(alphasThenDigits);
// title = "ManyOneAlphasThenDigits";
// printResultWithTitle(title + "Success")(
//   PC.run({ input: "abc123def456ghi789$%&&$abc", index: 0 })(manyOneAlphasThenDigits),
// );
// printResultWithTitle(title + "Fail")(
//   PC.run({ input: "", index: 0 })(manyOneAlphasThenDigits),
// );
// printResultWithTitle(title + "Fail")(
//   PC.run({ input: "$%&%··$%%&", index: 0 })(manyOneAlphasThenDigits),
// );
//Choice
const alphasOrDigits = PC.choice(alphas, digits);
title = "AlphasOrDigits";
printResultWithTitle(title + "Success")(
  PC.run({ input: "123", index: 0 })(alphasOrDigits),
);
printResultWithTitle(title + "Success")(
  PC.run({ input: "abc", index: 0 })(alphasOrDigits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "abc123", index: 0 })(alphasOrDigits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "%&%·", index: 0 })(alphasOrDigits),
);
printResultWithTitle(title + "Fail")(
  PC.run({ input: "", index: 0 })(alphasOrDigits),
);
// //Between
// const manyAlphasOrDigitsBetweenParenth = PC.between(
//   strGenerator("("),
//   strGenerator(")"),
// )(PC.many(alphasOrDigits));
// title = "ManyAlphasOrDigitsBetweenParenth";
// printResultWithTitle(title + "Success")(
//   PC.run({ input: "(123)", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Success")(
//   PC.run({ input: "(abc)", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Success")(
//   PC.run({ input: "()", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Success")(
//   PC.run({ input: "(57575uvjhfhf6464h4h5h)", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Fail")(
//   PC.run({ input: "abc123", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Fail")(
//   PC.run({ input: "(%&%)", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );
// printResultWithTitle(title + "Fail")(
//   PC.run({ input: "", index: 0 })(manyAlphasOrDigitsBetweenParenth),
// );

let expression: PC.Parser<StringState,number>

const number = PC.map((num_str: string) => Number(num_str))(digits);

const factor = PC.choice(
  number,
  PC.between(regexGenerator(/^[(]/), regexGenerator(/^[)]/))(PC.lazy(() => expression)),
);

const term = PC.map(
  ([first, rest]: [number, readonly [string, number][]]) =>
    rest.reduce((acc, [op, val]) => (op === "*" ? acc * val : acc / val), first)
)(
  PC.sequenceOf(
    factor,
    PC.many(
      PC.sequenceOf(
        PC.choice(regexGenerator(/^[*]/), regexGenerator(/^[/]/)),
        factor
      )
    )
  )
);

expression = PC.map(
  ([first, rest]: [number, readonly [string, number][]]) =>
    rest.reduce((acc, [op, val]) => (op === "+" ? acc + val : acc - val), first)
)(
  PC.sequenceOf(
    term,
    PC.many(
      PC.sequenceOf(
        PC.choice(regexGenerator(/^[+]/), regexGenerator(/^[-]/)),
        term
      )
    )
  )
);


printResultWithTitle("Calc")(
  PC.run({ input: "1+2*3/(3+1)*5;2+2;5*5", index: 0 })(PC.sepBy(regexGenerator(/^[;]/))(expression)),
);