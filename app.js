/* ==========================================
   Pulse.SG Dashboard Control Logic (Pure JS)
   ========================================== */

// Global App State with default values
let state = {
  theme: 'theme-obsidian',
  activeTab: 'dashboard',
  banks: {
    dbs: { balance: 12500, multiplierActive: true, mSalary: true, mCard: true, mHome: false, mInvest: false, mAmount: 3200 },
    uob: { balance: 35000, oneActive: true, oneCard: true, oneSalary: true, oneGiro: false },
    ocbc: { balance: 18000, active360: true, bSalary: true, bSave: true, bSpend: false, bInsure: false, bInvest: false, bGrow: false },
    scb: { balance: 5000, bonusActive: false, bSalary: false, bSpend500: false, bSpend2000: false, bBills: false, bInvest: false },
    hsbc: { balance: 0, customRate: 0.05 },
    citi: { balance: 2500, customRate: 0.05 },
    maybank: { balance: 0, customRate: 0.05 },
    boc: { balance: 0, customRate: 0.05 }
  },
  cpf: {
    age: 28,
    salary: 6200,
    oa: 38000,
    sa: 22000,
    ma: 18000,
    ra: 0
  },
  assets: {
    propValuation: 550000,
    propLoan: 380000,
    propMortgage: 1950,
    propApr: 3.5,
    invStocks: 45000,
    invCrypto: 8000,
    invSrs: 4000,
    invOther: 0,
    loanCar: 22000,
    pmtCar: 750,
    loanPersonal: 0,
    pmtPersonal: 0,
    loanCc: 1200
  },
  sim: {
    goal: 1000000,
    savingsRate: 35,
    returnRate: 7.0,
    salaryGrowth: 3.5,
    propGrowth: 2.5,
    retireAge: 55
  },
  expense: {
    essential: 1800,
    discretionary: 800
  },
  chat: {
    apiKey: '',
    persona: 'analyst'
  },
  household: {
    enabled: false,
    members: [
      { id: 'm1', name: 'Spouse (Eve)', relation: 'spouse', age: 28, salary: 5000, oa: 25000, sa: 15000, ma: 12000, ra: 0, bankBalance: 15000 }
    ]
  }
};

// Theme Color Mapping for Chart.js and layouts
const themeColors = {
  'theme-obsidian': {
    isDark: true,
    primary: '#8b5cf6', // Vibrant Purple
    accent: '#06b6d4',  // Electric Cyan
    success: '#10b981', // Emerald Green
    danger: '#ef4444',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#a1a1aa',
    chartBg: 'rgba(139, 92, 246, 0.1)'
  },
  'theme-emerald': {
    isDark: true,
    primary: '#10b981', // Emerald
    accent: '#f59e0b',  // Gold
    success: '#34d399',
    danger: '#ef4444',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#a7f3d0',
    chartBg: 'rgba(16, 185, 129, 0.1)'
  },
  'theme-cyberpunk': {
    isDark: true,
    primary: '#ff007f', // Pink
    accent: '#00f0ff',  // Cyan
    success: '#39ff14', // Neon Green
    danger: '#ff3131',
    grid: 'rgba(0, 240, 255, 0.15)',
    text: '#8e9297',
    chartBg: 'rgba(255, 0, 127, 0.15)'
  },
  'theme-navy': {
    isDark: true,
    primary: '#3b82f6', // Navy Blue
    accent: '#60a5fa',  // Ice Blue
    success: '#34d399',
    danger: '#f87171',
    grid: 'rgba(255, 255, 255, 0.05)',
    text: '#8d99ae',
    chartBg: 'rgba(59, 130, 246, 0.1)'
  },
  'theme-aura': {
    isDark: false,
    primary: '#6366f1', // Indigo
    accent: '#ec4899',  // Rose Pink
    success: '#10b981',
    danger: '#ef4444',
    grid: 'rgba(99, 102, 241, 0.06)',
    text: '#6366f1',
    chartBg: 'rgba(99, 102, 241, 0.08)'
  }
};

// Chart instances
let projectionChart = null;
let allocationChart = null;

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  initTheme();
  syncInputsDOM();
  updateCalculations();
  setupInputListeners();
});

// Load state from LocalStorage
function loadSavedState() {
  const saved = localStorage.getItem('wealthPulseState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Deep merge saved state with default state to handle any schema updates
      state = mergeDeep(state, parsed);
      
      // Migrate old simple themes to the new 5-preset system
      if (state.theme === 'dark') {
        state.theme = 'theme-obsidian';
      } else if (state.theme === 'light') {
        state.theme = 'theme-aura';
      }
    } catch (e) {
      console.error("Failed to parse saved state", e);
    }
  }
}

// Deep merge helper
function mergeDeep(target, source) {
  const isObject = obj => obj && typeof obj === 'object';
  if (!isObject(target) || !isObject(source)) return source;

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = sourceValue;
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep({ ...targetValue }, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });
  return target;
}

// Save state to LocalStorage
function saveState() {
  localStorage.setItem('wealthPulseState', JSON.stringify(state));
}

// Initialize Theme Mode
function initTheme() {
  const theme = state.theme || 'theme-obsidian';
  changeTheme(theme, false);
}

// Switch active theme
function changeTheme(themeClass, doSave = true) {
  const body = document.body;
  
  // Remove all previous theme classes
  body.classList.remove('theme-obsidian', 'theme-emerald', 'theme-cyberpunk', 'theme-navy', 'theme-aura', 'dark-theme', 'light-theme');
  
  // Add active theme class
  body.classList.add(themeClass);
  state.theme = themeClass;
  
  // Update select in DOM
  const select = document.getElementById('theme-select');
  if (select) {
    select.value = themeClass;
  }
  
  if (doSave) {
    saveState();
  }
  
  // Re-draw charts to adapt to theme text colors
  updateCharts();
}

// Load Singapore demo presets
function loadProfilePreset(presetName) {
  if (presetName === 'custom') return;

  const presets = {
    graduate: {
      theme: 'theme-obsidian',
      banks: {
        dbs: { balance: 6500, multiplierActive: true, mSalary: true, mCard: true, mHome: false, mInvest: false, mAmount: 1800 },
        uob: { balance: 500, oneActive: false, oneCard: false, oneSalary: false, oneGiro: false },
        ocbc: { balance: 500, active360: false, bSalary: false, bSave: false, bSpend: false, bInsure: false, bInvest: false, bGrow: false },
        scb: { balance: 0, bonusActive: false, bSalary: false, bSpend500: false, bSpend2000: false, bBills: false, bInvest: false },
        hsbc: { balance: 0, customRate: 0.05 },
        citi: { balance: 0, customRate: 0.05 },
        maybank: { balance: 0, customRate: 0.05 },
        boc: { balance: 0, customRate: 0.05 }
      },
      cpf: { age: 24, salary: 4200, oa: 3500, sa: 1200, ma: 1000, ra: 0 },
      assets: {
        propValuation: 0, propLoan: 0, propMortgage: 0, propApr: 3.0,
        invStocks: 4500, invCrypto: 1500, invSrs: 0, invOther: 0,
        loanCar: 0, pmtCar: 0, loanPersonal: 0, pmtPersonal: 0, loanCc: 300
      },
      sim: { goal: 300000, savingsRate: 40, returnRate: 7.5, salaryGrowth: 4.5, propGrowth: 2.5, retireAge: 55 },
      expense: { essential: 1200, discretionary: 600 }
    },
    family: {
      theme: 'theme-emerald',
      banks: {
        dbs: { balance: 5000, multiplierActive: false, mSalary: false, mCard: false, mHome: false, mInvest: false, mAmount: 0 },
        uob: { balance: 45000, oneActive: true, oneCard: true, oneSalary: true, oneGiro: true },
        ocbc: { balance: 12000, active360: true, bSalary: true, bSave: true, bSpend: false, bInsure: false, bInvest: false, bGrow: false },
        scb: { balance: 0, bonusActive: false, bSalary: false, bSpend500: false, bSpend2000: false, bBills: false, bInvest: false },
        hsbc: { balance: 0, customRate: 0.05 },
        citi: { balance: 0, customRate: 0.05 },
        maybank: { balance: 0, customRate: 0.05 },
        boc: { balance: 0, customRate: 0.05 }
      },
      cpf: { age: 32, salary: 8800, oa: 52000, sa: 34000, ma: 28000, ra: 0 },
      assets: {
        propValuation: 580000, propLoan: 380000, propMortgage: 1750, propApr: 2.6,
        invStocks: 25000, invCrypto: 2000, invSrs: 0, invOther: 0,
        loanCar: 32000, pmtCar: 800, loanPersonal: 0, pmtPersonal: 0, loanCc: 1500
      },
      sim: { goal: 800000, savingsRate: 25, returnRate: 6.5, salaryGrowth: 3.0, propGrowth: 2.5, retireAge: 60 },
      expense: { essential: 3200, discretionary: 1200 }
    },
    midcareer: {
      theme: 'theme-navy',
      banks: {
        dbs: { balance: 25000, multiplierActive: true, mSalary: true, mCard: true, mHome: false, mInvest: false, mAmount: 5000 },
        uob: { balance: 0, oneActive: false, oneCard: false, oneSalary: false, oneGiro: false },
        ocbc: { balance: 90000, active360: true, bSalary: true, bSave: true, bSpend: true, bInsure: false, bInvest: false, bGrow: true },
        scb: { balance: 0, bonusActive: false, bSalary: false, bSpend500: false, bSpend2000: false, bBills: false, bInvest: false },
        hsbc: { balance: 5000, customRate: 0.05 },
        citi: { balance: 10000, customRate: 0.05 },
        maybank: { balance: 0, customRate: 0.05 },
        boc: { balance: 0, customRate: 0.05 }
      },
      cpf: { age: 42, salary: 12500, oa: 145000, sa: 112000, ma: 68000, ra: 0 },
      assets: {
        propValuation: 1450000, propLoan: 820000, propMortgage: 3650, propApr: 3.2,
        invStocks: 145000, invCrypto: 12000, invSrs: 22000, invOther: 10000,
        loanCar: 65000, pmtCar: 1400, loanPersonal: 0, pmtPersonal: 0, loanCc: 2500
      },
      sim: { goal: 2000000, savingsRate: 35, returnRate: 7.0, salaryGrowth: 3.5, propGrowth: 2.5, retireAge: 55 },
      expense: { essential: 5500, discretionary: 2000 }
    },
    fire: {
      theme: 'theme-cyberpunk',
      banks: {
        dbs: { balance: 2500, multiplierActive: false, mSalary: false, mCard: false, mHome: false, mInvest: false, mAmount: 0 },
        uob: { balance: 100000, oneActive: true, oneCard: true, oneSalary: true, oneGiro: false },
        ocbc: { balance: 5000, active360: false, bSalary: false, bSave: false, bSpend: false, bInsure: false, bInvest: false, bGrow: false },
        scb: { balance: 35000, bonusActive: true, bSalary: true, bSpend500: true, bSpend2000: false, bBills: true, bInvest: false },
        hsbc: { balance: 0, customRate: 0.05 },
        citi: { balance: 0, customRate: 0.05 },
        maybank: { balance: 0, customRate: 0.05 },
        boc: { balance: 0, customRate: 0.05 }
      },
      cpf: { age: 35, salary: 14500, oa: 180000, sa: 165000, ma: 72000, ra: 0 },
      assets: {
        propValuation: 0, propLoan: 0, propMortgage: 0, propApr: 3.0,
        invStocks: 420000, invCrypto: 65000, invSrs: 35000, invOther: 15000,
        loanCar: 0, pmtCar: 0, loanPersonal: 0, pmtPersonal: 0, loanCc: 800
      },
      sim: { goal: 1500000, savingsRate: 65, returnRate: 8.0, salaryGrowth: 4.0, propGrowth: 2.5, retireAge: 45 },
      expense: { essential: 1800, discretionary: 700 }
    },
    retiree: {
      theme: 'theme-aura',
      banks: {
        dbs: { balance: 12000, multiplierActive: false, mSalary: false, mCard: false, mHome: false, mInvest: false, mAmount: 0 },
        uob: { balance: 65000, oneActive: true, oneCard: true, oneSalary: false, oneGiro: true },
        ocbc: { balance: 2500, active360: false, bSalary: false, bSave: false, bSpend: false, bInsure: false, bInvest: false, bGrow: false },
        scb: { balance: 0, bonusActive: false, bSalary: false, bSpend500: false, bSpend2000: false, bBills: false, bInvest: false },
        hsbc: { balance: 10000, customRate: 0.05 },
        citi: { balance: 15000, customRate: 0.05 },
        maybank: { balance: 0, customRate: 0.05 },
        boc: { balance: 0, customRate: 0.05 }
      },
      cpf: { age: 58, salary: 0, oa: 45000, sa: 0, ma: 73000, ra: 315000 },
      assets: {
        propValuation: 720000, propLoan: 0, propMortgage: 0, propApr: 3.0,
        invStocks: 320000, invCrypto: 0, invSrs: 45000, invOther: 0,
        loanCar: 0, pmtCar: 0, loanPersonal: 0, pmtPersonal: 0, loanCc: 400
      },
      sim: { goal: 1200000, savingsRate: 0, returnRate: 4.5, salaryGrowth: 0, propGrowth: 2.5, retireAge: 65 },
      expense: { essential: 1500, discretionary: 800 }
    }
  };

  const selectedPreset = presets[presetName];
  if (!selectedPreset) return;

  state = mergeDeep(state, selectedPreset);
  syncInputsDOM();
  changeTheme(selectedPreset.theme, true);
  
  // Explicitly update select dropdown in DOM
  const select = document.getElementById('profile-preset-select');
  if (select) {
    select.value = presetName;
  }
  
  updateCalculations();
}

