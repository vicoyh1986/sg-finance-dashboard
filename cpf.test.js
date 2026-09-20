'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CPF = require('./cpf.js');

const accounts = ['oa', 'sa', 'ma', 'ra'];
const asCents = value => Math.round(value * 100);
const balanceTotal = value => accounts.reduce((sum, account) => sum + value[account], 0);
const member = overrides => ({
  age: 30, status: 'full', salary: 0, bonus: 0,
  oa: 0, sa: 0, ma: 0, ra: 0, ...overrides
});

test('browser script exposes the same CPF engine without CommonJS', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./cpf.js'), 'utf8'), context);
  assert.equal(vm.runInContext('CPF.rules.year', context), 2026);
  assert.equal(vm.runInContext('CPF.contribution({ age: 30, salary: 1000 }).total', context), 370);
});

test('2026 contribution and allocation rates cover every age-band boundary', () => {
  const bands = [
    [[0, 35], 20, 17, .6217, .1621, .2162],
    [[36, 45], 20, 17, .5677, .1891, .2432],
    [[46, 50], 20, 17, .5136, .2162, .2702],
    [[51, 54, 55], 20, 17, .4055, .3108, .2837],
    [[56, 60], 18, 16, .3530, .3382, .3088],
    [[61, 65], 12.5, 12.5, .1400, .4400, .4200],
    [[66, 70], 7.5, 9, .0607, .3030, .6363],
    [[71, 100], 5, 7.5, .0800, .0800, .8400]
  ];
  for (const [ages, employee, employer, oa, retirement, ma] of bands) {
    for (const age of ages) {
      const actual = CPF.rates(age);
      assert.deepEqual(actual, {
        employee, employer, total: employee + employer, oa, ma,
        sa: age < 55 ? retirement : 0, ra: age >= 55 ? retirement : 0
      }, `age ${age}`);
      assert.deepEqual(CPF.contribution(member({ age, ageTiming: 'birthday', salary: 1000 })), {
        employee: employee * 10, employer: employer * 10, total: (employee + employer) * 10
      }, `contributions at age ${age}`);
      assert.ok(Math.abs(actual.oa + actual.sa + actual.ma + actual.ra - 1) < 1e-12);
    }
  }
});

test('age 55 closes SA allocation without prematurely reducing contribution rates', () => {
  assert.equal(CPF.rates(54).sa, .3108);
  assert.equal(CPF.rates(55).sa, 0);
  assert.equal(CPF.rates(55).ra, .3108);
  assert.equal(CPF.contribution(member({ age: 55, ageTiming: 'birthday', salary: 1000 })).total, 370);
  assert.equal(CPF.contribution(member({ age: 55, salary: 1000 })).total, 340);
  assert.equal(CPF.contribution(member({ age: 56, salary: 1000 })).total, 340);
});

test('low-wage thresholds use graduated employee contributions in every rate band', () => {
  const wages = [0, 50, 50.01, 500, 501, 750, 751];
  const cases = [
    [35, [[0, 0], [0, 0], [0, 9], [0, 85], [0, 86], [150, 278], [150, 278]]],
    [55, [[0, 0], [0, 0], [0, 9], [0, 85], [0, 86], [150, 278], [150, 278]]],
    [56, [[0, 0], [0, 0], [0, 8], [0, 80], [0, 81], [135, 255], [135, 255]]],
    [61, [[0, 0], [0, 0], [0, 6], [0, 63], [0, 63], [93, 188], [93, 188]]],
    [66, [[0, 0], [0, 0], [0, 5], [0, 45], [0, 45], [56, 124], [56, 124]]],
    [71, [[0, 0], [0, 0], [0, 4], [0, 38], [0, 38], [37, 94], [37, 94]]]
  ];
  for (const [age, expected] of cases) {
    wages.forEach((salary, index) => {
      const [employee, total] = expected[index];
      assert.deepEqual(CPF.contribution(member({ age, ageTiming: 'birthday', salary })), {
        employee, employer: total - employee, total
      }, `age ${age}, wages ${salary}`);
    });
  }
});

