import { of, ofError, fold, chain, map, mapError, bimap, ap } from '../src/monad';
import { Parser } from '../src/types';
import * as R from '../src/result';

describe('parser_combinator/monad', () => {
  test('of returns a successful result', () => {
    const parser = of('x');
    const result = parser('abc');
    expect(result.right.value).toBe('x');
  });

  test('ofError returns a failure', () => {
    const error: R.Error = { type: 'error', msg: 'fail', position: { offset: 0 } };
    const parser = ofError(error);
    const result = parser('abc');
    expect(result.left.msg).toBe('fail');
  });

  test('fold applies fn or errFn', () => {
    const parser = of('y');
    const folded = fold(
      (success) => success.value,
      (error) => error.msg
    )(parser);
    expect(folded('abc')).toBe('y');
  });

  test('chain composes parsers', () => {
    const parserA = of('a');
    const parserB = chain((v: string) => of(v + 'b'))(parserA);
    const result = parserB('abc');
    expect(result.right.value).toBe('ab');
  });

  test('map transforms parser result', () => {
    const parser = of('a');
    const mapped = map((v: string) => v + 'b')(parser);
    const result = mapped('abc');
    expect(result.right.value).toBe('ab');
  });

  test('mapError transforms error', () => {
    const error: R.Error = { type: 'error', msg: 'fail', position: { offset: 0 } };
    const parser = ofError(error);
    const mapped = mapError((err) => ({ ...err, msg: 'mapped' }))(parser);
    const result = mapped('abc');
    expect(result.left.msg).toBe('mapped');
  });

  test('bimap maps success and error', () => {
    const error: R.Error = { type: 'error', msg: 'fail', position: { offset: 0 } };
    const parserSuccess = of('a');
    const parserError = ofError(error);
    const bimapSuccess = bimap((v: string) => v + 'b', (err) => ({ ...err, msg: 'mapped' }))(parserSuccess);
    const bimapError = bimap((v: string) => v + 'b', (err) => ({ ...err, msg: 'mapped' }))(parserError);
    expect(bimapSuccess('abc').right.value).toBe('ab');
    expect(bimapError('abc').left.msg).toBe('mapped');
  });

  test('ap applies parser function to parser argument', () => {
    const pf = of((a: string) => a + 'b');
    const pa = of('a');
    const parser = ap(pf)(pa);
    const result = parser('abc');
    expect(result.right.value).toBe('ab');
  });
});