function resetProfileSelect() {
  const select = document.getElementById('profile-preset-select');
  if (select) {
    select.value = 'custom';
  }
}

// Tab Switching Navigation
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update nav buttons
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick').includes(tabId)) {
      item.classList.add('active');
    }
  });

  // Update view visibility
  const views = document.querySelectorAll('.content-view');
  views.forEach(view => {
    view.classList.remove('active');
  });
  
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  const titleMap = {
    dashboard: 'Financial Pulse',
    banks: 'Singapore Bank Accounts',
    cpf: 'Singapore CPF Planner',
    household: 'Household & Joint Finances',
    assets: 'Assets & Liabilities',
    simulator: 'Scenario Simulator',
    expense: 'Expense & Debt Advisor',
    chat: 'PulseAI Financial Coach'
  };
  const subtitleMap = {
    dashboard: 'Track, compound, and simulate your path to wealth.',
    banks: 'Model high-yield savings interest rates dynamically.',
    cpf: 'Ordinary, Special, Medisave, and Retirement Accounts compounded.',
    household: 'Model joint family members, salaries, and assets for aggregate net worth planning.',
    assets: 'Real estate, stock portfolios, and debt amortization.',
    simulator: 'Toggle parameters in real-time to plan retirement targets.',
    expense: 'Define your monthly living expenses to analyze budget health.',
    chat: 'Interactive state-aware financial planning powered by local rules or Google Gemini.'
  };

  document.getElementById('page-title').innerText = titleMap[tabId] || 'Financial Pulse';
  document.getElementById('page-subtitle').innerText = subtitleMap[tabId] || '';

  // Trigger charts redraw if switching to dashboard
  if (tabId === 'dashboard') {
    updateCharts();
  }
  
  saveState();
}

// Synchronize inputs in DOM with current state
function syncInputsDOM() {
  // 1. Banks
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const setChecked = (id, check) => { const el = document.getElementById(id); if (el) el.checked = check; };

  // DBS
  setVal('dbs-balance', state.banks.dbs.balance);
  setChecked('dbs-multiplier-active', state.banks.dbs.multiplierActive);
  setChecked('dbs-m-salary', state.banks.dbs.mSalary);
  setChecked('dbs-m-card', state.banks.dbs.mCard);
  setChecked('dbs-m-home', state.banks.dbs.mHome);
  setChecked('dbs-m-invest', state.banks.dbs.mInvest);
  setVal('dbs-m-amount', state.banks.dbs.mAmount);
  toggleMultiplierInputs('dbs');

  // UOB
  setVal('uob-balance', state.banks.uob.balance);
  setChecked('uob-one-active', state.banks.uob.oneActive);
  setChecked('uob-one-card', state.banks.uob.oneCard);
  setChecked('uob-one-salary', state.banks.uob.oneSalary);
  setChecked('uob-one-giro', state.banks.uob.oneGiro);
  toggleMultiplierInputs('uob');

  // OCBC
  setVal('ocbc-balance', state.banks.ocbc.balance);
  setChecked('ocbc-360-active', state.banks.ocbc.active360);
  setChecked('ocbc-b-salary', state.banks.ocbc.bSalary);
  setChecked('ocbc-b-save', state.banks.ocbc.bSave);
  setChecked('ocbc-b-spend', state.banks.ocbc.bSpend);
  setChecked('ocbc-b-insure', state.banks.ocbc.bInsure);
  setChecked('ocbc-b-invest', state.banks.ocbc.bInvest);
  setChecked('ocbc-b-grow', state.banks.ocbc.bGrow);
  toggleMultiplierInputs('ocbc');

  // SCB
  setVal('scb-balance', state.banks.scb.balance);
  setChecked('scb-bonus-active', state.banks.scb.bonusActive);
  setChecked('scb-b-salary', state.banks.scb.bSalary);
  setChecked('scb-b-spend500', state.banks.scb.bSpend500);
  setChecked('scb-b-spend2000', state.banks.scb.bSpend2000);
  setChecked('scb-b-bills', state.banks.scb.bBills);
  setChecked('scb-b-invest', state.banks.scb.bInvest);
  toggleMultiplierInputs('scb');

  // Others
  setVal('hsbc-balance', state.banks.hsbc.balance);
  setVal('hsbc-custom-rate', state.banks.hsbc.customRate);
  setVal('citi-balance', state.banks.citi.balance);
  setVal('citi-custom-rate', state.banks.citi.customRate);
  setVal('maybank-balance', state.banks.maybank.balance);
  setVal('maybank-custom-rate', state.banks.maybank.customRate);
  setVal('boc-balance', state.banks.boc.balance);
  setVal('boc-custom-rate', state.banks.boc.customRate);

  // 2. CPF
  setVal('cpf-age', state.cpf.age);
  setVal('cpf-salary', state.cpf.salary);
  setVal('cpf-oa-bal', state.cpf.oa);
  setVal('cpf-sa-bal', state.cpf.sa);
  setVal('cpf-ma-bal', state.cpf.ma);
  setVal('cpf-ra-bal', state.cpf.ra);

  // Age-based display toggle for RA
  const raWrapper = document.getElementById('ra-bal-wrapper');
  if (raWrapper) {
    raWrapper.style.display = state.cpf.age >= 55 ? 'block' : 'none';
  }

  // 3. Assets & Loans
  setVal('prop-valuation', state.assets.propValuation);
  setVal('prop-loan', state.assets.propLoan);
  setVal('prop-mortgage', state.assets.propMortgage);
  setVal('prop-apr', state.assets.propApr);
  setVal('inv-stocks', state.assets.invStocks);
  setVal('inv-crypto', state.assets.invCrypto);
  setVal('inv-srs', state.assets.invSrs);
  setVal('inv-other', state.assets.invOther);
  setVal('loan-car', state.assets.loanCar);
  setVal('pmt-car', state.assets.pmtCar);
  setVal('loan-personal', state.assets.loanPersonal);
  setVal('pmt-personal', state.assets.pmtPersonal);
  setVal('loan-cc', state.assets.loanCc);

  // 4. Simulator Sliders
  const setSlider = (id, val, textId, type) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
    updateSimValue(id, textId, type);
  };
  setSlider('sim-goal', state.sim.goal, 'val-sim-goal', 'money');
  setSlider('sim-savings', state.sim.savingsRate, 'val-sim-savings', 'percent');
  setSlider('sim-return', state.sim.returnRate, 'val-sim-return', 'rate');
  setSlider('sim-inc', state.sim.salaryGrowth, 'val-sim-inc', 'rate');
  setSlider('sim-prop', state.sim.propGrowth, 'val-sim-prop', 'rate');
  setSlider('sim-retire', state.sim.retireAge, 'val-sim-retire', 'age');

  // 5. Expense Advisor Sliders
  if (state.expense === undefined) {
    state.expense = { essential: 1800, discretionary: 800 };
  }
  setSlider('exp-essential', state.expense.essential, 'val-exp-essential', 'money');
  setSlider('exp-discretionary', state.expense.discretionary, 'val-exp-discretionary', 'money');

  // 6. PulseAI Coach Settings
  if (state.chat === undefined) {
    state.chat = { apiKey: '', persona: 'analyst' };
  }
  setVal('gemini-api-key', state.chat.apiKey);
  setVal('chat-persona', state.chat.persona);
  updateChatUI();

  // 7. Household Panel
  if (state.household === undefined) {
    state.household = { enabled: false, members: [
      { id: 'm1', name: 'Spouse (Eve)', relation: 'spouse', age: 28, salary: 5000, oa: 25000, sa: 15000, ma: 12000, ra: 0, bankBalance: 15000 }
    ] };
  }
  setChecked('household-enabled', state.household.enabled);
  
  const pill = document.getElementById('household-mode-pill');
  if (pill) {
    pill.style.display = state.household.enabled ? 'flex' : 'none';
  }

  renderHouseholdMembers();
}

// Toggle multi-categories panels on checking bank optimize
function toggleMultiplierInputs(bankId) {
  const activeChk = document.getElementById(`${bankId}-${bankId === 'dbs' ? 'multiplier' : bankId === 'uob' ? 'one' : bankId === 'ocbc' ? '360' : 'bonus'}-active`);
  const panel = document.getElementById(`${bankId}-${bankId === 'dbs' ? 'multiplier' : bankId === 'uob' ? 'one' : bankId === 'ocbc' ? '360' : 'bonus'}-panel`);
  
  if (activeChk && panel) {
    panel.style.display = activeChk.checked ? 'block' : 'none';
  }
  updateCalculations();
}

// Update text label beside sliders
function updateSimValue(sliderId, labelId, formatType) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (!slider || !label) return;

  const val = parseFloat(slider.value);
  if (formatType === 'money') {
    label.innerText = formatMoney(val);
  } else if (formatType === 'percent') {
    label.innerText = `${val}%`;
  } else if (formatType === 'rate') {
    label.innerText = `${val.toFixed(1)}%`;
  } else if (formatType === 'age') {
    label.innerText = `${val} Years Old`;
  }
}

// Standard currency formatting
function formatMoney(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0
  }).format(amount).replace('SGD', 'S$');
}

// Bind DOM event listeners to sync state objects
function setupInputListeners() {
  // Bind standard text / checkbox inputs
  const textInputs = [
    { id: 'dbs-balance', path: 'banks.dbs.balance', isNum: true },
    { id: 'dbs-m-amount', path: 'banks.dbs.mAmount', isNum: true },
    { id: 'uob-balance', path: 'banks.uob.balance', isNum: true },
    { id: 'ocbc-balance', path: 'banks.ocbc.balance', isNum: true },
    { id: 'scb-balance', path: 'banks.scb.balance', isNum: true },
    { id: 'hsbc-balance', path: 'banks.hsbc.balance', isNum: true },
    { id: 'hsbc-custom-rate', path: 'banks.hsbc.customRate', isNum: true },
    { id: 'citi-balance', path: 'banks.citi.balance', isNum: true },
    { id: 'citi-custom-rate', path: 'banks.citi.customRate', isNum: true },
    { id: 'maybank-balance', path: 'banks.maybank.balance', isNum: true },
    { id: 'maybank-custom-rate', path: 'banks.maybank.customRate', isNum: true },
    { id: 'boc-balance', path: 'banks.boc.balance', isNum: true },
    { id: 'boc-custom-rate', path: 'banks.boc.customRate', isNum: true },

    { id: 'cpf-age', path: 'cpf.age', isNum: true },
    { id: 'cpf-salary', path: 'cpf.salary', isNum: true },
    { id: 'cpf-oa-bal', path: 'cpf.oa', isNum: true },
    { id: 'cpf-sa-bal', path: 'cpf.sa', isNum: true },
    { id: 'cpf-ma-bal', path: 'cpf.ma', isNum: true },
    { id: 'cpf-ra-bal', path: 'cpf.ra', isNum: true },

    { id: 'prop-valuation', path: 'assets.propValuation', isNum: true },
    { id: 'prop-loan', path: 'assets.propLoan', isNum: true },
    { id: 'prop-mortgage', path: 'assets.propMortgage', isNum: true },
    { id: 'prop-apr', path: 'assets.propApr', isNum: true },
    { id: 'inv-stocks', path: 'assets.invStocks', isNum: true },
    { id: 'inv-crypto', path: 'assets.invCrypto', isNum: true },
    { id: 'inv-srs', path: 'assets.invSrs', isNum: true },
    { id: 'inv-other', path: 'assets.invOther', isNum: true },
    { id: 'loan-car', path: 'assets.loanCar', isNum: true },
    { id: 'pmt-car', path: 'assets.pmtCar', isNum: true },
    { id: 'loan-personal', path: 'assets.loanPersonal', isNum: true },
    { id: 'pmt-personal', path: 'assets.pmtPersonal', isNum: true },
    { id: 'loan-cc', path: 'assets.loanCc', isNum: true },

    { id: 'sim-goal', path: 'sim.goal', isNum: true },
    { id: 'sim-savings', path: 'sim.savingsRate', isNum: true },
    { id: 'sim-return', path: 'sim.returnRate', isNum: true },
    { id: 'sim-inc', path: 'sim.salaryGrowth', isNum: true },
    { id: 'sim-prop', path: 'sim.propGrowth', isNum: true },
    { id: 'sim-retire', path: 'sim.retireAge', isNum: true },
    
    { id: 'exp-essential', path: 'expense.essential', isNum: true },
    { id: 'exp-discretionary', path: 'expense.discretionary', isNum: true }
  ];

  textInputs.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener('input', () => {
        let val = el.value;
        if (item.isNum) {
          val = parseFloat(val) || 0;
        }
        setDeepValue(state, item.path, val);
        saveState();

        // Specific toggle for RA bal wrapper
        if (item.id === 'cpf-age') {
          const wrapper = document.getElementById('ra-bal-wrapper');
          if (wrapper) wrapper.style.display = val >= 55 ? 'block' : 'none';
        }

        updateCalculations();
      });
    }
  });

  const checkInputs = [
    { id: 'dbs-multiplier-active', path: 'banks.dbs.multiplierActive' },
    { id: 'dbs-m-salary', path: 'banks.dbs.mSalary' },
    { id: 'dbs-m-card', path: 'banks.dbs.mCard' },
    { id: 'dbs-m-home', path: 'banks.dbs.mHome' },
    { id: 'dbs-m-invest', path: 'banks.dbs.mInvest' },

    { id: 'uob-one-active', path: 'banks.uob.oneActive' },
    { id: 'uob-one-card', path: 'banks.uob.oneCard' },
    { id: 'uob-one-salary', path: 'banks.uob.oneSalary' },
    { id: 'uob-one-giro', path: 'banks.uob.oneGiro' },

    { id: 'ocbc-360-active', path: 'banks.ocbc.active360' },
    { id: 'ocbc-b-salary', path: 'banks.ocbc.bSalary' },
    { id: 'ocbc-b-save', path: 'banks.ocbc.bSave' },
    { id: 'ocbc-b-spend', path: 'banks.ocbc.bSpend' },
    { id: 'ocbc-b-insure', path: 'banks.ocbc.bInsure' },
    { id: 'ocbc-b-invest', path: 'banks.ocbc.bInvest' },
    { id: 'ocbc-b-grow', path: 'banks.ocbc.bGrow' },

    { id: 'scb-bonus-active', path: 'banks.scb.bonusActive' },
    { id: 'scb-b-salary', path: 'banks.scb.bSalary' },
    { id: 'scb-b-spend500', path: 'banks.scb.bSpend500' },
    { id: 'scb-b-spend2000', path: 'banks.scb.bSpend2000' },
    { id: 'scb-b-bills', path: 'banks.scb.bBills' },
    { id: 'scb-b-invest', path: 'banks.scb.bInvest' }
  ];

  checkInputs.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.addEventListener('change', () => {
        setDeepValue(state, item.path, el.checked);
        saveState();
        updateCalculations();
      });
    }
  });
}