test('birthday month and following months select contribution and allocation bands independently of SA closure', () => {
  const cases = [
    [35, [200, 170], [200, 170], [6217, 1621, 2162], [5677, 1891, 2432]],
    [45, [200, 170], [200, 170], [5677, 1891, 2432], [5136, 2162, 2702]],
    [50, [200, 170], [200, 170], [5136, 2162, 2702], [4055, 3108, 2837]],
    [55, [200, 170], [180, 160], [4055, 3108, 2837], [3530, 3382, 3088]],
    [60, [180, 160], [125, 125], [3530, 3382, 3088], [1400, 4400, 4200]],
    [65, [125, 125], [75, 90], [1400, 4400, 4200], [607, 3030, 6363]],
    [70, [75, 90], [50, 75], [607, 3030, 6363], [800, 800, 8400]]
  ];
  for (const [age, birthdayPay, afterPay, birthdayFlows, afterFlows] of cases) {
    for (const [ageTiming, expectedPay, expectedFlows] of [
      ['birthday', birthdayPay, birthdayFlows], ['after', afterPay, afterFlows]
    ]) {
      const p = member({ age, ageTiming, salary: 1000 });
      const [employee, employer] = expectedPay;
      assert.deepEqual(CPF.contribution(p), { employee, employer, total: employee + employer },
        `pay at age ${age}, ${ageTiming}`);
      const [oa, retirement, ma] = expectedFlows;
      assert.deepEqual(CPF.allocate(p, 10000).flows, {
        oa, ma, sa: age < 55 ? retirement : 0, ra: age >= 55 ? retirement : 0
      }, `allocation at age ${age}, ${ageTiming}`);
      if (age === 55) {
        const result = CPF.allocate({ ...p, sa: 50000 }, 10000).balances;
        assert.equal(result.sa, 0);
        assert.equal(result.ra, 50000 + retirement);
      }
    }
    assert.deepEqual(CPF.contribution(member({ age, salary: 1000 })),
      CPF.contribution(member({ age, ageTiming: 'after', salary: 1000 })));
  }
});

test('pre-existing MA overflow is normalized before monthly contribution flows are calculated', () => {
  for (const age of [30, 55]) {
    const retirement = age < 55 ? 'sa' : 'ra';
    const p = member({ age, ma: 81000, [retirement]: 220000 });
    const zero = CPF.allocate(p, 0);
    assert.deepEqual(zero.flows, { oa: 0, sa: 0, ma: 0, ra: 0 });
    assert.equal(zero.balances.ma, 79000);
    assert.equal(zero.balances[retirement], 220400);
    assert.equal(zero.balances.oa, 1600);
    const allocated = CPF.allocate(p, 370);
    assert.equal(asCents(balanceTotal(allocated.flows)), 37000);
    for (const account of accounts) assert.ok(allocated.flows[account] >= 0);
    assert.equal(asCents(balanceTotal(allocated.balances) - balanceTotal(p)), 37000);
  }
});

test('dollar rounding floors employee share and derives employer from rounded total', () => {
  assert.deepEqual(CPF.contribution(member({ salary: 753 })), {
    employee: 150, employer: 129, total: 279
  });
  for (const age of [30, 55, 56, 61, 66, 71]) {
    for (const salary of [50.01, 501, 749.99, 750, 751, 753, 1234.56, 7999.99, 10000]) {
      const pay = CPF.contribution(member({ age, salary }));
      assert.equal(pay.employee + pay.employer, pay.total);
      for (const value of Object.values(pay)) {
        assert.ok(Number.isInteger(value) && value >= 0);
      }
    }
  }
});

test('OW caps at $8,000 and AW uses $102,000 less twelve capped OW payments', () => {
  const result = CPF.annual(member({ salary: 10000, bonus: 100000 }));
  assert.deepEqual(result.monthly, { employee: 1600, employer: 1360, total: 2960 });
  assert.equal(result.awCeiling, 6000);
  assert.equal(result.eligibleBonus, 6000);
  assert.equal(result.bonusContribution, 2220);
  assert.equal(result.employee, 20400);
  assert.equal(result.employer, 17340);
  assert.equal(result.total, 37740);
  assert.equal(result.employee + result.employer, result.total);
  assert.deepEqual(CPF.annual(member({ salary: 8000, bonus: 6000 })), result);
});

test('low-wage annual calculations apply the bonus once in December with combined wages', () => {
  const result = CPF.annual(member({ salary: 100, bonus: 1000 }));
  assert.equal(result.awCeiling, 100800);
  assert.equal(result.monthly.total, 17);
  assert.equal(result.bonusContribution, 390);
  assert.equal(result.employee, 220);
  assert.equal(result.employer, 374);
  assert.equal(result.total, 594);
  assert.equal(CPF.annual(member({ salary: 0, bonus: 1000 })).total, 370);
  const projected = CPF.projectYear(member({ age: 30, salary: 0, bonus: 1000 }));
  assert.equal(asCents(balanceTotal(projected)), 37000);
});

