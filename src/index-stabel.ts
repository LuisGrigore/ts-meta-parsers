// import { pipe } from "fp-ts/lib/function";
// import * as PC from "./parser_combinator";
// import * as E from "fp-ts/Either";

// type StringParseSuccess = {
//   inputString: string;
//   result: string;
//   index: number;
// };



// type NumberParseSuccess = {
//   inputString: string;
//   result: number;
//   index: number;
// };

// const str_parser_generator =
//   (s: string): PC.Parser<StringParseSuccess> =>
//   (state) =>
//     pipe(
//       state,
//       E.chain(({ inputString, index }) => {
//         const remaining = inputString.slice(index);

//         return remaining.startsWith(s)
//           ? E.right({
//               inputString,
//               result: s,
//               index: index + s.length,
//             })
//           : E.left({
//               type: "many",
//               msg: `Tried to match "${s}" but got "${remaining.slice(0, 10)}"`,
//             });
//       }),
//     );

// const regex_parser_generator =
//   (regex: RegExp): PC.Parser<StringParseSuccess> =>
//   (state) =>
//     pipe(
//       state,
//       E.chain(({ inputString, index }) => {
//         const remaining = inputString.slice(index);
//         const regexMatch = remaining.match(regex);
//         return regexMatch
//           ? E.right({
//               inputString,
//               result: regexMatch[0],
//               index: index + regexMatch[0].length,
//             })
//           : E.left({
//               type: "many",
//               msg: `"${remaining[0]}" does not match regex "${regex}"`,
//             });
//       }),
//     );

// const char_parser = regex_parser_generator(/^[A-Za-z]/);
// const letters_parser = regex_parser_generator(/^[A-Za-z]+/);
// const digit_parser = regex_parser_generator(/^[0-9]/);
// const number_parser = regex_parser_generator(/^[0-9]+/);

// const number_parser_generator =
//   (num: number): PC.Parser<StringParseSuccess, NumberParseSuccess> =>
//   (state) =>
//     pipe(
//       state,
//       E.chain(({ inputString, index }) => {
//         const remaining = inputString.slice(index);

//         return remaining.startsWith(num.toString())
//           ? E.right({
//               inputString,
//               result: num,
//               index: index + num.toString().length,
//             })
//           : E.left({
//               type: "many",
//               msg: `Tried to match "${num}" but got "${remaining.slice(0, 10)}..."`,
//             });
//       }),
//     );

// const parser = str_parser_generator("holaaa");
// const parser2 = str_parser_generator("adios");
// const parser3 = number_parser_generator(10);

// const parserSecuence = PC.sequenceOf(parser, parser2, parser3);

// const lettersThenNumber = PC.sequenceOf(letters_parser, number_parser);

// const letter_or_number = PC.choice(letters_parser, number_parser);

// const between_letter = PC.between(
//   letters_parser,
//   number_parser_generator(10),
// )(number_parser);

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "holaaaadios10",
//     result: "",
//     index: 0,
//   })(parserSecuence),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "holaaaadios10",
//     result: "",
//     index: 0,
//   })(lettersThenNumber),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "10holaaaadios10",
//     result: "",
//     index: 0,
//   })(letter_or_number),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "10holaaaadios10",
//     result: "",
//     index: 0,
//   })(PC.many(letter_or_number)),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "  %%& &",
//     result: "",
//     index: 0,
//   })(PC.many(letter_or_number)),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "10holaaaadios10",
//     result: "",
//     index: 0,
//   })(PC.manyOne(letter_or_number)),
// );

// E.fold(
//   (err) => console.log(err),
//   (succ) => console.log(succ),
// )(
//   PC.run({
//     inputString: "  %%& &",
//     result: "",
//     index: 0,
//   })(PC.manyOne(letter_or_number)),
// );