// --- Import / Export / Reset Profile data (Saveable) ---
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "pulse_sg_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function triggerImport() {
  const fileInput = document.getElementById('import-file-input');
  if (fileInput) fileInput.click();
}

function importData(event) {
  const input = event.target;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = function() {
    try {
      const parsed = JSON.parse(reader.result);
      state = mergeDeep(state, parsed);
      saveState();
      syncInputsDOM();
      updateCalculations();
      alert("Profile imported successfully!");
    } catch (e) {
      alert("Invalid backup file format. Please upload a valid JSON profile.");
    }
  };
  
  reader.readAsText(file);
  input.value = '';
}

function resetData() {
  if (confirm("Are you sure you want to reset all variables to default? This will clear all bank balances, CPF data, and local storage state.")) {
    localStorage.removeItem('wealthPulseState');
    window.location.reload();
  }
}

// Deep property path helper
function setDeepValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

/* ==========================================
   INTEREST & CALCULATIONS ENGINE
   ========================================== */

// 1. Calculate DBS Multiplier rate
function calcDbsRate(dbsState) {
  if (!dbsState.multiplierActive) return 0.05;

  const isSalary = dbsState.mSalary;
  const card = dbsState.mCard;
  const home = dbsState.mHome;
  const invest = dbsState.mInvest;
  const totalVol = dbsState.mAmount;

  if (!isSalary) return 0.05; // Salary/Dividend credit is mandatory for multiplier tier rates

  // Count active extra categories (excluding Salary credit itself)
  let extraCategories = 0;
  if (card) extraCategories++;
  if (home) extraCategories++;
  if (invest) extraCategories++;

  if (extraCategories === 0) return 0.05;

  if (totalVol >= 2000 && totalVol < 5000) {
    return extraCategories === 1 ? 1.50 : 2.10;
  } else if (totalVol >= 5000) {
    return extraCategories === 1 ? 1.80 : 2.40;
  }

  return 0.05;
}

// 2. Calculate UOB One Account rate
function calcUobRate(uobState) {
  if (!uobState.oneActive) return 0.05;

  const card = uobState.oneCard;
  const salary = uobState.oneSalary;
  const giro = uobState.oneGiro;
  const balance = uobState.balance;

  if (!card) return 0.05; // Min $500 card spend is mandatory

  let isSalaryRoute = salary;
  let isGiroRoute = giro && !salary;

  if (!isSalaryRoute && !isGiroRoute) return 0.05;

  // Let's compute effective interest rate based on balances
  let interestEarned = 0;

  if (isSalaryRoute) {
    // Tiers: first 30k (3.0%), next 30k (4.0%), next 40k (6.0%). Balance above 100k (0.05%)
    let remaining = balance;
    
    // Tier 1: 0 - 30k
    let t1 = Math.min(30000, remaining);
    interestEarned += t1 * 0.03;
    remaining -= t1;

    // Tier 2: 30k - 60k
    let t2 = Math.min(30000, remaining);
    interestEarned += t2 * 0.04;
    remaining -= t2;

    // Tier 3: 60k - 100k
    let t3 = Math.min(40000, remaining);
    interestEarned += t3 * 0.06;
    remaining -= t3;

    // Tier 4: above 100k
    if (remaining > 0) {
      interestEarned += remaining * 0.0005;
    }
  } else {
    // Card + 3 GIRO Route: first 30k (2.5%), next 30k (3.0%), next 40k (4.0%). Balance above 100k (0.05%)
    let remaining = balance;
    
    let t1 = Math.min(30000, remaining);
    interestEarned += t1 * 0.025;
    remaining -= t1;

    let t2 = Math.min(30000, remaining);
    interestEarned += t2 * 0.03;
    remaining -= t2;

    let t3 = Math.min(40000, remaining);
    interestEarned += t3 * 0.04;
    remaining -= t3;

    if (remaining > 0) {
      interestEarned += remaining * 0.0005;
    }
  }

  if (balance <= 0) return 0.05;
  const effectiveRate = (interestEarned / balance) * 100;
  return effectiveRate;
}

// 3. Calculate OCBC 360 Account rate
function calcOcbcRate(ocbcState) {
  if (!ocbcState.active360) return 0.05;

  let totalRate = 0.05; // Base rate
  const bal = ocbcState.balance;
  const applicableBal = Math.min(100000, bal); // Badges apply to first 100k

  if (applicableBal <= 0) return 0.05;

  let bonusEarned = 0;

  // OCBC 360 Tiers on first $100k:
  // Salary Badge: 2.0% on first $75k, 4.0% on next $25k -> average 2.5% p.a.
  if (ocbcState.bSalary) {
    bonusEarned += Math.min(75000, applicableBal) * 0.020 + Math.max(0, applicableBal - 75000) * 0.040;
  }
  // Save Badge: 1.2% on first 75k, 2.4% on next 25k -> average 1.5% p.a.
  if (ocbcState.bSave) {
    bonusEarned += Math.min(75000, applicableBal) * 0.012 + Math.max(0, applicableBal - 75000) * 0.024;
  }
  // Spend Badge: 0.6% on first 100k
  if (ocbcState.bSpend) {
    bonusEarned += applicableBal * 0.006;
  }
  // Insure Badge: 1.2% on first 100k
  if (ocbcState.bInsure) {
    bonusEarned += applicableBal * 0.012;
  }
  // Invest Badge: 1.2% on first 100k
  if (ocbcState.bInvest) {
    bonusEarned += applicableBal * 0.012;
  }
  // Grow Badge: 1.2% on first 100k (only if average balance is above 200k, but we model on the first 100k)
  if (ocbcState.bGrow) {
    bonusEarned += applicableBal * 0.012;
  }

  // Base interest on total balance
  let baseEarned = bal * 0.0005;
  let totalInterest = baseEarned + bonusEarned;

  return (totalInterest / bal) * 100;
}

// 4. Calculate SCB BonusSaver rate
function calcScbRate(scbState) {
  if (!scbState.bonusActive) return 0.05;

  const bal = scbState.balance;
  const applicableBal = Math.min(100000, bal);
  if (applicableBal <= 0) return 0.05;

  let bonusRate = 0;

  if (scbState.bSalary) bonusRate += 2.00;
  
  if (scbState.bSpend2000) {
    bonusRate += 1.40;
  } else if (scbState.bSpend500) {
    bonusRate += 0.60;
  }

  if (scbState.bBills) bonusRate += 0.10;
  if (scbState.bInvest) bonusRate += 0.90;

  let totalInterest = (applicableBal * (bonusRate / 100)) + (bal * 0.0005);
  return (totalInterest / bal) * 100;
}

// 5. CPF rates and allocations based on age
function getCpfAllocations(age) {
  // Citizen rates/splits for standard employer (17%) and employee (20%) - Total 37%
  if (age <= 35) {
    return {
      employee: 20.0, employer: 17.0, total: 37.0,
      oa: 0.6217, sa: 0.1621, ma: 0.2162
    };
  } else if (age <= 45) {
    return {
      employee: 20.0, employer: 17.0, total: 37.0,
      oa: 0.5677, sa: 0.1891, ma: 0.2432
    };
  } else if (age <= 50) {
    return {
      employee: 20.0, employer: 17.0, total: 37.0,
      oa: 0.5136, sa: 0.2162, ma: 0.2702
    };
  } else if (age <= 55) {
    return {
      employee: 20.0, employer: 17.0, total: 37.0,
      oa: 0.4055, sa: 0.3108, ma: 0.2837
    };
  } else if (age <= 60) {
    // 2026 rates for age 55-60
    return {
      employee: 15.0, employer: 14.5, total: 29.5,
      oa: 0.4068, sa: 0.2712, ma: 0.3220
    };
  } else if (age <= 65) {
    return {
      employee: 10.5, employer: 11.5, total: 22.0,
      oa: 0.1591, sa: 0.3409, ma: 0.5000
    };
  } else if (age <= 70) {
    return {
      employee: 7.5, employer: 9.0, total: 16.5,
      oa: 0.0606, sa: 0.2727, ma: 0.6667
    };
  } else {
    return {
      employee: 5.0, employer: 7.5, total: 12.5,
      oa: 0.0800, sa: 0.1200, ma: 0.8000
    };
  }
}

// Calculate CPF annual extra interest (+1% on combined balances up to 60k, capped 20k for OA)
function calcCpfExtraInterest(oa, sa, ma) {
  const combined = oa + sa + ma;
  const bonusBase = Math.min(60000, combined);
  const oaBonusPortion = Math.min(20000, oa, bonusBase);
  const saMaBonusPortion = Math.max(0, bonusBase - oaBonusPortion);

  const oaBonusInterest = oaBonusPortion * 0.01;
  const saMaBonusInterest = saMaBonusPortion * 0.01;

  return {
    total: oaBonusInterest + saMaBonusInterest,
    oa: oaBonusInterest,
    saMa: saMaBonusInterest
  };
}

/* ==========================================
   GLOBAL UPDATE & GRAPH ENGINE
   ========================================== */

