'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CPF = require('./cpf.js');

function loadApp({ confirmResult = true } = {}) {
  const elements = new Map();
  const storage = new Map();
  const confirmations = [];
  const transitions = [];
  const document = {
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          value: '', innerText: '', textContent: '', innerHTML: '', style: {},
          classList: { add() {}, remove() {}, toggle() {} }
        });
      }
      return elements.get(id);
    }
  };
  const context = vm.createContext({
    document, console,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    confirm(message) {
      confirmations.push(message);
      return confirmResult;
    },
    CPF: {
      ...CPF,
      projectYear(input) {
        const output = CPF.projectYear(input);
        transitions.push({ input: { ...input }, output: { ...output } });
        return output;
      }
    }
  });
  vm.runInContext(fs.readFileSync(require.resolve('./app.js'), 'utf8'), context);
  vm.runInContext(`
    syncInputsDOM = () => {};
    updateJiabaoCpfHub = () => {};
    generatePlaybook = () => {};
    updateExpenseAdvisor = () => {};
    updateCharts = () => {};
    showToastNotification = () => {};
    for (const bank of Object.values(state.banks)) bank.balance = 0;
    for (const key of Object.keys(state.assets)) state.assets[key] = 0;
    state.cpf = CPF.profile({ age: 30 });
    state.household = { enabled: false, members: [] };
    state.insurance = [];
    state.sim = {
      goal: 1000000, savingsRate: 0, returnRate: 0,
      salaryGrowth: 0, propGrowth: 0, retireAge: 85
    };
  `, context);
  return {
    state: vm.runInContext('state', context),
    run: source => vm.runInContext(source, context),
    elements, confirmations, transitions, storage
  };
}

const totalWealth = state => CPF.total(CPF.profile(state.cpf)) + state.banks.dbs.balance;
const snapshot = state => JSON.stringify({ cpf: state.cpf, dbs: state.banks.dbs.balance });

test('dashboard projection year zero counts each household bank and CPF balance only once', () => {
  const app = loadApp();
  Object.assign(app.state.cpf, { oa: 1000, sa: 2000, ma: 3000 });
  app.state.banks.dbs.balance = 10000;
  Object.assign(app.state.assets, {
    invStocks: 2000, propValuation: 50000, propLoan: 5000,
    loanCar: 100, loanPersonal: 200, loanCc: 300
  });
  app.state.household.enabled = true;
  app.state.household.members.push({
    age: 40, salary: 0, oa: 4000, sa: 5000, ma: 6000, ra: 7000, bankBalance: 1500
  });
  app.run('updateCalculations()');
  const point = app.run('latestProjection.dataPoints[0]');
  assert.equal(point.cash, 11500);
  assert.equal(point.liquid, 13500);
  assert.equal(point.primaryCpf, 6000);
  assert.equal(point.memberCpf, 22000);
  assert.equal(point.cpf, 28000);
  assert.equal(point.netWorth, 85900);
  assert.equal(app.elements.get('card-networth').innerText, app.run('formatMoney(85900)'));
  app.state.household.enabled = false;
  app.run('updateCalculations()');
  assert.equal(app.run('latestProjection.dataPoints[0].netWorth'), 62400);
  assert.equal(app.run('latestProjection.dataPoints[0].cpf'), 6000);
});

test('current ages above 85 produce a valid projection and past retirement targets return current wealth', () => {
  for (const age of [86, 90, 100]) {
    const app = loadApp();
    Object.assign(app.state.cpf, { age, ra: 10000 });
    app.state.banks.dbs.balance = 5000;
    app.state.sim.retireAge = 55;
    assert.doesNotThrow(() => app.run('updateCalculations()'));
    const projection = app.run('latestProjection');
    assert.equal(projection.dataPoints.length, 1);
    assert.equal(projection.dataPoints[0].age, age);
    assert.equal(projection.targetAgeNW, 15000);
    assert.equal(projection.targetAgeLiquid, 5000);
    assert.equal(projection.targetAgeCpf, 10000);
    assert.equal(projection.age85NW, 15000);
  }
});

test('retirement target before a younger current age returns the year-zero portfolio', () => {
  const app = loadApp();
  Object.assign(app.state.cpf, { age: 60, oa: 10000, ra: 50000 });
  app.state.banks.dbs.balance = 5000;
  app.state.sim.retireAge = 55;
  app.run('updateCalculations()');
  const projection = app.run('latestProjection');
  assert.equal(projection.targetAgeNW, 65000);
  assert.equal(projection.targetAgeLiquid, 5000);
  assert.equal(projection.targetAgeCpf, 60000);
  assert.equal(projection.dataPoints[0].netWorth, projection.targetAgeNW);
});

