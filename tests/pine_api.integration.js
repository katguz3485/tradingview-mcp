/** Live public Pine compiler contract tests; opt in with npm run test:api. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function run(args, opts = {}) {
  try {
    return { stdout: execFileSync(process.execPath, [fileURLToPath(new URL('../src/cli/index.js', import.meta.url)), ...args], { encoding: 'utf8', timeout: 15000, ...opts }), exitCode: 0 };
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || '', exitCode: error.status };
  }
}

describe('CLI — pine check (server compile)', () => {
  it('compiles valid Pine Script', () => {
    const source = '//@version=6\nindicator("test")\nplot(close)';
    const { stdout, exitCode } = run(['pine', 'check'], { input: source });
    assert.equal(exitCode, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.success, true);
    assert.equal(result.compiled, true);
  });

  it('returns errors for invalid Pine Script', () => {
    const source = '//@version=6\nindicator("test")\nplot(nonexistent_var)';
    const { stdout, exitCode } = run(['pine', 'check'], { input: source });
    assert.equal(exitCode, 0);
    const result = JSON.parse(stdout);
    assert.equal(result.compiled, false);
    assert.ok(result.error_count > 0);
  });
});

describe('pine_check — server compile', () => {
  it('should compile valid Pine Script via TradingView API', async () => {
    const source = `//@version=6
indicator("API Test", overlay=true)
plot(close, "Close", color=color.blue)`;

    const formData = new URLSearchParams();
    formData.append('source', source);

    const response = await fetch(
      'https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=Guest&pine_id=00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.tradingview.com/',
        },
        body: formData,
      }
    );

    assert.ok(response.ok, `API returned ${response.status}`);
    const result = await response.json();
    assert.ok(result.result || result.error === undefined, 'Should compile successfully');
  });

  it('should return errors for invalid Pine Script', async () => {
    const source = `//@version=6
indicator("Bad")
this_function_does_not_exist()`;

    const formData = new URLSearchParams();
    formData.append('source', source);

    const response = await fetch(
      'https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=Guest&pine_id=00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.tradingview.com/',
        },
        body: formData,
      }
    );

    assert.ok(response.ok, `API returned ${response.status}`);
    const result = await response.json();
    // API returns { success: true, result: { errors2: [...] } } for compile errors
    const errors = result?.result?.errors2 || [];
    assert.ok(errors.length > 0, `Should have compilation errors, got: ${JSON.stringify(result).slice(0, 200)}`);
    // Error message may be interpolated or templated (e.g., "Could not find {kind} '{fullName}'")
    const msg = errors[0].message || '';
    const ctx = errors[0].ctx || {};
    const mentionsBadFn = msg.includes('this_function_does_not_exist') || ctx.fullName === 'this_function_does_not_exist';
    assert.ok(mentionsBadFn, 'Error should mention the bad function via message or ctx.fullName');
  });

  it('should handle empty source gracefully', async () => {
    const formData = new URLSearchParams();
    formData.append('source', '');

    const response = await fetch(
      'https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=Guest&pine_id=00000000-0000-0000-0000-000000000000',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.tradingview.com/',
        },
        body: formData,
      }
    );

    // Empty source returns 400 — that's correct behavior
    assert.ok(response.status === 400 || response.status === 200, `Unexpected status: ${response.status}`);
  });
});
