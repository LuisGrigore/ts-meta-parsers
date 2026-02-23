import { Result, Error, Success } from '../../src/result/types';

describe('parser_combinator/result/types', () => {
  test('Result can be success', () => {
    const success: Success<string, number> = { state: 'next', value: 123 };
    const result: Result<string, number> = { _tag: 'Right', right: success };
    expect(result.right.value).toBe(123);
  });

  test('Result can be error', () => {
    const error: Error = { type: 'error', msg: 'fail', position: { offset: 0 } };
    const result: Result<string, number> = { _tag: 'Left', left: error };
    expect(result.left.msg).toBe('fail');
  });
});
