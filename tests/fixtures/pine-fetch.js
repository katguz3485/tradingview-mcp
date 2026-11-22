/** Synthetic transport fixtures: never contact TradingView or emulate its compiler. */
import assert from 'node:assert/strict';

const endpoint = 'https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=Guest&pine_id=00000000-0000-0000-0000-000000000000';
const sources = new Map([
  ['//@version=6\nindicator("test")\nplot(close)', 'valid'],
  ['//@version=6\nindicator("test")\nplot(nonexistent_var)', 'invalid-variable'],
  ['//@version=6\nindicator("API Test", overlay=true)\nplot(close, "Close", color=color.blue)', 'warning'],
  ['//@version=6\nindicator("Bad")\nthis_function_does_not_exist()', 'invalid-function'],
  ['', 'empty'],
]);

export function pineFetchFixture(url, options) {
  assert.equal(url, endpoint, 'Unexpected external request');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers.Accept, 'application/json');
  assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(options.headers.Referer, 'https://www.tradingview.com/');
  assert.ok(options.body instanceof URLSearchParams);
  assert.deepEqual([...options.body.keys()], ['source']);
  const source = options.body.get('source');
  assert.ok(sources.has(source), 'No fixture for this source: refusing network access');
  const scenario = sources.get(source);
  if (scenario === 'empty') return Promise.resolve(new Response('', { status: 400, statusText: 'Bad Request' }));
  const result = { errors2: [], warnings2: [] };
  if (scenario === 'invalid-variable') result.errors2 = [{ start: { line: 3, column: 6 }, end: { line: 3, column: 21 }, message: 'Undeclared identifier nonexistent_var' }];
  if (scenario === 'invalid-function') result.errors2 = [{ start: { line: 3, column: 1 }, end: { line: 3, column: 29 }, message: 'Could not find function this_function_does_not_exist' }];
  if (scenario === 'warning') result.warnings2 = [{ start: { line: 3, column: 1 }, message: 'Fixture warning' }];
  return Promise.resolve(Response.json({ success: true, result }));
}

export function installPineFetchFixture(t) {
  t.mock.method(globalThis, 'fetch', pineFetchFixture);
}