function updateCalculations() {
  // Sync state values that might have been loaded but not updated
  const dbsBal = state.banks.dbs.balance;
  const uobBal = state.banks.uob.balance;
  const ocbcBal = state.banks.ocbc.balance;
  const scbBal = state.banks.scb.balance;
  const hsbcBal = state.banks.hsbc.balance;
  const citiBal = state.banks.citi.balance;
  const maybankBal = state.banks.maybank.balance;
  const bocBal = state.banks.boc.balance;

  // 1. Compute individual bank rates and interest
  const dbsRateVal = calcDbsRate(state.banks.dbs);
  const dbsInt = dbsBal * (dbsRateVal / 100);
  document.getElementById('dbs-badge').innerText = formatMoney(dbsBal);
  document.getElementById('dbs-rate').innerText = `${dbsRateVal.toFixed(2)}% p.a.`;
  document.getElementById('dbs-interest').innerText = formatMoney(dbsInt);

  const uobRateVal = calcUobRate(state.banks.uob);
  const uobInt = uobBal * (uobRateVal / 100);
  document.getElementById('uob-badge').innerText = formatMoney(uobBal);
  document.getElementById('uob-rate').innerText = `${uobRateVal.toFixed(2)}% p.a.`;
  document.getElementById('uob-interest').innerText = formatMoney(uobInt);

  const ocbcRateVal = calcOcbcRate(state.banks.ocbc);
  const ocbcInt = ocbcBal * (ocbcRateVal / 100);
  document.getElementById('ocbc-badge').innerText = formatMoney(ocbcBal);
  document.getElementById('ocbc-rate').innerText = `${ocbcRateVal.toFixed(2)}% p.a.`;
  document.getElementById('ocbc-interest').innerText = formatMoney(ocbcInt);

  const scbRateVal = calcScbRate(state.banks.scb);
  const scbInt = scbBal * (scbRateVal / 100);
  document.getElementById('scb-badge').innerText = formatMoney(scbBal);
  document.getElementById('scb-rate').innerText = `${scbRateVal.toFixed(2)}% p.a.`;
  document.getElementById('scb-interest').innerText = formatMoney(scbInt);

  // Custom rates for others
  const hsbcInt = hsbcBal * (state.banks.hsbc.customRate / 100);
  document.getElementById('hsbc-badge').innerText = formatMoney(hsbcBal);
  document.getElementById('hsbc-rate').innerText = `${state.banks.hsbc.customRate.toFixed(2)}% p.a.`;
  document.getElementById('hsbc-interest').innerText = formatMoney(hsbcInt);

  const citiInt = citiBal * (state.banks.citi.customRate / 100);
  document.getElementById('citi-badge').innerText = formatMoney(citiBal);
  document.getElementById('citi-rate').innerText = `${state.banks.citi.customRate.toFixed(2)}% p.a.`;
  document.getElementById('citi-interest').innerText = formatMoney(citiInt);

  const maybankInt = maybankBal * (state.banks.maybank.customRate / 100);
  document.getElementById('maybank-badge').innerText = formatMoney(maybankBal);
  document.getElementById('maybank-rate').innerText = `${state.banks.maybank.customRate.toFixed(2)}% p.a.`;
  document.getElementById('maybank-interest').innerText = formatMoney(maybankInt);

  const bocInt = bocBal * (state.banks.boc.customRate / 100);
  document.getElementById('boc-badge').innerText = formatMoney(bocBal);
  document.getElementById('boc-rate').innerText = `${state.banks.boc.customRate.toFixed(2)}% p.a.`;
  document.getElementById('boc-interest').innerText = formatMoney(bocInt);

  let memberBankTotal = 0;
  let memberOaTotal = 0;
  let memberSaTotal = 0;
  let memberMaTotal = 0;
  let memberRaTotal = 0;

  if (state.household && state.household.enabled && state.household.members) {
    memberBankTotal = state.household.members.reduce((sum, m) => sum + Number(m.bankBalance || 0), 0);
    memberOaTotal = state.household.members.reduce((sum, m) => sum + Number(m.oa || 0), 0);
    memberSaTotal = state.household.members.reduce((sum, m) => sum + Number(m.sa || 0), 0);
    memberMaTotal = state.household.members.reduce((sum, m) => sum + Number(m.ma || 0), 0);
    memberRaTotal = state.household.members.reduce((sum, m) => sum + Number(m.ra || 0), 0);
  }

  const totalLiquidCash = dbsBal + uobBal + ocbcBal + scbBal + hsbcBal + citiBal + maybankBal + bocBal + memberBankTotal;

  // 2. CPF Calculations
  const cpfAge = state.cpf.age;
  const cpfSalary = state.cpf.salary;
  const cappedSalary = Math.min(8000, cpfSalary); // 2026 OW Ceiling is S$8,000

  const rates = getCpfAllocations(cpfAge);
  const employeeContrib = cappedSalary * (rates.employee / 100);
  const employerContrib = cappedSalary * (rates.employer / 100);
  const totalMonthlyContrib = employeeContrib + employerContrib;

  document.getElementById('cpf-employee-contrib').innerText = formatMoney(employeeContrib);
  document.getElementById('cpf-employer-contrib').innerText = formatMoney(employerContrib);
  document.getElementById('cpf-total-monthly').innerText = formatMoney(totalMonthlyContrib);

  // Set visual bar widths
  const employeePercent = (rates.employee / rates.total) * 100;
  const employerPercent = (rates.employer / rates.total) * 100;
  document.getElementById('split-employee-bar').style.width = `${employeePercent}%`;
  document.getElementById('split-employee-bar').innerText = `Employee (${rates.employee}%)`;
  document.getElementById('split-employer-bar').style.width = `${employerPercent}%`;
  document.getElementById('split-employer-bar').innerText = `Employer (${rates.employer}%)`;

  // Allocation flows
  const oaFlow = totalMonthlyContrib * rates.oa;
  const saFlow = totalMonthlyContrib * rates.sa;
  const maFlow = totalMonthlyContrib * rates.ma;

  document.getElementById('cpf-oa-pct').innerText = `${(rates.oa * 100).toFixed(2)}%`;
  document.getElementById('cpf-sa-pct').innerText = `${(rates.sa * 100).toFixed(2)}%`;
  document.getElementById('cpf-ma-pct').innerText = `${(rates.ma * 100).toFixed(2)}%`;

  document.getElementById('cpf-oa-flow').innerText = formatMoney(oaFlow);
  document.getElementById('cpf-sa-flow').innerText = formatMoney(saFlow);
  document.getElementById('cpf-ma-flow').innerText = formatMoney(maFlow);

  // Compounded interest estimate for this year
  const oaBal = state.cpf.oa + memberOaTotal;
  const saBal = state.cpf.sa + memberSaTotal;
  const maBal = state.cpf.ma + memberMaTotal;
  const raBal = state.cpf.ra + memberRaTotal;

  const currentCpfTotal = oaBal + saBal + maBal + raBal;
  document.getElementById('card-cpf-total').innerText = formatMoney(currentCpfTotal);
  document.getElementById('card-cpf-breakdown').innerText = `OA: ${formatMoney(oaBal)} | SA: ${formatMoney(saBal)} | MA: ${formatMoney(maBal)}` + (cpfAge >= 55 ? ` | RA: ${formatMoney(raBal)}` : '');

  // Interest is 2.5% for OA, 4.08% for SA/MA/RA
  let baseInterest = (oaBal * 0.025) + ((saBal + maBal + raBal) * 0.0408);
  const extraInt = calcCpfExtraInterest(oaBal, saBal, maBal);
  let estimatedInterestYear = baseInterest + extraInt.total;

  document.getElementById('cpf-est-interest').innerText = formatMoney(estimatedInterestYear);

  // Bonus interest message toggle
  const bonusPanel = document.getElementById('cpf-bonus-status');
  if (bonusPanel) {
    bonusPanel.style.display = currentCpfTotal > 0 ? 'flex' : 'none';
  }

  // 3. Asset & Loan summaries
  const stocks = state.assets.invStocks;
  const crypto = state.assets.invCrypto;
  const srs = state.assets.invSrs;
  const otherAssets = state.assets.invOther;
  const propVal = state.assets.propValuation;

  const totalInvestments = stocks + crypto + srs + otherAssets;
  const grossAssets = totalLiquidCash + currentCpfTotal + totalInvestments + propVal;

  const propLoan = state.assets.propLoan;
  const carLoan = state.assets.loanCar;
  const personalLoan = state.assets.loanPersonal;
  const ccDebt = state.assets.loanCc;
  const grossLiabilities = propLoan + carLoan + personalLoan + ccDebt;

  const netWorth = grossAssets - grossLiabilities;

  // Stat cards
  document.getElementById('card-total-assets').innerText = formatMoney(grossAssets);
  document.getElementById('card-total-liabilities').innerText = formatMoney(grossLiabilities);
  document.getElementById('card-networth').innerText = formatMoney(netWorth);
  document.getElementById('global-networth').innerText = formatMoney(netWorth);

  // Balance sheet page sync
  document.getElementById('sheet-cash').innerText = formatMoney(totalLiquidCash);
  document.getElementById('sheet-cpf').innerText = formatMoney(currentCpfTotal);
  document.getElementById('sheet-investments').innerText = formatMoney(totalInvestments);
  document.getElementById('sheet-property').innerText = formatMoney(propVal);
  document.getElementById('sheet-assets-total').innerText = formatMoney(grossAssets);
  document.getElementById('sheet-liabilities-total').innerText = formatMoney(grossLiabilities);

  // Goal settings
  const goalNW = state.sim.goal;
  const progressPercent = Math.min(100, Math.max(0, (netWorth / goalNW) * 100));

  document.getElementById('global-progress').innerText = `${progressPercent.toFixed(1)}%`;
  document.getElementById('goal-progress-text').innerText = `${formatMoney(netWorth)} of ${formatMoney(goalNW)}`;
  document.getElementById('global-progress-bar').style.width = `${progressPercent}%`;

  // 4. Compounded Projection & Simulation Engine (Run 30-Year forecast)
  const projection = run30YearSimulation(
    cpfAge, 
    totalLiquidCash, 
    totalInvestments, 
    currentCpfTotal,
    oaBal, saBal, maBal, raBal,
    propVal, propLoan,
    carLoan, personalLoan, ccDebt
  );

  // Update Simulator View details
  document.getElementById('sim-nw-target-age').innerText = formatMoney(projection.targetAgeNW);
  document.getElementById('sim-liquid-target-age').innerText = formatMoney(projection.targetAgeLiquid);
  document.getElementById('sim-cpf-target-age').innerText = formatMoney(projection.targetAgeCpf);

  // Goal verdict banner
  const verdictBadge = document.getElementById('sim-status-badge');
  const verdictText = document.getElementById('sim-goal-verdict');
  const etaText = document.getElementById('goal-eta-text');

  if (projection.goalReachedAge !== null) {
    verdictBadge.className = "sim-status-glow";
    verdictText.innerText = `Goal reached at Age ${projection.goalReachedAge}!`;
    etaText.innerText = `Goal ETA: Age ${projection.goalReachedAge} (${projection.goalReachedAge - cpfAge} yrs)`;
  } else {
    verdictBadge.className = "sim-status-glow behind";
    verdictText.innerText = "Goal not reached by Age 85";
    etaText.innerText = `Goal ETA: Behind Schedule`;
  }

  // Simulator Narrative Feedback
  const narrative = document.getElementById('sim-narrative');
  if (narrative) {
    if (projection.goalReachedAge !== null) {
      const yearsDiff = state.sim.retireAge - projection.goalReachedAge;
      if (yearsDiff >= 0) {
        narrative.innerHTML = `At your current pace with a <strong>${state.sim.savingsRate}%</strong> savings rate and <strong>${state.sim.returnRate}%</strong> market return, you will cross your <strong>${formatMoney(goalNW)}</strong> target at age <strong>${projection.goalReachedAge}</strong>. This is <strong>${yearsDiff} years ahead</strong> of your target retirement age of ${state.sim.retireAge}!`;
      } else {
        narrative.innerHTML = `You will cross your <strong>${formatMoney(goalNW)}</strong> target at age <strong>${projection.goalReachedAge}</strong>. This is <strong>${Math.abs(yearsDiff)} years later</strong> than your preferred retirement target (Age ${state.sim.retireAge}). Consider increasing your savings rate or optimizing bank interest.`;
      }
    } else {
      narrative.innerHTML = `Based on a <strong>${state.sim.savingsRate}%</strong> savings rate and <strong>${state.sim.returnRate}%</strong> return rate, your net worth will grow to <strong>${formatMoney(projection.age85NW)}</strong> by age 85, but will not hit your S$ ${formatMoney(goalNW)} goal. Adjust sliders to see what triggers can close the gap.`;
    }
  }

  // 5. Generate action items & playbook dynamically
  generatePlaybook(projection, totalLiquidCash, dbsRateVal, uobRateVal, ocbcRateVal, scbRateVal);

  // 5b. Update Expense & Debt Advisor
  updateExpenseAdvisor(totalLiquidCash, employeeContrib);

  // 6. Draw / Update Charts
  updateCharts(projection.dataPoints, grossAssets, totalLiquidCash, currentCpfTotal, totalInvestments, propVal);
}

