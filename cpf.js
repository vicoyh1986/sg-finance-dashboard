/* CPF planning assumptions for 2026, not a payroll submission calculator.
   Sources: CPFAllocationRatesfromJanuary2026.pdf and CPF Board contribution,
   retirement-sum, Basic Healthcare Sum and extra-interest guidance. */
const CPF = (() => {
  const rules = Object.freeze({
    year: 2026, owCeiling: 8000, annualWageCeiling: 102000,
    bhs: 79000, frs: 220400, ers: 440800, oaInterest: 0.025, retirementInterest: 0.04
  });
  const bhsHistory = [49800, 52000, 54500, 57200, 60000, 63000, 66000, 68500, 71500, 75500, 79000];
  const frsHistory = [161000, 166000, 171000, 176000, 181000, 186000, 192000, 198800, 205800, 213000, 220400];
  const money = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(1e12, Math.max(0, n)) : 0;
  };
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const ageOf = value => Math.min(100, Math.floor(money(value)));
  const total = p => p.oa + p.sa + p.ma + p.ra;

  function profile(input = {}) {
    const p = input && typeof input === 'object' ? input : {};
    return {
      ...p, age: ageOf(p.age ?? 28),
      status: ['full', 'foreign', 'unsupported'].includes(p.status) ? p.status : 'full',
      ageTiming: p.ageTiming === 'birthday' ? 'birthday' : 'after',
      salary: money(p.salary), bonus: money(p.bonus),
      oa: money(p.oa), sa: money(p.sa), ma: money(p.ma), ra: money(p.ra),
      bhs: money(p.bhs), frs: money(p.frs)
    };
  }

  function limits(input) {
    const p = profile(input);
    const bhsYear = Math.max(2016, Math.min(2026, 2026 - Math.max(0, p.age - 65)));
    const frsYear = 2026 - Math.max(0, p.age - 55);
    return {
      bhs: p.bhs || bhsHistory[bhsYear - 2016],
      frs: p.frs || frsHistory[frsYear - 2016] || rules.frs,
      ers: rules.ers,
      needsFrs: !p.frs && frsYear < 2016
    };
  }

  function rates(age) {
    age = ageOf(age);
    const band = age <= 35 ? [20, 17, .6217, .1621, .2162]
      : age <= 45 ? [20, 17, .5677, .1891, .2432]
      : age <= 50 ? [20, 17, .5136, .2162, .2702]
      : age <= 55 ? [20, 17, .4055, .3108, .2837]
      : age <= 60 ? [18, 16, .3530, .3382, .3088]
      : age <= 65 ? [12.5, 12.5, .1400, .4400, .4200]
      : age <= 70 ? [7.5, 9, .0607, .3030, .6363]
      : [5, 7.5, .0800, .0800, .8400];
    return { employee: band[0], employer: band[1], total: band[0] + band[1],
      oa: band[2], sa: age < 55 ? band[3] : 0,
      ra: age >= 55 ? band[3] : 0, ma: band[4] };
  }

  function contribution(input, additionalWages = 0) {
    const p = profile(input);
    const r = rates(p.age + (p.ageTiming === 'after' ? 1 : 0));
    const wages = Math.min(rules.owCeiling, p.salary) + money(additionalWages);
    if (p.status !== 'full' || wages <= 50) return { employee: 0, employer: 0, total: 0 };
    // CPF rounds the total to dollars, floors the employee share, then derives employer share.
    const employeeRaw = wages <= 500 ? 0
      : wages <= 750 ? (wages - 500) * (r.employee / 100) * 3
      : wages * r.employee / 100;
    const totalRaw = wages <= 750 ? wages * r.employer / 100 + employeeRaw
      : wages * r.total / 100;
    const all = Math.round(totalRaw + 1e-9);
    const employee = Math.floor(employeeRaw + 1e-9);
    return { employee, employer: all - employee, total: all };
  }

  function annual(input) {
    const p = profile(input);
    const awCeiling = Math.max(0, rules.annualWageCeiling - Math.min(rules.owCeiling, p.salary) * 12);
    const eligibleBonus = Math.min(p.bonus, awCeiling);
    const monthly = contribution(p);
    const bonusMonth = contribution(p, eligibleBonus);
    return {
      monthly, awCeiling, eligibleBonus,
      employee: monthly.employee * 11 + bonusMonth.employee,
      employer: monthly.employer * 11 + bonusMonth.employer,
      total: monthly.total * 11 + bonusMonth.total,
      bonusContribution: bonusMonth.total - monthly.total
    };
  }

  // Closing SA preserves wealth. Existing RA is never overwritten.
  function closeSA(input, formRA = false) {
    const p = profile(input);
    if (p.age < 55) return p;
    const cap = limits(p).frs;
    const fromSA = Math.min(p.sa, Math.max(0, cap - p.ra));
    p.ra += fromSA;
    p.oa += p.sa - fromSA;
    p.sa = 0;
    if (formRA) {
      const fromOA = Math.min(p.oa, Math.max(0, cap - p.ra));
      p.oa -= fromOA;
      p.ra += fromOA;
    }
    return p;
  }

  function retirementRoom(p, cap) {
    return Math.max(0, cap - (p.age < 55 ? p.sa : p.ra));
  }

  function overflow(input) {
    const p = profile(input);
    const cap = limits(p);
    const excess = Math.max(0, p.ma - cap.bhs);
    p.ma -= excess;
    const destination = p.age < 55 ? 'sa' : 'ra';
    const toRetirement = Math.min(excess, retirementRoom(p, cap.frs));
    p[destination] += toRetirement;
    p.oa += excess - toRetirement;
    return p;
  }

  function allocate(input, amount) {
    let p = overflow(closeSA(input));
    const before = { ...p };
    const r = rates(p.age + (p.ageTiming === 'after' ? 1 : 0));
    amount = money(amount);
    const ma = cents(amount * r.ma);
    const retirement = cents(amount * (r.sa + r.ra));
    p.ma += ma;
    p.oa += cents(amount - ma - retirement);
    if (p.age < 55) p.sa += retirement;
    else {
      const toRA = Math.min(retirement, retirementRoom(p, limits(p).frs));
      p.ra += toRA;
      p.oa += retirement - toRA;
    }
    p = overflow(p);
    return { balances: p, flows: {
      oa: cents(p.oa - before.oa), sa: cents(p.sa - before.sa),
      ma: cents(p.ma - before.ma), ra: cents(p.ra - before.ra)
    } };
  }

  function interest(input) {
    const p = closeSA(input);
    const extra = { oa: 0, sa: 0, ma: 0, ra: 0 };
    const eligible = { oa: Math.min(20000, p.oa), sa: p.sa, ma: p.ma, ra: p.ra };
    // RA first, then OA (capped at $20k), SA and MA. OA bonus goes to SA/RA.
    for (const ceiling of (p.age >= 55 ? [60000, 30000] : [60000])) {
      let remaining = ceiling;
      for (const account of ['ra', 'oa', 'sa', 'ma']) {
        const base = Math.min(remaining, eligible[account]);
        const destination = account === 'oa' ? (p.age < 55 ? 'sa' : 'ra') : account;
        extra[destination] += base * .01;
        remaining -= base;
      }
    }
    const byAccount = {
      oa: p.oa * rules.oaInterest,
      sa: p.sa * rules.retirementInterest + extra.sa,
      ma: p.ma * rules.retirementInterest + extra.ma,
      ra: p.ra * rules.retirementInterest + extra.ra
    };
    return { ...byAccount, total: total(byAccount), extra: total(extra),
      eligible: Math.min(60000, eligible.oa + eligible.sa + eligible.ma + eligible.ra) };
  }

  function projectYear(input) {
    let p = closeSA(input);
    // Freeze today's member-specific caps: future legislation is not forecast.
    const cap = limits(p);
    p.bhs = cap.bhs;
    p.frs = cap.frs;
    const pay = annual(p);
    const accrued = { oa: 0, sa: 0, ma: 0, ra: 0 };
    for (let month = 0; month < 12; month++) {
      const i = interest(p);
      for (const account of ['oa', 'sa', 'ma', 'ra']) accrued[account] += i[account] / 12;
      p = allocate(p, pay.monthly.total + (month === 11 ? pay.bonusContribution : 0)).balances;
    }
    for (const account of ['oa', 'sa', 'ma', 'ra']) p[account] = cents(p[account] + accrued[account]);
    p = overflow(p);
    p.age++;
    p.ageTiming = 'after';
    return closeSA(p, p.age === 55);
  }

  function topUpRoom(input) {
    const p = closeSA(input);
    return retirementRoom(p, p.age < 55 ? rules.frs : rules.ers);
  }

  return Object.freeze({ rules, money, cents, ageOf, total, profile, limits, rates,
    contribution, annual, closeSA, allocate, interest, projectYear, topUpRoom });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CPF;
