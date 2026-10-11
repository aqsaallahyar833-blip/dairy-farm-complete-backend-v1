/**
 * Phase 0 runtime smoke test.
 * Starts the Express server, exercises the audit endpoints, and verifies that
 * no fabricated value is returned by the API surface.
 * Does not touch the database.
 */
const { spawn } = require('child_process');

const BASE = 'http://127.0.0.1:3000';
const results = [];
const log = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` -- ${detail}` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch (_) {}
    await sleep(500);
  }
  return false;
}

(async () => {
  const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  let serverLog = '';
  child.stdout.on('data', (d) => (serverLog += d.toString()));
  child.stderr.on('data', (d) => (serverLog += d.toString()));

  try {
    const up = await waitForServer();
    if (!up) {
      log('server started', false, 'server did not become reachable');
      console.log('SERVER LOG:\n' + serverLog.slice(0, 3000));
      process.exitCode = 1;
      return;
    }
    log('server started and is reachable', true, '');

    // 1. Health
    const health = await (await fetch(`${BASE}/api/health`)).json();
    log('GET /api/health ok', health.status === 'ok', JSON.stringify(health));

    // 2. Data readiness: no records supplied -> nothing available
    const readiness = await (
      await fetch(`${BASE}/api/audit/data-readiness?records=${encodeURIComponent('{}')}`)
    ).json();
    log('data-readiness returns 8 categories', Array.isArray(readiness.categories) && readiness.categories.length === 8, `n=${readiness.categories?.length}`);
    log('data-readiness: 0 available', readiness.availableCount === 0, `available=${readiness.availableCount}`);
    log(
      'data-readiness: no category claims AVAILABLE',
      readiness.categories.every((c) => c.status !== 'AVAILABLE'),
      readiness.categories.map((c) => `${c.id}=${c.status}`).join(', ')
    );
    const readinessText = JSON.stringify(readiness);
    log(
      'data-readiness payload contains no fabricated rupee/litre figure',
      !/Rs\s?-?125|112,000|237,855|12,711|5,968|6,743|10,278|13,125/.test(readinessText),
      ''
    );

    // 3. Profit with no inputs -> 400 INSUFFICIENT_DATA (no default 59145/185000)
    const profitNoBody = await fetch(`${BASE}/api/calculate/profit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const profitBody = await profitNoBody.json();
    log('POST /api/calculate/profit with no inputs returns 400', profitNoBody.status === 400, `status=${profitNoBody.status}`);
    log('profit endpoint reports INSUFFICIENT_DATA', profitBody.status === 'INSUFFICIENT_DATA', JSON.stringify(profitBody.missing));
    log('profit endpoint returns no default profit', profitBody.profit === null, `profit=${profitBody.profit}`);

    // 4. Profit with partial inputs -> still insufficient
    const profitPartial = await fetch(`${BASE}/api/calculate/profit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revenue: 1000 }),
    });
    const partialBody = await profitPartial.json();
    log('profit with only revenue is still insufficient', profitPartial.status === 400 && partialBody.status === 'INSUFFICIENT_DATA', JSON.stringify(partialBody.missing));

    // 5. Profit with both supplied -> calculates
    const profitReal = await fetch(`${BASE}/api/calculate/profit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revenue: 1000, expenses: 400 }),
    });
    const realBody = await profitReal.json();
    log('profit with both inputs calculates correctly', realBody.profit === 600, `profit=${realBody.profit}`);

    // 6. Validate dashboard with no data -> NO_DATA_TO_VALIDATE, not PASS
    const validate = await fetch(`${BASE}/api/validate/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    });
    const validateBody = await validate.json();
    log('POST /api/validate/dashboard empty -> NO_DATA_TO_VALIDATE', validateBody.status === 'NO_DATA_TO_VALIDATE', `status=${validateBody.status}`);
    log('validation reports 0 rules evaluated', validateBody.rulesEvaluated === 0, `rulesEvaluated=${validateBody.rulesEvaluated}`);
    log('validation reports data insufficient', validateBody.dataSufficient === false, '');

    // 7. Audit trail: cards not evaluable, no proof steps
    const trail = await (await fetch(`${BASE}/api/audit/trail/farm-001`)).json();
    log('audit trail produces cards', trail.calculations.length > 0, `cards=${trail.calculations.length}`);
    log(
      'audit trail marks all cards not evaluable',
      trail.calculations.every((c) => c.evaluable === false),
      ''
    );
    log(
      'audit trail cards carry no proof steps',
      trail.calculations.every((c) => (c.steps || []).length === 0),
      ''
    );
    log('audit trail derives card count', trail.totalCalculations === trail.calculations.length, `total=${trail.totalCalculations}`);
    log('audit trail reports insufficient data', trail.dataSufficient === false, '');

    // 8. Badge must not claim verified integrity
    const trailText = JSON.stringify(trail);
    log(
      'audit trail does not claim verified integrity',
      !/All Dairy Metrics Audited/i.test(trailText) && !trail.badge.text.toLowerCase().includes('verified'),
      `badge="${trail.badge.text}"`
    );

    // 9. Validate with real data -> rules run
    const validateReal = await fetch(`${BASE}/api/validate/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          incomes: [{ amount: 5000, category: 'Milk Sales' }],
          expenses: [{ amount: 3000, category: 'Feed' }],
          dailyExpenseTotal: 3000,
          animalCount: 10,
          animals: [{ earTag: 'A1' }, { earTag: 'A2' }],
        },
      }),
    });
    const realValidate = await validateReal.json();
    log('validation with real data runs rules', realValidate.rulesEvaluated > 0, `rulesEvaluated=${realValidate.rulesEvaluated}`);

    // 10. Reproductive cycle via engine (days open from real dates)
    const repro = await fetch(`${BASE}/api/validate/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          reproduction: {
            pregnancies: [{ animalId: 1, result: 'PREGNANT', diagnosisDate: '2026-01-01' }],
            calvings: [{ animalId: 1, dateTime: '2026-06-01' }],
          },
        },
      }),
    });
    const reproBody = await repro.json();
    const daysOpenRule = (reproBody.ruleResults || []).find((r) => r.ruleId === 'BREED-DAYS-OPEN');
    log('days-open rule runs from real dates', daysOpenRule && daysOpenRule.outcome === 'PASS', JSON.stringify(daysOpenRule));

    // 11. No response anywhere may contain the withdrawn case-study figures
    const allText = [readinessText, JSON.stringify(profitBody), JSON.stringify(validateBody), trailText].join(' ');
    const withdrawn = /125,?855|112,?000|237,?855|59,?145|185,?000|12,?711|5,?968|6,?743|10,?278|13,?125|297,?000/;
    log('no API response contains any withdrawn case-study figure', !withdrawn.test(allText), '');
  } catch (err) {
    log('smoke test completed without error', false, err.message);
  } finally {
    child.kill('SIGTERM');
    await sleep(500);
    if (!child.killed) child.kill('SIGKILL');
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\nSMOKE RESULT: ${passed} passed, ${failed} failed, ${results.length} total`);
  process.exitCode = failed > 0 ? 1 : 0;
})();