// Calculate and update the Expense & Debt Advisor view
function updateExpenseAdvisor(totalLiquidCash, employeeCPF) {
  const msrEl = document.getElementById('msr-value');
  if (!msrEl) return;

  const grossSalary = state.cpf.salary;
  const netSalary = Math.max(0, grossSalary - employeeCPF);
  
  if (state.expense === undefined) {
    state.expense = { essential: 1800, discretionary: 800 };
  }
  const essential = state.expense.essential;
  const discretionary = state.expense.discretionary;

  const totalDebtpmt = state.assets.propMortgage + state.assets.pmtCar + state.assets.pmtPersonal + state.assets.loanCc;
  const disposableSurplus = Math.max(-grossSalary, netSalary - essential - discretionary - totalDebtpmt);

  document.getElementById('advisor-gross-salary').innerText = formatMoney(grossSalary);
  document.getElementById('advisor-net-salary').innerText = formatMoney(netSalary);
  
  const surplusEl = document.getElementById('advisor-surplus');
  surplusEl.innerText = formatMoney(disposableSurplus);
  if (disposableSurplus < 0) {
    surplusEl.className = "text-danger";
  } else {
    surplusEl.className = "text-success";
  }

  // --- Singapore Debt Servicing Ratios ---
  // 1. MSR (Mortgage Servicing Ratio) - HDB flat limit: <= 30% of Gross monthly income
  const msr = grossSalary > 0 ? (state.assets.propMortgage / grossSalary) * 100 : 0;
  msrEl.innerText = `${msr.toFixed(1)}%`;
  
  const msrBadge = document.getElementById('msr-status-badge');
  const msrFeedback = document.getElementById('msr-feedback');
  if (msr > 30) {
    msrBadge.className = "sim-status-glow behind";
    msrFeedback.innerHTML = `Over HDB limit! MSR exceeds <strong>30%</strong> (S$ ${formatMoney(grossSalary * 0.3)} max).`;
  } else {
    msrBadge.className = "sim-status-glow";
    msrFeedback.innerHTML = `Healthy. Mortgage is under <strong>30%</strong> HDB ceiling.`;
  }

  // 2. TDSR (Total Debt Servicing Ratio) - MAS limit: <= 55% of Gross monthly income
  const tdsr = grossSalary > 0 ? (totalDebtpmt / grossSalary) * 100 : 0;
  document.getElementById('tdsr-value').innerText = `${tdsr.toFixed(1)}%`;

  const tdsrBadge = document.getElementById('tdsr-status-badge');
  const tdsrFeedback = document.getElementById('tdsr-feedback');
  if (tdsr > 55) {
    tdsrBadge.className = "sim-status-glow behind";
    tdsrFeedback.innerHTML = `Over MAS limit! TDSR exceeds <strong>55%</strong> (S$ ${formatMoney(grossSalary * 0.55)} max).`;
  } else if (tdsr > 40) {
    tdsrBadge.className = "sim-status-glow warning-glow";
    tdsrFeedback.innerHTML = `Moderate. Total debts consume over <strong>40%</strong> of income.`;
  } else {
    tdsrBadge.className = "sim-status-glow";
    tdsrFeedback.innerHTML = `Healthy. Debts are well within the <strong>55%</strong> MAS cap.`;
  }

  // --- 50/30/20 Rule Analyzer ---
  const needsSum = state.assets.propMortgage + state.assets.pmtCar + state.assets.pmtPersonal + essential;
  const wantsSum = discretionary;
  const savingsSum = Math.max(0, netSalary - needsSum - wantsSum);

  const needsShare = netSalary > 0 ? (needsSum / netSalary) * 100 : 0;
  const wantsShare = netSalary > 0 ? (wantsSum / netSalary) * 100 : 0;
  const savingsShare = netSalary > 0 ? (savingsSum / netSalary) * 100 : 0;

  // Set Needs progress bar
  document.getElementById('budget-needs-value').innerText = `${needsShare.toFixed(1)}%`;
  const needsBar = document.getElementById('budget-needs-bar');
  needsBar.style.width = `${Math.min(100, needsShare)}%`;
  needsBar.style.background = needsShare > 50 ? 'var(--color-danger)' : 'var(--color-primary)';
  document.getElementById('budget-needs-desc').innerText = `Essentials (bills, groceries, debts): ${formatMoney(needsSum)} / S$ ${formatMoney(netSalary * 0.5)} target`;

  // Set Wants progress bar
  document.getElementById('budget-wants-value').innerText = `${wantsShare.toFixed(1)}%`;
  const wantsBar = document.getElementById('budget-wants-bar');
  wantsBar.style.width = `${Math.min(100, wantsShare)}%`;
  wantsBar.style.background = wantsShare > 30 ? 'var(--color-warning)' : 'var(--color-accent)';
  document.getElementById('budget-wants-desc').innerText = `Discretionary (dining, lifestyle): ${formatMoney(wantsSum)} / S$ ${formatMoney(netSalary * 0.3)} target`;

  // Set Savings progress bar
  document.getElementById('budget-savings-value').innerText = `${savingsShare.toFixed(1)}%`;
  const savingsBar = document.getElementById('budget-savings-bar');
  savingsBar.style.width = `${Math.min(100, Math.max(0, savingsShare))}%`;
  savingsBar.style.background = savingsShare < 20 ? 'var(--color-danger)' : 'var(--color-success)';
  document.getElementById('budget-savings-desc').innerText = `Surplus Savings: ${formatMoney(savingsSum)} / S$ ${formatMoney(netSalary * 0.2)} target`;

  // --- Emergency Fund Planner ---
  const actualTarget = 6 * (essential + state.assets.propMortgage + state.assets.pmtCar + state.assets.pmtPersonal);
  document.getElementById('emergency-target-value').innerText = formatMoney(actualTarget);
  document.getElementById('emergency-current-value').innerText = formatMoney(totalLiquidCash);

  const advisoryTextEl = document.getElementById('emergency-advisory-text');
  if (totalLiquidCash >= actualTarget) {
    advisoryTextEl.className = "emergency-advisory healthy";
    const surplus = totalLiquidCash - actualTarget;
    advisoryTextEl.innerHTML = `<strong>Status: Fully Funded!</strong> You have S$ ${Math.round(surplus).toLocaleString()} surplus above your 6-month safety net. You can confidently deploy additional capital into higher-yielding investments like stock portfolios or CPF Special Account (SA).`;
  } else {
    const deficit = actualTarget - totalLiquidCash;
    advisoryTextEl.className = "emergency-advisory critical";
    advisoryTextEl.innerHTML = `<strong>Status: Underfunded (S$ ${Math.round(deficit).toLocaleString()} Deficit)</strong>. You have ${Math.max(0, Math.floor(totalLiquidCash / ((essential + totalDebtpmt) || 1)))} months of reserves. We recommend pausing high-risk equity/crypto purchases and accumulating liquid savings in a high-yield account (e.g. UOB One or OCBC 360) until you secure your safety net.`;
  }
}

// Projection & Amortization Simulator
function run30YearSimulation(
  startAge, 
  startCash, 
  startInvestments, 
  startCpfTotal,
  startOa, startSa, startMa, startRa,
  startPropVal, startPropLoan,
  startCarLoan, startPersonalLoan, startCcDebt
) {
  let age = startAge;
  let cash = startCash;
  let investments = startInvestments;
  let propVal = startPropVal;
  let propLoan = startPropLoan;
  
  let carLoan = startCarLoan;
  let personalLoan = startPersonalLoan;
  let ccDebt = startCcDebt;

  let oa = startOa;
  let sa = startSa;
  let ma = startMa;
  let ra = startRa;

  const currentSalary = state.cpf.salary;
  const savingsRate = state.sim.savingsRate / 100;
  const returnRate = state.sim.returnRate / 100;
  const salaryGrowth = state.sim.salaryGrowth / 100;
  const propGrowth = state.sim.propGrowth / 100;
  const targetGoal = state.sim.goal;
  const targetRetireAge = state.sim.retireAge;

  let dataPoints = [];
  let goalReachedAge = null;
  
  let targetAgeNW = 0;
  let targetAgeLiquid = 0;
  let targetAgeCpf = 0;

  // Track household members local accounts state
  let hMembers = [];
  if (state.household && state.household.enabled && state.household.members) {
    hMembers = state.household.members.map(m => ({
      id: m.id,
      relation: m.relation,
      name: m.name,
      age: Number(m.age) || 30,
      salary: Number(m.salary) || 0,
      bankBalance: Number(m.bankBalance) || 0,
      oa: Number(m.oa) || 0,
      sa: Number(m.sa) || 0,
      ma: Number(m.ma) || 0,
      ra: Number(m.ra) || 0
    }));
  }

  // Let's model year-by-year until age 85
  for (let year = 0; age <= 85; year++, age++) {
    // 1. Calculate assets & liabilities at the start of this year
    let cpfTotal = oa + sa + ma + ra;
    let memberBankTotal = 0;
    let memberCpfTotal = 0;

    for (let m of hMembers) {
      memberBankTotal += m.bankBalance;
      memberCpfTotal += (m.oa + m.sa + m.ma + m.ra);
    }

    let liquidAssets = cash + investments + memberBankTotal;
    let totalAssets = liquidAssets + cpfTotal + memberCpfTotal + propVal;
    let totalLiabilities = propLoan + carLoan + personalLoan + ccDebt;
    let netWorth = totalAssets - totalLiabilities;

    // Record datapoints
    dataPoints.push({
      age: age,
      netWorth: Math.round(netWorth),
      cpf: Math.round(cpfTotal + memberCpfTotal),
      liquid: Math.round(liquidAssets),
      property: Math.round(propVal - propLoan)
    });

    // Check if goal reached
    if (netWorth >= targetGoal && goalReachedAge === null) {
      goalReachedAge = age;
    }

    // Capture target age stats
    if (age === targetRetireAge) {
      targetAgeNW = netWorth;
      targetAgeLiquid = liquidAssets;
      targetAgeCpf = cpfTotal + memberCpfTotal;
    }

    // --- TRANSITIONS TO NEXT YEAR ---
    // Salary adjustment
    let yearSalary = currentSalary * Math.pow(1 + salaryGrowth, year);
    let cappedOW = Math.min(8000, yearSalary); // OW cap

    // CPF Contributions during the year for Primary User
    let rates = getCpfAllocations(age);
    let annualTotalCPFContrib = cappedOW * (rates.total / 100) * 12;
    
    // Allocate to CPF accounts
    let oaAdd = annualTotalCPFContrib * rates.oa;
    let saAdd = annualTotalCPFContrib * rates.sa;
    let maAdd = annualTotalCPFContrib * rates.ma;

    // Apply monthly savings rate (flow from salary)
    let annualLiquidSavings = (yearSalary * 12) * savingsRate;

    // Growth of liquid investments
    investments = investments * (1 + returnRate) + annualLiquidSavings;
    
    // Property value growth
    propVal = propVal * (1 + propGrowth);

    // Amortize property mortgage
    if (propLoan > 0) {
      let annualMortgagePmt = state.assets.propMortgage * 12;
      let interestCost = propLoan * (state.assets.propApr / 100);
      let principalPaydown = Math.max(0, annualMortgagePmt - interestCost);
      propLoan = Math.max(0, propLoan - principalPaydown);
    }

    // Amortize other loans
    if (carLoan > 0) {
      carLoan = Math.max(0, carLoan - (state.assets.pmtCar * 12));
    }
    if (personalLoan > 0) {
      personalLoan = Math.max(0, personalLoan - (state.assets.pmtPersonal * 12));
    }
    if (ccDebt > 0) {
      ccDebt = 0; 
    }

    // Process each Household Member Transition
    for (let m of hMembers) {
      let mAge = m.age + year;
      if (mAge > 85) continue; // Limit modeling to age 85
      
      let mYearSalary = m.salary * Math.pow(1 + salaryGrowth, year);
      let mAnnualSavings = (mYearSalary * 12) * savingsRate;

      // Add member savings directly to the household investment portfolio
      investments += mAnnualSavings;
      m.bankBalance = m.bankBalance * 1.015; // standard bank interest for cash hold

      if (m.salary > 0) {
        let mCappedOW = Math.min(8000, mYearSalary);
        let mRates = getCpfAllocations(mAge);
        let mAnnualCpfContrib = mCappedOW * (mRates.total / 100) * 12;

        let mOaAdd = mAnnualCpfContrib * mRates.oa;
        let mSaAdd = mAnnualCpfContrib * mRates.sa;
        let mMaAdd = mAnnualCpfContrib * mRates.ma;

        let mExtraInt = calcCpfExtraInterest(m.oa, m.sa, m.ma);
        m.oa = m.oa * 1.025 + mOaAdd + mExtraInt.oa;
        m.sa = m.sa * 1.0408 + mSaAdd;
        m.ma = m.ma * 1.0408 + mMaAdd + mExtraInt.saMa;

        const bhsCap = 71500;
        if (m.ma > bhsCap) {
          let mOverflow = m.ma - bhsCap;
          m.ma = bhsCap;
          if (mAge < 55) {
            m.sa += mOverflow;
          } else {
            m.oa += mOverflow;
          }
        }

        if (mAge === 54) {
          const frs = 205800;
          let mTransferFromSa = Math.min(m.sa, frs);
          m.sa -= mTransferFromSa;
          let mTransferFromOa = Math.min(m.oa, frs - mTransferFromSa);
          m.oa -= mTransferFromOa;
          m.ra = mTransferFromSa + mTransferFromOa;
        }

        if (m.ra > 0) {
          m.ra = m.ra * 1.0408;
        }
      } else {
        // Compound dependants' existing accounts without active contributions
        let mExtraInt = calcCpfExtraInterest(m.oa, m.sa, m.ma);
        m.oa = m.oa * 1.025 + mExtraInt.oa;
        m.sa = m.sa * 1.0408;
        m.ma = m.ma * 1.0408 + mExtraInt.saMa;

        if (mAge === 54) {
          const frs = 205800;
          let mTransferFromSa = Math.min(m.sa, frs);
          m.sa -= mTransferFromSa;
          let mTransferFromOa = Math.min(m.oa, frs - mTransferFromSa);
          m.oa -= mTransferFromOa;
          m.ra = mTransferFromSa + mTransferFromOa;
        }

        if (m.ra > 0) {
          m.ra = m.ra * 1.0408;
        }
      }
    }

    // CPF Interest Calculation at year-end for Primary User
    let extraInt = calcCpfExtraInterest(oa, sa, ma);
    
    oa = oa * 1.025 + oaAdd + extraInt.oa;
    sa = sa * 1.0408 + saAdd;
    ma = ma * 1.0408 + maAdd + extraInt.saMa;

    const bhsCap = 71500;
    if (ma > bhsCap) {
      let overflow = ma - bhsCap;
      ma = bhsCap;
      if (age < 55) {
        sa += overflow;
      } else {
        oa += overflow;
      }
    }

    if (age === 54) {
      const frs = 205800;
      let transferFromSa = Math.min(sa, frs);
      sa -= transferFromSa;
      let transferFromOa = Math.min(oa, frs - transferFromSa);
      oa -= transferFromOa;
      ra = transferFromSa + transferFromOa;
    }
    if (ra > 0) {
      ra = ra * 1.0408;
    }
  }

  return {
    dataPoints,
    goalReachedAge,
    targetAgeNW,
    targetAgeLiquid,
    targetAgeCpf,
    age85NW: dataPoints[dataPoints.length - 1].netWorth
  };
}

