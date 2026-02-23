import { Parser } from '../src/types';

describe('parser_combinator/types', () => {
  test('Parser type is a function', () => {
    const parser: Parser<string, number> = (input) => ({ _tag: 'Right', right: { state: input, value: 42 } });
    const result = parser('test');
    expect(result.right.value).toBe(42);
  });
});
