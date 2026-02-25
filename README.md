# meta-parsers

**meta-parsers** is a TypeScript parser combinator library based on functional programming principles and monadic design. It enables users to build complex, composable parsers from simple building blocks, with strong type safety and integration with [fp-ts](https://github.com/gcanti/fp-ts).

---

## Features
- **Composable combinators** for building complex parsers from simple ones.
- **Primitives** for parsing strings and generic sequences.
- **Monadic API** using `Either`, `Success`, and `Error` types.
- **TypeScript-first**: fully typed, with extensible parser and state types.
- **Functional**: designed to work seamlessly with fp-ts and functional programming patterns.
- **Jest tests** included.

---

## Installation

```bash
npm install git+https://github.com/LuisGrigore/ts-meta-parsers.git
```

---

## Basic Usage Example

```typescript
import { matchString, sequenceOf } from 'meta-parsers';

const parser = sequenceOf(
  matchString('hello'),
  matchString(' '),
  matchString('world')
);

const state = { input: 'hello world', index: 0 };
const result = parser(state);
// result: Either<Error, Success<State, Value[]>>
```

---

## API Documentation

### Parser Types
- **Parser<State, Value>**: `(state: State) => Either<Error, Success<State, Value>>`
- **Success<State, Value>**: `{ state: State; value: Value }`
- **Error**: `{ type: string; msg: string; position?: { line?: number; col?: number; offset: number }; cause?: Error | Error[] }`

### Parser Primitives
- `satisfy(predicate, errMsg?)`: Parses an element if it satisfies the predicate.
- `matchElem(elem)`: Parses a specific element.
- `oneOf(elems)`: Parses if the element is in the provided list.
- `noneOf(elems)`: Parses if the element is not in the provided list.

### String Parser Primitives
- `eof()`: Succeeds at end of input.
- `matchChar(char)`: Parses a specific character.
- `matchString(str)`: Parses a specific string.
- `matchRegex(regex)`: Parses a string matching the regex.
- `matchNumber`: Parses a number (integer or float).
- `alpha()`: Parses an alphabetic character.
- `digit()`: Parses a digit.
- `alphaNum()`: Parses an alphanumeric character.
- `digits()`: Parses a sequence of digits.

### Combinators
- `sequenceOf(...parsers)`: Runs parsers in sequence, collects results.
- `between(left, right)(content)`: Parses content between two parsers.
- `choice(...parsers)`: Tries parsers in order, returns first success.
- `many(parser)`: Zero or more repetitions.
- `manyOne(parser)`: One or more repetitions.
- `manyTill(end)(parser)`: Repeats parser until end parser matches.
- `lazy(() => parser)`: Allows recursive parsers.
- `optional(parser)`: Optionally parses, returns Option type.
- `sepBy(sep)(parser)`: Parses values separated by a separator.
- `orElse(p1)(p2)`: Tries p1, if fails tries p2.
- `skip(parser)`: Ignores parser result.
- `before(pa)(pb)`: Parses pa, then pb, returns pa's value.
- `attempt(parser)`: Backtracks on failure.
- `label(parser, msg)`: Labels parser for better error messages.

### Monad Utilities
- `ok(state, value)`: Constructs a successful result.
- `fail(error)`: Constructs a failed result.
- `of(value)`: Lifts a value into a parser.
- `map(fn)(parser)`: Maps result value.
- `chain(fn)(parser)`: Chains parsers.
- `ap(pf)(pa)`: Applies a parser containing a function to a parser containing a value.
- `mapError(fn)(parser)`: Maps parser errors.
- `bimap(fn, eFn)(parser)`: Maps both result and error.

---

## Project Structure
- **src/types.ts**: Core type definitions.
- **src/monad.ts**: Monad and functional helpers.
- **src/combinators.ts**: Parser combinators.
- **src/parser_primitives.ts**: Generic parser primitives.
- **src/string_parser_primitives.ts**: String-specific parser primitives.

---

## Testing

Run all tests with:

```bash
npm test
```

---

## Acknowledgments

This library builds upon concepts and types from fp-ts, licensed under MIT.

---

## License

MIT