// Generate playbook based on computed metrics
function generatePlaybook(proj, liquidCash, dbsR, uobR, ocbcR, scbR) {
  const container = document.getElementById('playbook-container');
  if (!container) return;

  let items = [];

  // Check if bank cash is yielding low interest
  const bestRate = Math.max(dbsR, uobR, ocbcR, scbR);
  if (liquidCash > 20000 && bestRate < 2.0) {
    items.push(`<li><span class="bullet">➔</span> <div><strong>Optimize Liquid Balances:</strong> You have S$ ${Math.round(liquidCash).toLocaleString()} in banks yielding under 2% interest. Consider consolidating funds into <strong>UOB One</strong> (up to 4.0% effective) or <strong>OCBC 360</strong>.</div></li>`);
  }

  // Check CPF balances
  if (state.cpf.oa > 40000) {
    items.push(`<li><span class="bullet">➔</span> <div><strong>OA to SA Transfer:</strong> You have S$ ${Math.round(state.cpf.oa).toLocaleString()} in your Ordinary Account earning 2.5%. Transferring excess to Special Account earns <strong>4.08% p.a.</strong> (Warning: this is one-way).</div></li>`);
  }

  // Check returns rate
  if (state.sim.returnRate < 4.0) {
    items.push(`<li><span class="bullet">➔</span> <div><strong>Increase Portfolio Yields:</strong> An expected return of ${state.sim.returnRate}% is conservative. Diversifying into low-cost global equity ETFs or robo-advisors could help compound assets toward 6-8%.</div></li>`);
  }

  // If debt is high
  const debt = state.assets.loanCar + state.assets.loanPersonal + state.assets.loanCc;
  if (debt > 15000) {
    items.push(`<li><span class="bullet">➔</span> <div><strong>Deleverage High-Interest Loans:</strong> Pay off outstanding Credit Card debt (usually 26% p.a.) and Personal Loans first, as they drag down overall compound growth.</div></li>`);
  }

  // If goal not met
  if (proj.goalReachedAge === null) {
    items.push(`<li><span class="bullet">➔</span> <div><strong>Close the Gap:</strong> To reach your S$ ${state.sim.goal.toLocaleString()} goal, slide the <strong>Liquid Savings Rate</strong> up, or aim for a salary bump to increase CPF/Cash monthly flows.</div></li>`);
  } else {
    items.push(`<li><span class="bullet">➔</span> <div><strong>Goal Attained:</strong> You hit your target at age ${proj.goalReachedAge}. You can check the impact of lowering your retirement age or easing down your savings rate.</div></li>`);
  }

  container.innerHTML = items.join('');

  // Update Milestones on Overview Tab
  updateMilestones(proj);
}

// Generate milestones Checklist
function updateMilestones(proj) {
  const container = document.getElementById('milestones-container');
  if (!container) return;

  const goalNW = state.sim.goal;
  const currentNW = proj.dataPoints[0].netWorth;
  const currentOa = state.cpf.oa;
  const currentLiquid = state.banks.dbs.balance + state.banks.uob.balance + state.banks.ocbc.balance + state.banks.scb.balance + state.banks.hsbc.balance + state.banks.citi.balance + state.banks.maybank.balance + state.banks.boc.balance + state.assets.invStocks + state.assets.invCrypto;

  const items = [
    { title: "S$100k CPF Ordinary Account", check: currentOa >= 100000, val: `${formatMoney(currentOa)} / S$ 100k` },
    { title: "S$100k Liquid Portfolio", check: currentLiquid >= 100000, val: `${formatMoney(currentLiquid)} / S$ 100k` },
    { title: "Halfway Mark to Goal", check: currentNW >= (goalNW / 2), val: `${formatMoney(currentNW)} / ${formatMoney(goalNW / 2)}` },
    { title: "Fiat Millionaire Status", check: currentNW >= 1000000, val: `${formatMoney(currentNW)} / S$ 1M` },
    { title: "Target Net Worth Goal Reached", check: currentNW >= goalNW, val: `${formatMoney(currentNW)} / ${formatMoney(goalNW)}` }
  ];

  container.innerHTML = items.map(item => `
    <div class="milestone-item ${item.check ? 'completed' : ''}">
      <div class="milestone-status">${item.check ? '✓' : ''}</div>
      <span class="milestone-title">${item.title}</span>
      <span class="milestone-target">${item.val}</span>
    </div>
  `).join('');
}

// Update / Create Chart.js graphs
function updateCharts(projectionData = [], currentAssets = 0, cash = 0, cpf = 0, invest = 0, property = 0) {
  // Check if canvas elements exist (might not be rendered if tab is hidden)
  const projCtx = document.getElementById('projectionChart');
  const allocCtx = document.getElementById('allocationChart');

  if (!projCtx || !allocCtx) return;

  const activeTheme = themeColors[state.theme] || themeColors['theme-obsidian'];
  const isDark = activeTheme.isDark;
  const gridColor = activeTheme.grid;
  const textColor = activeTheme.text;
  
  const primaryColor = activeTheme.primary;
  const accentColor = activeTheme.accent;
  const successColor = activeTheme.success;
  const dangerColor = activeTheme.danger;
  const chartBg = activeTheme.chartBg;

  // --- 1. PROJECTION CHART ---
  if (projectionData.length > 0) {
    const labels = projectionData.map(d => `Age ${d.age}`);
    const nwData = projectionData.map(d => d.netWorth);
    const cpfData = projectionData.map(d => d.cpf);
    const liquidData = projectionData.map(d => d.liquid);
    const goalLine = projectionData.map(() => state.sim.goal);

    if (projectionChart) {
      projectionChart.destroy();
    }

    projectionChart = new Chart(projCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Net Worth',
            data: nwData,
            borderColor: primaryColor,
            backgroundColor: chartBg,
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 6
          },
          {
            label: 'CPF Wealth',
            data: cpfData,
            borderColor: successColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0
          },
          {
            label: 'Liquid Assets',
            data: liquidData,
            borderColor: accentColor,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0
          },
          {
            label: 'Goal Target',
            data: goalLine,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1.5,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false } // Custom legend in HTML
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Inter' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter' },
              callback: function(value) {
                if (value >= 1e6) return 'S$' + (value / 1e6).toFixed(1) + 'M';
                if (value >= 1e3) return 'S$' + (value / 1e3).toFixed(0) + 'k';
                return 'S$' + value;
              }
            }
          }
        }
      }
    });
  }

  // --- 2. ASSET ALLOCATION CHART ---
  if (allocationChart) {
    allocationChart.destroy();
  }

  const itemsList = [cash, cpf, invest, property];
  const itemsLabels = ['Cash in Banks', 'CPF Funds', 'Investments', 'Real Estate (Equity)'];
  const colorsList = [accentColor, successColor, primaryColor, '#f59e0b'];

  allocationChart = new Chart(allocCtx, {
    type: 'doughnut',
    data: {
      labels: itemsLabels,
      datasets: [{
        data: itemsList,
        backgroundColor: colorsList,
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#18181b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 10 },
            boxWidth: 8,
            padding: 10
          }
        }
      },
      cutout: '65%'
    }
  });
}

// ==========================================
// PulseAI Coach - Interactive AI Control
// ==========================================

// Toggle Collapsible API Configuration Panel
function toggleChatConfig() {
  const panel = document.getElementById('chat-api-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }
}

// Save Gemini API Key to State and LocalStorage
function saveApiKey() {
  const keyInput = document.getElementById('gemini-api-key');
  if (keyInput) {
    if (state.chat === undefined) state.chat = { apiKey: '', persona: 'analyst' };
    state.chat.apiKey = keyInput.value.trim();
    saveState();
    updateChatUI();
  }
}

// Update Chat Header & Settings UI States
function updateChatUI() {
  const statusDot = document.getElementById('chat-status-dot');
  const titleEl = document.getElementById('active-advisor-title');
  const modeEl = document.getElementById('active-advisor-mode');
  
  if (!statusDot || !titleEl || !modeEl) return;

  const persona = state.chat ? state.chat.persona : 'analyst';
  const hasKey = state.chat && state.chat.apiKey && state.chat.apiKey.startsWith('AIzaSy');

  const names = {
    analyst: 'PulseAI Analyst (Ahmad)',
    coach: 'PulseAI Coach (Sarah)',
    budgeter: 'FIRE Commander (Rex)'
  };

  titleEl.innerText = names[persona] || 'PulseAI Analyst';

  if (hasKey) {
    statusDot.style.background = 'var(--color-accent)';
    statusDot.style.boxShadow = '0 0 8px var(--color-accent)';
    modeEl.innerText = 'Google Gemini Live Mode';
  } else {
    statusDot.style.background = 'var(--color-success)';
    statusDot.style.boxShadow = '0 0 8px var(--color-success)';
    modeEl.innerText = 'Local Rules Mode (Free)';
  }
}

// Change Active Advisor Persona
function changePersona() {
  const personaSelect = document.getElementById('chat-persona');
  if (!personaSelect) return;

  if (state.chat === undefined) state.chat = { apiKey: '', persona: 'analyst' };
  state.chat.persona = personaSelect.value;
  saveState();
  updateChatUI();

  // Post dynamic intro message
  const intros = {
    analyst: "🇸🇬 **[Pragmatic SG Analyst - Ahmad]**: Hello. I have set my persona to Pragmatic SG Analyst. I will focus on Singapore monetary standards, CPF capping structures, and direct mathematical allocations. What segment shall we audit first?",
    coach: "🏆 **[Wealth Coach - Sarah]**: Hey there! Sarah here! I'm absolutely thrilled to guide you on your journey! Let's dream big, build some amazing habits, and unlock your true financial freedom together! What exciting goals are we working on today? 🌟🚀",
    budgeter: "⚠️ **[FIRE Disciplinarian - Commander Rex]**: I am the FIRE Commander. I have assumed control of your advisory panel. Let's make one thing clear: wants are a luxury, and luxuries delay early retirement. If you are ready for the raw, unvarnished facts, click on budget audit or type below. No excuses! ⚔️"
  };

  addChatMessage('assistant', intros[state.chat.persona]);
}

// Format Markdown string to HTML on the fly
function formatMarkdown(text) {
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold text: **text** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet list parsing
  let lines = formatted.split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('* ') || line.startsWith('- ')) {
      let content = line.substring(2);
      if (!inList) {
        lines[i] = '<ul><li>' + content + '</li>';
        inList = true;
      } else {
        lines[i] = '<li>' + content + '</li>';
      }
    } else {
      if (inList) {
        lines[i-1] = lines[i-1] + '</ul>';
        inList = false;
      }
    }
  }
  if (inList) {
    lines[lines.length-1] = lines[lines.length-1] + '</ul>';
  }

  formatted = lines.join('\n');
  let paras = formatted.split(/\n\n+/);
  for (let i = 0; i < paras.length; i++) {
    if (!paras[i].trim().startsWith('<ul') && !paras[i].trim().startsWith('<ol') && !paras[i].trim().startsWith('<li')) {
      paras[i] = '<p>' + paras[i].replace(/\n/g, '<br>') + '</p>';
    }
  }
  return paras.join('');
}

// Add styled bubble message to Chat Stream
function addChatMessage(sender, text) {
  const historyEl = document.getElementById('chat-history');
  if (!historyEl) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'chat-avatar';
  avatarDiv.innerText = sender === 'user' ? 'ME' : 'AI';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';
  bubbleDiv.innerHTML = formatMarkdown(text);

  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bubbleDiv);
  historyEl.appendChild(msgDiv);

  // Auto-scroll to bottom
  historyEl.scrollTop = historyEl.scrollHeight;
}

