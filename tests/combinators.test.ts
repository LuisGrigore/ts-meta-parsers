import { sequenceOf, choice, many, manyOne, between, lazy, optional, sepBy } from '../src/combinators';
import { Parser } from '../src/types';
import * as O from 'fp-ts/Option';

describe('parser_combinator/combinators', () => {
  test('sequenceOf combines parsers in sequence', () => {
    // Example: combine two parsers
    const parserA: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const parserB: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const parser = sequenceOf(parserA, parserB);
    const result = parser('ab');
    expect(result.right.value).toEqual(['a', 'b']);
  });

  test('choice tries parsers until one succeeds', () => {
    const parserA: Parser<string, string> = (input) => ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const parserB: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const parser = choice([parserA, parserB]);
    const result = parser('b');
    expect(result.right.value).toBe('b');
  });

  test('many applies parser zero or more times', () => {
    const parser: Parser<string, string> = (input) => input.length > 0 ? ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } }) : ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const manyParser = many(parser);
    const result = manyParser('abc');
    expect(result.right.value).toEqual(['a', 'b', 'c']);
  });

  test('manyOne applies parser one or more times', () => {
    const parser: Parser<string, string> = (input) => input.length > 0 ? ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } }) : ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const manyOneParser = manyOne(parser);
    const result = manyOneParser('abc');
    expect(result.right.value).toEqual(['a', 'b', 'c']);
  });

  test('between applies parser between two others', () => {
    const left: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const right: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const middle: Parser<string, string> = (input) => ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } });
    const parser = between(left, right)(middle);
    const result = parser('abc');
    expect(result.right.value).toBe('b');
  });

  test('lazy defers parser execution', () => {
    let called = false;
    const parser: Parser<string, string> = (input) => { called = true; return { _tag: 'Right', right: { state: input.slice(1), value: input[0] } }; };
    const lazyParser = lazy(() => parser);
    const result = lazyParser('a');
    expect(called).toBe(true);
    expect(result.right.value).toBe('a');
  });

  test('optional returns Option', () => {
    const parser: Parser<string, string> = (input) => input.length > 0 ? ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } }) : ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const optionalParser = optional(parser);
    const resultSome = optionalParser('a');
    expect(O.isSome(resultSome.right.value)).toBe(true);
    const resultNone = optionalParser('');
    expect(O.isNone(resultNone.right.value)).toBe(true);
  });

  test('sepBy parses values separated by separator', () => {
    const sep: Parser<string, string> = (input) => input[0] === ',' ? ({ _tag: 'Right', right: { state: input.slice(1), value: ',' } }) : ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const parser: Parser<string, string> = (input) => input.length > 0 && input[0] !== ',' ? ({ _tag: 'Right', right: { state: input.slice(1), value: input[0] } }) : ({ _tag: 'Left', left: { type: 'error', msg: 'fail', position: { offset: 0 } } });
    const sepByParser = sepBy(sep)(parser);
    const result = sepByParser('a,b,c');
    expect(result.right.value).toEqual(['a', 'b', 'c']);
  });
});