test('foreign and unsupported contribution statuses produce zero contributions', () => {
  for (const status of ['foreign', 'unsupported']) {
    const p = member({ status, salary: 10000, bonus: 100000 });
    assert.deepEqual(CPF.contribution(p, 6000), { employee: 0, employer: 0, total: 0 });
    const result = CPF.annual(p);
    assert.equal(result.employee, 0);
    assert.equal(result.employer, 0);
    assert.equal(result.total, 0);
    assert.equal(result.bonusContribution, 0);
    assert.equal(balanceTotal(CPF.projectYear(p)), 0);
  }
});

test('negative and nonfinite inputs cannot produce invalid balances or contributions', () => {
  for (const invalid of [-1, -100000, NaN, Infinity, -Infinity]) {
    const p = member({
      age: invalid, salary: invalid, bonus: invalid,
      oa: invalid, sa: invalid, ma: invalid, ra: invalid,
      bhs: invalid, frs: invalid
    });
    assert.equal(CPF.money(invalid), 0);
    assert.deepEqual(CPF.contribution(p, invalid), { employee: 0, employer: 0, total: 0 });
    assert.equal(CPF.annual(p).total, 0);
    assert.equal(CPF.interest(p).total, 0);
    const allocated = CPF.allocate(p, invalid).balances;
    const projected = CPF.projectYear(p);
    for (const account of accounts) {
      assert.equal(allocated[account], 0);
      assert.equal(projected[account], 0);
    }
  }
});

test('OA extra-interest eligibility is capped at $20,000 and credited to SA/RA', () => {
  for (const [age, expectedExtra, destination] of [[30, 200, 'sa'], [55, 400, 'ra']]) {
    const result = CPF.interest(member({ age, oa: 100000 }));
    assert.equal(result.eligible, 20000);
    assert.equal(result.extra, expectedExtra);
    assert.equal(result.oa, 2500);
    assert.equal(result[destination], expectedExtra);
    assert.equal(result.total, 2500 + expectedExtra);
    assert.equal(result.ma, 0);
    assert.equal(result[age < 55 ? 'ra' : 'sa'], 0);
  }
});

test('age 55+ $60,000 RA earns $900 extra interest with RA priority', () => {
  const result = CPF.interest(member({ age: 55, ra: 60000 }));
  assert.equal(result.extra, 900);
  assert.equal(result.ra, 3300);
  assert.equal(result.total, 3300);
  const mixed = CPF.interest(member({ age: 55, ra: 60000, oa: 100000, ma: 50000 }));
  assert.equal(mixed.extra, 900);
  assert.equal(mixed.ra, 3300);
  assert.equal(mixed.oa, 2500);
  assert.equal(mixed.ma, 2000);
});

test('extra interest follows RA, capped OA, SA, MA priority and account destination', () => {
  const below55 = CPF.interest(member({ oa: 20000, sa: 20000, ma: 40000 }));
  assert.equal(below55.extra, 600);
  assert.equal(below55.oa, 500);
  assert.equal(below55.sa, 1200);
  assert.equal(below55.ma, 1800);
  const older = CPF.interest(member({ age: 55, ra: 10000, oa: 20000, ma: 40000 }));
  assert.equal(older.extra, 900);
  assert.equal(older.oa, 500);
  assert.equal(older.ra, 1000);
  assert.equal(older.ma, 1900);
});

test('SA closure preserves wealth, retains existing RA and sends excess to OA', () => {
  for (const ra of [0, 100000, 230000]) {
    const input = member({ age: 55, oa: 25000, sa: 150000, ma: 30000, ra });
    const before = { ...input };
    const result = CPF.closeSA(input);
    assert.deepEqual(input, before);
    assert.equal(result.sa, 0);
    assert.equal(result.ra, Math.max(ra, Math.min(220400, ra + 150000)));
    assert.equal(balanceTotal(result), balanceTotal(input));
    assert.equal(result.ma, input.ma);
    assert.deepEqual(CPF.closeSA(result), result);
  }
  const younger = member({ age: 54, oa: 25000, sa: 150000, ra: 100000 });
  assert.equal(CPF.closeSA(younger).sa, 150000);
});

test('RA formation uses SA before OA, accounts for existing RA and respects cohort FRS', () => {
  const p = member({ age: 55, oa: 100000, sa: 50000, ra: 100000 });
  const result = CPF.closeSA(p, true);
  assert.equal(result.ra, 220400);
  assert.equal(result.oa, 29600);
  assert.equal(result.sa, 0);
  assert.equal(balanceTotal(result), balanceTotal(p));
  const custom = CPF.closeSA(member({ ...p, frs: 180000 }), true);
  assert.equal(custom.ra, 180000);
  assert.equal(custom.oa, 70000);
});