// Show/Hide typing loading indicator
function setTypingIndicator(show) {
  const historyEl = document.getElementById('chat-history');
  if (!historyEl) return;

  const existing = document.getElementById('typing-loader');
  if (show) {
    if (existing) return;
    const loader = document.createElement('div');
    loader.className = 'chat-msg assistant';
    loader.id = 'typing-loader';
    loader.innerHTML = `
      <div class="chat-avatar">AI</div>
      <div class="chat-bubble" style="padding: 0.6rem 1rem;">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    historyEl.appendChild(loader);
    historyEl.scrollTop = historyEl.scrollHeight;
  } else {
    if (existing) existing.remove();
  }
}

// Send user message
function sendChatMessage() {
  const inputEl = document.getElementById('chat-input');
  if (!inputEl) return;

  const text = inputEl.value.trim();
  if (!text) return;

  // Add user bubble
  addChatMessage('user', text);
  inputEl.value = '';

  // Trigger loading
  setTypingIndicator(true);

  // Decide mode (Gemini vs Local Rules)
  const hasKey = state.chat && state.chat.apiKey && state.chat.apiKey.startsWith('AIzaSy');
  if (hasKey) {
    generateGeminiResponse(text);
  } else {
    // Artificial slight delay for typing realism
    setTimeout(() => {
      generateLocalResponse(text);
    }, 600);
  }
}

// One-click quick analysis prompts
function runQuickPrompt(type) {
  const prompts = {
    budget: "Please perform a detailed audit of my Needs/Wants/Savings budget health.",
    goal: "Evaluate my current Goal Net Worth projections and give specific timeline advice.",
    banks: "Scan my active Singapore bank balances and interest rates for interest optimizations.",
    cpf: "Analyze my current CPF balances, wage ceiling caps, and interest compounding growth."
  };

  const text = prompts[type];
  if (text) {
    addChatMessage('user', text);
    setTypingIndicator(true);
    setTimeout(() => {
      generateLocalResponse(text);
    }, 600);
  }
}

// Local Smart Rules response engine
function generateLocalResponse(query) {
  setTypingIndicator(false);
  const q = query.toLowerCase();
  let analysis = "";

  if (q.includes('budget') || q.includes('expense') || q.includes('spend') || q.includes('needs') || q.includes('wants') || q.includes('savings')) {
    analysis = analyzeBudgetLocal();
  } else if (q.includes('goal') || q.includes('target') || q.includes('milestone') || q.includes('timeline') || q.includes('projection') || q.includes('retire')) {
    analysis = analyzeGoalLocal();
  } else if (q.includes('bank') || q.includes('multiplier') || q.includes('uob') || q.includes('dbs') || q.includes('ocbc') || q.includes('scb') || q.includes('interest')) {
    analysis = analyzeBanksLocal();
  } else if (q.includes('cpf') || q.includes('oa') || q.includes('sa') || q.includes('ma') || q.includes('ra') || q.includes('ordinary') || q.includes('special')) {
    analysis = analyzeCpfLocal();
  } else {
    analysis = analyzeGeneralLocal();
  }

  const persona = state.chat ? state.chat.persona : 'analyst';
  const responseText = wrapInPersonaTone(analysis, persona);
  addChatMessage('assistant', responseText);
}

// Persona Tone Wrapper
function wrapInPersonaTone(rawAnalysis, persona) {
  let intro = "";
  let body = rawAnalysis;
  let outro = "";

  if (persona === 'analyst') {
    intro = "**[Pragmatic SG Analyst - Ahmad]**\n\nI have performed a structural audit of your financial parameters using local Singapore monetary standards. Let's look at the hard numbers:\n\n";
    outro = "\n\n**Action Summary**: These results are mathematically derived based on MAS-regulated boundaries. Please let me know if you would like me to adjust any projection constants.";
  } else if (persona === 'coach') {
    intro = "🌟 **[Wealth Coach - Sarah]** 🌟\n\nHey there! I am so excited to look at your financial pulse today! Let's check out your numbers and celebrate your progress! 🎉\n\n";
    body = body
      .replace(/Needs/g, "🏠 Needs")
      .replace(/Wants/g, "🍿 Wants")
      .replace(/Savings/g, "🐷 Savings & Investments")
      .replace(/CPF/g, "🇸🇬 CPF");
    outro = "\n\n✨ **Coach Sarah's Tip**: You are doing amazing. Every dollar saved is a brick in your fortress of financial freedom! Keep shining, you've got this! 💪🚀";
  } else if (persona === 'budgeter') {
    intro = "💀 **[FIRE Disciplinarian - Commander Rex]** 💀\n\nLISTEN UP. No excuses, no sugarcoating. I've audited your assets and budget, and here is the cold hard reality. Let's see how much slack is in your system:\n\n";
    body = body
      .replace(/Needs/g, "⚠️ Survival Costs (Needs)")
      .replace(/Wants/g, "💸 Luxuries & Waste (Wants)")
      .replace(/Savings/g, "🔒 Freedom Fund (Savings)");
    outro = "\n\n🛑 **Commander's Verdict**: Stop ordering S$8 double-shot iced oat-milk lattes and skipping your kitchen! Cancel that fancy gym membership you use once a month. Save hard, invest ruthlessly, and retire early. Back to work! ⚔️";
  }

  return intro + body + outro;
}

// Budget Auditor (Local Rule Engine)
function analyzeBudgetLocal() {
  const cpfRates = getCpfAllocations(state.cpf.age);
  const empCPF = Math.min(8000, state.cpf.salary) * (cpfRates.employee / 100);
  const netSalary = state.cpf.salary - empCPF;

  const essential = state.expense ? state.expense.essential : 1800;
  const discretionary = state.expense ? state.expense.discretionary : 800;
  
  const mortgage = state.assets.propMortgage;
  const carPmt = state.assets.pmtCar;
  const persPmt = state.assets.pmtPersonal;
  const debts = mortgage + carPmt + persPmt;
  
  const totalNeeds = essential + debts;
  const totalWants = discretionary;
  const surplus = netSalary - essential - discretionary - debts;
  
  const needsPct = (totalNeeds / (netSalary || 1)) * 100;
  const wantsPct = (totalWants / (netSalary || 1)) * 100;
  const savingsPct = (surplus / (netSalary || 1)) * 100;

  let advice = `* **Gross Salary**: S$ ${state.cpf.salary.toLocaleString()}
* **Net Monthly Take-Home**: S$ ${Math.round(netSalary).toLocaleString()} (After S$ ${Math.round(empCPF).toLocaleString()} Employee CPF)
* **Monthly Inflows & Expenditures**:
  - **Needs**: S$ ${Math.round(totalNeeds).toLocaleString()} (**${needsPct.toFixed(1)}%** of Net Income) [Target: max 50%]
  - **Wants**: S$ ${Math.round(totalWants).toLocaleString()} (**${wantsPct.toFixed(1)}%** of Net Income) [Target: max 30%]
  - **Savings**: S$ ${Math.round(surplus).toLocaleString()} (**${savingsPct.toFixed(1)}%** of Net Income) [Target: min 20%]\n\n`;

  if (needsPct > 50) {
    advice += `⚠️ **Warning on Needs**: Your survival costs represent ${needsPct.toFixed(1)}% of your income. The main driver is mortgage and personal debt (S$ ${debts.toLocaleString()}/mo). Consider checking refinancing rates to lower home loan costs.\n\n`;
  } else {
    advice += `✅ **Excellent Needs Ratio**: Your essentials occupy a healthy ${needsPct.toFixed(1)}% (below the 50% threshold).\n\n`;
  }

  if (wantsPct > 30) {
    advice += `⚠️ **Critical discretionary spending**: You are allocating ${wantsPct.toFixed(1)}% of your net income to discretionary Wants (S$ ${discretionary.toLocaleString()}/mo). Consider limiting dining out or shopping by S$ 200/mo to accelerate your savings.\n\n`;
  } else {
    advice += `✅ **Wants in check**: Discretionary expenditures are completely in check at ${wantsPct.toFixed(1)}%.\n\n`;
  }

  if (savingsPct < 20) {
    advice += `⚠️ **Savings Deficit**: You are only saving ${savingsPct.toFixed(1)}% of your net income. We recommend cutting Wants to push your liquid savings above 20% to feed your investment portfolio.`;
  } else {
    advice += `✅ **Fantastic Savings Rate**: You are saving a robust ${savingsPct.toFixed(1)}% of your take-home pay. You have significant investing power!`;
  }

  return advice;
}

// Goal Auditor (Local Rule Engine)
function analyzeGoalLocal() {
  const dbsBal = state.banks.dbs.balance;
  const uobBal = state.banks.uob.balance;
  const ocbcBal = state.banks.ocbc.balance;
  const scbBal = state.banks.scb.balance;
  const hsbcBal = state.banks.hsbc.balance;
  const citiBal = state.banks.citi.balance;
  const maybankBal = state.banks.maybank.balance;
  const bocBal = state.banks.boc.balance;
  const totalLiquidCash = dbsBal + uobBal + ocbcBal + scbBal + hsbcBal + citiBal + maybankBal + bocBal;

  const currentCpfTotal = state.cpf.oa + state.cpf.sa + state.cpf.ma + state.cpf.ra;
  const totalInvestments = state.assets.invStocks + state.assets.invCrypto + state.assets.invSrs + state.assets.invOther;
  
  const propVal = state.assets.propValuation;
  const propLoan = state.assets.propLoan;
  const carLoan = state.assets.loanCar;
  const personalLoan = state.assets.loanPersonal;
  const ccDebt = state.assets.loanCc;

  const proj = run30YearSimulation(
    state.cpf.age, totalLiquidCash, totalInvestments, currentCpfTotal,
    state.cpf.oa, state.cpf.sa, state.cpf.ma, state.cpf.ra,
    propVal, propLoan,
    carLoan, personalLoan, ccDebt
  );

  let advice = `* **Current Net Worth**: S$ ${Math.round(totalLiquidCash + currentCpfTotal + totalInvestments + propVal - propLoan - carLoan - personalLoan - ccDebt).toLocaleString()}
* **Target Net Worth**: S$ ${state.sim.goal.toLocaleString()}
* **Savings Sliders**: savings rate **${state.sim.savingsRate}%** | market return **${state.sim.returnRate}%** p.a.
* **Target Retirement Age**: Age **${state.sim.retireAge}**\n\n`;

  if (proj.goalReachedAge !== null) {
    const ahead = state.sim.retireAge - proj.goalReachedAge;
    advice += `🎉 **Projection: ON TRACK!** You are projected to hit your net worth target of S$ ${state.sim.goal.toLocaleString()} at age **${proj.goalReachedAge}**.\n\n`;
    if (ahead >= 0) {
      advice += `This is **${ahead} years ahead** of your goal retirement age of ${state.sim.retireAge}! To speed this up further, consider raising your investment returns by 1% to shave off another 2 years.`;
    } else {
      advice += `This is **${Math.abs(ahead)} years behind** your desired target age of ${state.sim.retireAge}. Raise your savings rate slider from ${state.sim.savingsRate}% to ${state.sim.savingsRate + 10}% to bring the milestone timeline forward.`;
    }
  } else {
    advice += `⚠️ **Behind Schedule**: Your portfolio does not cross the S$ ${state.sim.goal.toLocaleString()} mark by age 85 (projected max is S$ ${Math.round(proj.age85NW).toLocaleString()}).\n\n`;
    advice += `**How to close the gap**:\n`;
    advice += `1. **Increase Savings Rate**: Your current rate of ${state.sim.savingsRate}% needs to rise to at least ${Math.min(90, state.sim.savingsRate + 15)}%.\n`;
    advice += `2. **Boost Return Rate**: Moving cash yielding 0.05% into active equity index funds (targeting 7-8% p.a.) is critical to compound your net worth.`;
  }

  return advice;
}

// Banks Auditor (Local Rule Engine)
function analyzeBanksLocal() {
  const dbs = state.banks.dbs;
  const uob = state.banks.uob;
  const ocbc = state.banks.ocbc;
  const scb = state.banks.scb;

  const dbsRate = calcDbsRate(dbs);
  const uobRate = calcUobRate(uob);
  const ocbcRate = calcOcbcRate(ocbc);
  const scbRate = calcScbRate(scb);

  let advice = `Here is your current Singapore bank account audit:\n\n`;
  let activeAccounts = [];

  if (dbs.balance > 0) activeAccounts.push(`* **DBS Bank**: S$ ${dbs.balance.toLocaleString()} (Computed Yield: **${dbsRate.toFixed(2)}%** p.a.)`);
  if (uob.balance > 0) activeAccounts.push(`* **UOB Bank**: S$ ${uob.balance.toLocaleString()} (Computed Yield: **${uobRate.toFixed(2)}%** p.a.)`);
  if (ocbc.balance > 0) activeAccounts.push(`* **OCBC Bank**: S$ ${ocbc.balance.toLocaleString()} (Computed Yield: **${ocbcRate.toFixed(2)}%** p.a.)`);
  if (scb.balance > 0) activeAccounts.push(`* **Standard Chartered**: S$ ${scb.balance.toLocaleString()} (Computed Yield: **${scbRate.toFixed(2)}%** p.a.)`);

  if (activeAccounts.length === 0) {
    return "You have no active bank account balances recorded. Please go to the **Bank Accounts** tab and input your balances!";
  }

  advice += activeAccounts.join('\n') + `\n\n`;

  // Provide specific optimization triggers
  if (uob.balance > 0 && !uob.oneActive) {
    advice += `⚠️ **UOB One Optimization Alert**: You have S$ ${uob.balance.toLocaleString()} in UOB but UOB One optimization check is OFF. Turning it ON, with a credit card spend of S$500 and salary credit, would instantly jump your rate to **5.00% p.a.** on first S$100k!\n\n`;
  }
  
  if (ocbc.balance > 0 && !ocbc.active360) {
    advice += `⚠️ **OCBC 360 Optimization Alert**: You have S$ ${ocbc.balance.toLocaleString()} in OCBC. Turn on OCBC 360 optimization and link Salary & Savings badges to easily secure a **4.05% p.a.** yield.\n\n`;
  }

  // General Cash allocation cap warning
  const highCash = (dbs.balance + uob.balance + ocbc.balance + scb.balance);
  if (highCash > 100000) {
    advice += `🇸🇬 **MAS SDIC & Tier Cap Advisory**: Singapore high-yield tiers (UOB One, OCBC 360) are capped strictly at **S$100,000**. Any cash above this threshold earns a negligible 0.05% p.a.
- Since you have S$ ${Math.round(highCash).toLocaleString()} in liquid bank cash, we highly recommend shifting anything above S$100,000 into **Singapore T-Bills** (yielding ~3.5%), **Singapore Savings Bonds (SSBs)**, or low-cost cash management solutions like Endowus/MariInvest to avoid cash drag!`;
  } else {
    advice += `👍 **Efficient Liquidity**: Your total bank holdings are S$ ${highCash.toLocaleString()} (within the maximum interest-bearing caps of S$100,000).`;
  }

  return advice;
}

// CPF Auditor (Local Rule Engine)
function analyzeCpfLocal() {
  const age = state.cpf.age;
  const sal = state.cpf.salary;
  const oa = state.cpf.oa;
  const sa = state.cpf.sa;
  const ma = state.cpf.ma;
  const ra = state.cpf.ra;

  const rates = getCpfAllocations(age);
  const monthlyContrib = Math.min(8000, sal) * (rates.total / 100);

  let advice = `🇸🇬 **Singapore CPF Compounding Audit** (Age ${age}):
* **Total Current CPF**: S$ ${(oa + sa + ma + ra).toLocaleString()}
  - **Ordinary Account (OA)**: S$ ${oa.toLocaleString()} (Guaranteed **2.50%** p.a.)
  - **Special Account (SA)**: S$ ${sa.toLocaleString()} (Guaranteed **4.08%** p.a.)
  - **Medisave Account (MA)**: S$ ${ma.toLocaleString()} (Guaranteed **4.08%** p.a.)` + (age >= 55 ? `\n  - **Retirement Account (RA)**: S$ ${ra.toLocaleString()} (Guaranteed **4.08%** p.a.)` : '') + `\n
* **Monthly Compounding Inflow**: S$ ${Math.round(monthlyContrib).toLocaleString()}/mo (Based on S$ ${Math.min(8000, sal).toLocaleString()} OW salary ceiling)\n\n`;

  if (age < 55) {
    advice += `💡 **OA-to-SA Transfer recommendation**: You have S$ ${oa.toLocaleString()} in your Ordinary Account. If you do not plan to purchase an HDB flat in the next 3-5 years, transferring OA to SA will permanently elevate your yield from **2.5% to 4.08% p.a.**, dramatically accelerating retirement compounding. *Note: OA-to-SA transfers are strictly one-way.* \n\n`;
  }

  advice += `📈 **CPF Cash Top-Ups (RSTU)**: Consider performing cash top-ups to your Special Account (SA) under the Retirement Sum Topping-Up Scheme. This gets you dollar-for-dollar tax relief up to **S$8,000 p.a.** while boosting SA compounding growth.

⚠️ **Ordinary Wage Ceiling**: Your salary is S$ ${sal.toLocaleString()}. Note that employer/employee CPF contributions are strictly capped at the **S$8,000/mo** Ordinary Wage (OW) ceiling. Any bonus wages (Additional Wages) are subject to a separate annual cap of S$102,000.`;

  return advice;
}

// General Local Response
function analyzeGeneralLocal() {
  const dbsNW = state.banks.dbs.balance;
  const uobNW = state.banks.uob.balance;
  const ocbcNW = state.banks.ocbc.balance;
  const scbNW = state.banks.scb.balance;
  const hsbcNW = state.banks.hsbc.balance;
  const citiNW = state.banks.citi.balance;
  const maybankNW = state.banks.maybank.balance;
  const bocNW = state.banks.boc.balance;
  const cashNW = dbsNW + uobNW + ocbcNW + scbNW + hsbcNW + citiNW + maybankNW + bocNW;
  
  const cpfNW = state.cpf.oa + state.cpf.sa + state.cpf.ma + state.cpf.ra;
  const investNW = state.assets.invStocks + state.assets.invCrypto + state.assets.invSrs + state.assets.invOther;
  const propNW = state.assets.propValuation - state.assets.propLoan;
  const netWorth = cashNW + cpfNW + investNW + propNW - state.assets.loanCar - state.assets.loanPersonal - state.assets.loanCc;

  return `I have scanned your entire active profile:
* **Active Net Worth**: S$ ${Math.round(netWorth).toLocaleString()}
* **Goal Target**: S$ ${state.sim.goal.toLocaleString()}
* **Current Liquid Reserves**: S$ ${cashNW.toLocaleString()} in banks

I can help with specialized questions:
- Type **budget** or **expenses** to analyze your budget allocations.
- Type **goals** or **retirement** to review your net worth goal timeline.
- Type **banks** or **interest** to see how to optimize bank yields.
- Type **cpf** or **savings** to check your Singapore CPF allocations.

What would you like to investigate?`;
}

// Test Gemini API Key
function testApiKey() {
  const keyInput = document.getElementById('gemini-api-key');
  if (!keyInput) return;

  const key = keyInput.value.trim();
  if (!key || !key.startsWith('AIzaSy')) {
    alert("Please enter a valid Google Gemini API Key starting with 'AIzaSy'.");
    return;
  }

  addChatMessage('assistant', "🔄 Testing connection to Google Gemini 1.5 Flash... Please wait.");
  setTypingIndicator(true);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello! Reply with exactly: 'Gemini Live successfully connected!'" }] }]
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("API response error");
    return res.json();
  })
  .then(data => {
    setTypingIndicator(false);
    let text = "Gemini Live successfully connected!";
    if (data && data.candidates) {
      text = data.candidates[0].content.parts[0].text;
    }
    addChatMessage('assistant', `✅ **Connection Successful!**\n\n${text}`);
    state.chat.apiKey = key;
    saveState();
    updateChatUI();
  })
  .catch(err => {
    setTypingIndicator(false);
    addChatMessage('assistant', "❌ **Connection Failed!** Please double-check your API key. Make sure there are no spaces and that the key is unrestricted in Google AI Studio.");
    console.error(err);
  });
}

// Live Gemini API Direct Browser Fetch
function generateGeminiResponse(userPrompt) {
  const key = state.chat.apiKey;
  const persona = state.chat.persona;
  
  const stateSummary = {
    currentAge: state.cpf.age,
    grossSalary: state.cpf.salary,
    balances: {
      dbs: state.banks.dbs.balance,
      uob: state.banks.uob.balance,
      ocbc: state.banks.ocbc.balance,
      scb: state.banks.scb.balance,
      hsbc: state.banks.hsbc.balance,
      citi: state.banks.citi.balance,
      maybank: state.banks.maybank.balance,
      boc: state.banks.boc.balance
    },
    cpfBalances: {
      oa: state.cpf.oa,
      sa: state.cpf.sa,
      ma: state.cpf.ma,
      ra: state.cpf.ra
    },
    investments: {
      stocks: state.assets.invStocks,
      crypto: state.assets.invCrypto,
      srs: state.assets.invSrs,
      other: state.assets.invOther
    },
    property: {
      valuation: state.assets.propValuation,
      loan: state.assets.propLoan,
      mortgageInstallment: state.assets.propMortgage,
      apr: state.assets.propApr
    },
    otherLoans: {
      carLoan: state.assets.loanCar,
      carMonthlyPmt: state.assets.pmtCar,
      personalLoan: state.assets.loanPersonal,
      personalPmt: state.assets.pmtPersonal,
      creditCardDebt: state.assets.loanCc
    },
    scenarioSimulation: {
      goalNetworth: state.sim.goal,
      savingsRatePct: state.sim.savingsRate,
      assumedMarketReturnPct: state.sim.returnRate,
      salaryGrowthPct: state.sim.salaryGrowth,
      propertyGrowthPct: state.sim.propGrowth,
      targetRetireAge: state.sim.retireAge
    },
    expenseAdviser: {
      essentialLivingCost: state.expense ? state.expense.essential : 1800,
      discretionarySpend: state.expense ? state.expense.discretionary : 800
    }
  };

  const systemContexts = {
    analyst: `You are Ahmad, an expert Pragmatic SG Financial Analyst. Your tone is highly professional, direct, objective, data-driven, and analytical. You are deeply knowledgeable about Singapore finance rules:
- CPF rules: 2026 OW ceiling is S$8,000/mo. Contribution rate is 37% for <=55 (employee 20%, employer 17%). Ordinary Account (OA) yields 2.5%, Special Account (SA) / Medisave (MA) / Retirement Account (RA) yield 4.08%. Extra 1% on first S$60k (max $20k OA).
- Bank accounts: Model UOB One (effective ~5.0% for first $100k with card spend & salary), OCBC 360, DBS Multiplier, SCB Bonus$aver. Caps are strictly S$100k.
- Housing: Mortgage Servicing Ratio (MSR) cap is 30% of income. Total Debt Servicing Ratio (TDSR) cap is 55% of income.
- Emergency Fund: Recommend 6 months of essentials (debts + living).
Keep responses incredibly focused, structured in Markdown, citing actual numbers from the user's live profile state.`,
    
    coach: `You are Sarah, an expert, enthusiastic, and highly encouraging Wealth Coach. Your tone is extremely positive, warm, motivational, and uses plenty of emojis. You help the user build healthy financial habits, celebrate their wins, and stay excited about their wealth targets! You are deeply knowledgeable about Singapore finance rules (CPF, UOB One, OCBC 360, MSR, TDSR, etc.). Cite actual numbers from their profile state, but frame them as opportunities, and give positive action items. Structure responses beautifully in Markdown.`,
    
    budgeter: `You are Rex, a strict, sass-filled, and direct FIRE Disciplinarian (early retirement commander). Your tone is humorous but highly uncompromising, strict, and tells the user off for wasting money on luxures ("Wants" like expensive coffees or fine dining) when they should be investing to unlock early retirement. You use tough-love phrasing. You are deeply knowledgeable about Singapore personal finance, CPF, high-yield interest caps, and MSR/TDSR. Analyze their live state, highlight where they are wasting capital, tell them off, and order them to tighten up their budget. Structure beautifully in Markdown.`
  };

  const sysPrompt = systemContexts[persona] || systemContexts.analyst;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `SYSTEM CONTEXT:\n${sysPrompt}\n\nUSER'S LIVE DASHBOARD DATA:\n${JSON.stringify(stateSummary, null, 2)}\n\nUSER QUESTION: ${userPrompt}`
        }]
      }]
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Gemini API Request Failed");
    return res.json();
  })
  .then(data => {
    setTypingIndicator(false);
    if (data && data.candidates) {
      const reply = data.candidates[0].content.parts[0].text;
      addChatMessage('assistant', reply);
    } else {
      throw new Error("Invalid response format");
    }
  })
  .catch(err => {
    setTypingIndicator(false);
    console.error(err);
    addChatMessage('assistant', "⚠️ **Gemini API Network Error!**\n\nI encountered an issue connecting to the Gemini server. I have automatically fallen back to the built-in Local Rules Mode to answer your question:\n\n" + wrapInPersonaTone(analyzeGeneralLocal(), persona));
  });
}

