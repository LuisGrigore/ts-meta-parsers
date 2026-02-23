import { pipe } from 'fp-ts/lib/function';
import { Result, Error, Success } from '../../src/result/types';
// Example monad functions for result

describe('parser_combinator/result/monad', () => {
  test('Result monad: pipe and Either', () => {
    const success: Success<string, number> = { state: 'next', value: 123 };
    const error: Error = { type: 'error', msg: 'fail', position: { offset: 0 } };
    const right: Result<string, number> = { _tag: 'Right', right: success };
    const left: Result<string, number> = { _tag: 'Left', left: error };
    expect(right._tag).toBe('Right');
    expect(left._tag).toBe('Left');
  });
});