test('MA overflow fills retirement account only to FRS then goes to OA', () => {
  for (const age of [30, 55]) {
    const retirement = age < 55 ? 'sa' : 'ra';
    for (const startingRetirement of [219400, 220400, 230000]) {
      const input = member({ age, oa: 100, ma: 81500, [retirement]: startingRetirement });
      const result = CPF.allocate(input, 0).balances;
      const toRetirement = Math.min(2500, Math.max(0, 220400 - startingRetirement));
      assert.equal(result.ma, 79000);
      assert.equal(result[retirement], startingRetirement + toRetirement);
      assert.equal(result.oa, 2600 - toRetirement);
      assert.equal(balanceTotal(result), balanceTotal(input));
    }
  }
});

test('allocations conserve every cent across age bands, capped accounts and small amounts', () => {
  for (const age of [30, 36, 46, 51, 54, 55, 56, 61, 66, 71]) {
    for (const amount of [.01, .02, .03, .05, .07, .99, 1, 17, 123.45, 2960]) {
      for (const capped of [false, true]) {
        const retirement = age < 55 ? 'sa' : 'ra';
        const input = member({
          age, oa: 100.01, ma: capped ? 78999.99 : 0,
          [retirement]: capped ? 220399.99 : 0, bhs: 79000, frs: 220400
        });
        const before = { ...input };
        const { balances, flows } = CPF.allocate(input, amount);
        assert.deepEqual(input, before);
        assert.equal(asCents(balanceTotal(balances)) - asCents(balanceTotal(input)), asCents(amount),
          `balance conservation: age ${age}, amount ${amount}, capped ${capped}`);
        assert.equal(asCents(balanceTotal(flows)), asCents(amount),
          `flow conservation: age ${age}, amount ${amount}, capped ${capped}`);
        for (const account of accounts) assert.ok(balances[account] >= 0);
        if (age >= 55) assert.equal(balances.sa, 0);
      }
    }
  }
});

test('nonworking member transitions from age 54 to 55 exactly once', () => {
  const input = member({ age: 54, oa: 100000, sa: 50000 });
  const first = CPF.projectYear(input);
  assert.equal(first.age, 55);
  assert.equal(first.sa, 0);
  assert.equal(first.oa, 0);
  assert.equal(first.ra, 155100);
  assert.equal(input.sa, 50000);
  const second = CPF.projectYear({ ...first, oa: 10000 });
  assert.equal(second.age, 56);
  assert.equal(second.sa, 0);
  assert.equal(second.oa, 10250);
  assert.equal(second.ra, 162204);
});

test('zero-income projection credits annual interest and compounds across years', () => {
  const input = member({ age: 30, oa: 100000 });
  const first = CPF.projectYear(input);
  assert.equal(first.oa, 102500);
  assert.equal(first.sa, 200);
  assert.equal(balanceTotal(first), 102700);
  const second = CPF.projectYear(first);
  assert.equal(second.oa, 105062.50);
  assert.equal(second.sa, 410);
  assert.equal(balanceTotal(second), 105472.50);
});

test('BHS follows age-65 cohort and remains fixed during projections', () => {
  const expected = [
    [30, 79000], [64, 79000], [65, 79000], [66, 75500],
    [67, 71500], [68, 68500], [69, 66000], [70, 63000],
    [71, 60000], [72, 57200], [73, 54500], [74, 52000], [75, 49800]
  ];
  for (const [age, bhs] of expected) assert.equal(CPF.limits(member({ age })).bhs, bhs);
  const first = CPF.projectYear(member({ age: 65 }));
  const second = CPF.projectYear(first);
  assert.equal(first.bhs, 79000);
  assert.equal(second.bhs, 79000);
  assert.equal(CPF.limits(member({ age: 70, bhs: 50000 })).bhs, 50000);
  const overflow = CPF.allocate(member({ age: 66, ma: 76500, ra: 213000, frs: 213000 }), 0).balances;
  assert.equal(overflow.ma, 75500);
  assert.equal(overflow.ra, 213000);
  assert.equal(overflow.oa, 1000);
});

test('top-up room uses FRS below 55 and current ERS at 55+, never negative', () => {
  assert.equal(CPF.topUpRoom(member({ age: 54, sa: 200000 })), 20400);
  assert.equal(CPF.topUpRoom(member({ age: 54, sa: 230000 })), 0);
  assert.equal(CPF.topUpRoom(member({ age: 55, ra: 220400 })), 220400);
  assert.equal(CPF.topUpRoom(member({ age: 55, ra: 450000 })), 0);
  assert.equal(CPF.topUpRoom(member({ age: 55, sa: 50000, ra: 100000 })), 290800);
  assert.equal(CPF.topUpRoom(member({ age: 65, ra: 200000, frs: 161000 })), 240800);
});