// ==========================================
// Household Panel - Family State Management
// ==========================================

function renderHouseholdMembers() {
  const container = document.getElementById('household-members-list');
  if (!container) return;

  if (!state.household || !state.household.members || state.household.members.length === 0) {
    container.innerHTML = `
      <div class="empty-members-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <p>No household members added yet.</p>
        <p class="small text-muted">Add your spouse, children, or elderly parents to model joint cash balances, salaries, and age-bracketed CPF compounding!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.household.members.map(m => `
    <div class="card glass-card member-card" id="member-${m.id}">
      <div class="member-card-header">
        <div class="member-identity">
          <span class="member-badge bg-${m.relation}">${m.relation}</span>
          <input type="text" class="member-name-input" value="${m.name}" onchange="updateMember('${m.id}', 'name', this.value)">
        </div>
        <button class="btn-delete-member" onclick="removeHouseholdMember('${m.id}')" title="Delete Member">✕</button>
      </div>
      <div class="member-card-grid">
        <div class="input-group-small">
          <label>Age</label>
          <input type="number" class="input-field-small" value="${m.age}" min="0" max="100" onchange="updateMember('${m.id}', 'age', this.value)">
        </div>
        <div class="input-group-small">
          <label>Monthly Salary (S$)</label>
          <input type="number" class="input-field-small" value="${m.salary}" min="0" onchange="updateMember('${m.id}', 'salary', this.value)">
        </div>
        <div class="input-group-small">
          <label>Bank Balance (S$)</label>
          <input type="number" class="input-field-small" value="${m.bankBalance}" min="0" onchange="updateMember('${m.id}', 'bankBalance', this.value)">
        </div>
        <div class="input-group-small">
          <label>CPF OA (S$)</label>
          <input type="number" class="input-field-small" value="${m.oa}" min="0" onchange="updateMember('${m.id}', 'oa', this.value)">
        </div>
        <div class="input-group-small">
          <label>CPF SA (S$)</label>
          <input type="number" class="input-field-small" value="${m.sa}" min="0" onchange="updateMember('${m.id}', 'sa', this.value)">
        </div>
        <div class="input-group-small">
          <label>CPF MA (S$)</label>
          <input type="number" class="input-field-small" value="${m.ma}" min="0" onchange="updateMember('${m.id}', 'ma', this.value)">
        </div>
      </div>
    </div>
  `).join('');
}

function updateMember(id, field, value) {
  if (!state.household || !state.household.members) return;
  const member = state.household.members.find(m => m.id === id);
  if (member) {
    if (field === 'name') {
      member.name = value;
    } else {
      member[field] = Number(value) || 0;
    }
    updateCalculations();
    saveState();
  }
}

function removeHouseholdMember(id) {
  if (!state.household || !state.household.members) return;
  state.household.members = state.household.members.filter(m => m.id !== id);
  renderHouseholdMembers();
  updateCalculations();
  saveState();
}

function addHouseholdMember(preset = null) {
  if (!state.household) {
    state.household = { enabled: false, members: [] };
  }
  if (!state.household.members) {
    state.household.members = [];
  }

  let newMember = {
    id: 'm-' + Date.now(),
    name: 'New Member',
    relation: 'other',
    age: 30,
    salary: 0,
    oa: 0,
    sa: 0,
    ma: 0,
    ra: 0,
    bankBalance: 0
  };

  if (preset === 'spouse') {
    newMember.name = 'Spouse (Eve)';
    newMember.relation = 'spouse';
    newMember.age = 30;
    newMember.salary = 5000;
    newMember.bankBalance = 15000;
    newMember.oa = 25000;
    newMember.sa = 15000;
    newMember.ma = 12000;
  } else if (preset === 'child') {
    newMember.name = 'Child (Leo)';
    newMember.relation = 'child';
    newMember.age = 4;
    newMember.salary = 0;
    newMember.bankBalance = 1500;
    newMember.oa = 0;
    newMember.sa = 0;
    newMember.ma = 0;
  } else if (preset === 'parent') {
    newMember.name = 'Parent (Mary)';
    newMember.relation = 'parent';
    newMember.age = 62;
    newMember.salary = 0;
    newMember.bankBalance = 8000;
    newMember.oa = 5000;
    newMember.sa = 0;
    newMember.ma = 12000;
    newMember.ra = 45000;
  }

  state.household.members.push(newMember);
  renderHouseholdMembers();
  updateCalculations();
  saveState();
}

function toggleHouseholdFinances() {
  const chk = document.getElementById('household-enabled');
  if (chk) {
    if (!state.household) {
      state.household = { enabled: false, members: [] };
    }
    state.household.enabled = chk.checked;
    
    // Update top header status pill in real-time
    const pill = document.getElementById('household-mode-pill');
    if (pill) {
      pill.style.display = chk.checked ? 'flex' : 'none';
    }
    
    updateCalculations();
    saveState();
  }
}