test('projection closes SA at 55 for nonworking primary and household members', () => {
  const app = loadApp();
  Object.assign(app.state.cpf, { age: 54, oa: 100000, sa: 50000, salary: 0 });
  app.state.sim.retireAge = 54;
  app.state.household.enabled = true;
  app.state.household.members.push({
    age: 54, salary: 0, oa: 0, sa: 10000, ma: 0, ra: 0, bankBalance: 0
  });
  app.run('updateCalculations()');
  const firstTransitions = app.transitions.filter(item => item.input.age === 54);
  assert.equal(firstTransitions.length, 2);
  for (const { input, output } of firstTransitions) {
    assert.equal(input.salary, 0);
    assert.equal(output.age, 55);
    assert.equal(output.sa, 0);
    assert.equal(output.oa, 0);
    assert.ok(output.ra > 0);
  }
  assert.equal(app.run('latestProjection.dataPoints[1].primaryCpf'), 155100);
  assert.equal(app.run('latestProjection.dataPoints[1].memberCpf'), 10500);
  assert.equal(app.run('latestProjection.dataPoints[1].cpf'), 165600);
  assert.equal(app.state.cpf.sa, 50000);
  assert.equal(app.state.household.members[0].sa, 10000);
});

test('January top-ups respect FRS/ERS room, preserve DBS plus CPF and persist state', () => {
  for (const [age, account, balance, cap] of [
    [30, 'sa', 219400, 220400], [55, 'ra', 439800, 440800]
  ]) {
    const app = loadApp();
    Object.assign(app.state.cpf, { age, [account]: balance });
    app.state.banks.dbs.balance = 5000;
    const before = totalWealth(app.state);
    app.run('simulateJanuaryTopUp()');
    assert.equal(app.state.cpf[account], cap);
    assert.equal(app.state.banks.dbs.balance, 4000);
    assert.equal(totalWealth(app.state), before);
    assert.equal(app.confirmations.length, 1);
    assert.match(app.confirmations[0], /irreversible/i);
    assert.ok(app.storage.size > 0);
    app.run('simulateJanuaryTopUp()');
    assert.equal(app.confirmations.length, 1);
    assert.equal(totalWealth(app.state), before);
  }
});

test('cash top-ups never exceed available DBS funds including cents', () => {
  const app = loadApp();
  app.state.banks.dbs.balance = 123.45;
  const before = totalWealth(app.state);
  app.run('simulateJanuaryTopUp()');
  assert.equal(app.state.banks.dbs.balance, 0);
  assert.equal(app.state.cpf.sa, 123.45);
  assert.equal(totalWealth(app.state), before);
  app.run('simulateJanuaryTopUp()');
  assert.equal(app.confirmations.length, 1);
});

test('MA top-up respects BHS and remaining cash while preserving total wealth', () => {
  const app = loadApp();
  app.state.cpf.ma = 78500;
  app.state.banks.dbs.balance = 1000;
  const before = totalWealth(app.state);
  app.run('simulateCapMaBhs()');
  assert.equal(app.state.cpf.ma, 79000);
  assert.equal(app.state.banks.dbs.balance, 500);
  assert.equal(totalWealth(app.state), before);
  app.run('simulateCapMaBhs()');
  assert.equal(app.confirmations.length, 1);
});

test('cancelled top-ups and OA transfers leave all balances unchanged', () => {
  for (const action of ['simulateJanuaryTopUp()', 'simulateCapMaBhs()', 'simulateTransferOaSa()']) {
    const app = loadApp({ confirmResult: false });
    app.state.banks.dbs.balance = 10000;
    app.state.cpf.oa = 10000;
    app.run("document.getElementById('jiabao-oa-transfer-input').value = '5000'");
    const before = snapshot(app.state);
    app.run(action);
    assert.equal(snapshot(app.state), before);
    assert.equal(app.confirmations.length, 1);
    assert.equal(app.storage.size, 0);
  }
});

test('unsupported profiles and invalid requested amounts cannot change cash or CPF', () => {
  for (const status of ['foreign', 'unsupported']) {
    const app = loadApp();
    app.state.cpf.status = status;
    app.state.cpf.oa = 10000;
    app.state.banks.dbs.balance = 10000;
    app.run("document.getElementById('jiabao-oa-transfer-input').value = '5000'");
    const before = snapshot(app.state);
    app.run('simulateJanuaryTopUp(); simulateCapMaBhs(); simulateTransferOaSa()');
    assert.equal(snapshot(app.state), before);
    assert.equal(app.confirmations.length, 0);
  }
  const app = loadApp();
  app.state.banks.dbs.balance = 10000;
  const before = snapshot(app.state);
  app.run("for (const value of [-1, NaN, Infinity, -Infinity]) applyCpfCashTopUp('sa', value)");
  assert.equal(snapshot(app.state), before);
  assert.equal(app.confirmations.length, 0);
});

test('OA transfers select SA below 55 and RA after closure without changing DBS or CPF wealth', () => {
  for (const [age, account, existing, limit] of [
    [30, 'sa', 219400, 220400], [55, 'ra', 439800, 440800]
  ]) {
    const app = loadApp();
    Object.assign(app.state.cpf, { age, oa: 5000, [account]: existing });
    app.state.banks.dbs.balance = 1000;
    app.run("document.getElementById('jiabao-oa-transfer-input').value = '5000'");
    const before = totalWealth(app.state);
    app.run('simulateTransferOaSa()');
    assert.equal(app.state.cpf.oa, 4000);
    assert.equal(app.state.cpf[account], limit);
    assert.equal(app.state.banks.dbs.balance, 1000);
    assert.equal(totalWealth(app.state), before);
    assert.equal(app.confirmations.length, 1);
  }
});
