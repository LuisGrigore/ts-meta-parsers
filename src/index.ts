import { pipe } from "fp-ts/lib/function";
import * as PC from "./parser_combinator";
import * as E from "fp-ts/Either";

type StringState = {
  inputString: string;
  index: number;
};

type NumberState = {
  inputString: number;
  index: number;
};

const str_parser_generator =
  (s: string): PC.Parser<StringState, string> =>
  (state: StringState) =>
    pipe(state, ({ inputString, index }) => {
      const remaining = inputString.slice(index);

      return remaining.startsWith(s)
        ? PC.ok(
            {
              inputString,
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
    pipe(state, ({ inputString, index }) => {
      const remaining = inputString.slice(index);
      const regexMatch = remaining.match(regex);
      return regexMatch
        ? PC.ok(
            {
              inputString,
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
    pipe(state, ({ inputString, index }) => {
      const remaining = inputString.slice(index);

      return remaining.startsWith(num.toString())
        ? PC.ok({
            inputString,
            index: index + num.toString().length,
          }, num)
        : PC.fail({
            type: "NumberParser",
            msg: `Tried to match "${num}" but got "${remaining.slice(0, 10)}..."`,
          });
    });

const char_parser = regex_parser_generator(/^[A-Za-z]/);
const letters_parser = regex_parser_generator(/^[A-Za-z]+/);
const digit_parser = regex_parser_generator(/^[0-9]/);
const number_parser = regex_parser_generator(/^[0-9]+/);


const lettersThenNumber = PC.sequenceOf(letters_parser, number_parser);
const manyLettersThenNumbers = PC.many(lettersThenNumber);
const manyOneLettersThenNumbers = PC.manyOne(lettersThenNumber);
const letters_or_numbers = PC.choice(letters_parser, number_parser);
const between_parenth = PC.between(
  str_parser_generator("("),
  str_parser_generator(")"),
)(number_parser);



E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "holaaaadios10",
    index: 0,
  })(parserSecuence),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "holaaaadios10",
    index: 0,
  })(lettersThenNumber),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "10holaaaadios10",
    index: 0,
  })(letter_or_number),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "10holaaaadios10",
    index: 0,
  })(PC.many(letter_or_number)),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "  %%& &",
    index: 0,
  })(PC.many(letter_or_number)),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "10holaaaadios10",
    index: 0,
  })(PC.manyOne(letter_or_number)),
);

E.fold(
  (err) => console.log(err),
  (succ) => console.log(succ),
)(
  PC.run({
    inputString: "  %%& &",
    index: 0,
  })(PC.manyOne(letter_or_number)),
);
