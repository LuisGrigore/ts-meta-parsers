# Calc-lang Parser Combinator Library

A TypeScript library for building parser combinators, enabling the creation of complex parsers from simple, reusable components. This library is designed for functional programming and monadic composition, inspired by Haskell and F# parser combinator patterns.

## Features
- Modular parser combinators
- Monad utilities for parser composition
- Result types for error handling
- Type-safe and extensible

## Installation

```
npm install calc-lang
```

## Usage Example
```typescript
import { sequenceOf, choice, many, optional } from 'calc-lang/src/parser_combinator/combinators';
import { Parser } from 'calc-lang/src/parser_combinator/types';

const digitParser: Parser<string, string> = (input) => {
  // ...implementation...
};

const numberParser = many(digitParser);
const optionalSign = optional(choice([char('+'), char('-')]));
const signedNumberParser = sequenceOf([optionalSign, numberParser]);
```

## Module Structure

- `parser_combinator/combinators.ts`: Core parser combinators (sequence, choice, many, etc.)
- `parser_combinator/monad.ts`: Monad utilities for parser composition
- `parser_combinator/types.ts`: Type definitions for parsers
- `parser_combinator/result/`: Result types and monad utilities for parser results

## API Reference

### Combinators
- `sequenceOf(...parsers)`: Combines multiple parsers in sequence
- `choice(parsers)`: Tries each parser until one succeeds
- `many(parser)`: Applies a parser zero or more times
- `optional(parser)`: Optionally applies a parser
- `sepBy(sep)(parser)`: Parses values separated by a separator

### Monad Utilities
- `of(value)`: Wraps a value in a parser
- `chain(fn)`: Chains parsers monadically
- `map(fn)`: Maps a function over parser results
- `ap(pf)(pa)`: Applies a parser function to a parser argument

### Result Types
- `Result<State, Value>`: Either an error or a success
- `Error`: Error structure with type, message, and position
- `Success<State, Value>`: Success structure with state and value

## License
MIT

## Contributing
Pull requests and issues are welcome!
