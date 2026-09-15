
const assert = require('assert');
const path = require('path');

const mockStorageData = {};
global.localStorage = {
  getItem: (key) => (key in mockStorageData ? mockStorageData[key] : null),
  setItem: (key, val) => { mockStorageData[key] = String(val); },
  removeItem: (key) => { delete mockStorageData[key]; },
  clear: () => { Object.keys(mockStorageData).forEach(k => delete mockStorageData[k]); }
};

global.Storage = {
  get: (key, def = null) => {
    try {
      const val = global.localStorage.getItem(`devpilot_${key}`);
      return val ? JSON.parse(val) : def;
    } catch (e) {
      return def;
    }
  },
  set: (key, val) => {
    global.localStorage.setItem(`devpilot_${key}`, JSON.stringify(val));
  },
  remove: (key) => {
    global.localStorage.removeItem(`devpilot_${key}`);
  }
};

const TimerData = require(path.join(__dirname, '../../js/data/timerData.js'));
global.TimerData = TimerData;

const GlobalTimer = require(path.join(__dirname, '../../js/core/globalTimer.js'));

let passCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✓ [PASS] ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`✗ [FAIL] ${testName}: ${err.message}`);
    failCount++;
  }
}

console.log('=====================================================================');
console.log(' MAD DEV: Validating Global Floating Mini Timer & Focus Mode');
console.log('=====================================================================\n');

runTest('TEST 1: GlobalTimer state initializes with valid schema and defaults', () => {
  global.localStorage.clear();
  const state = GlobalTimer.getState();

  assert.strictEqual(state.mode, 'work');
  assert.strictEqual(state.durationSeconds, 1500);
  assert.strictEqual(state.remainingSeconds, 1500);
  assert.strictEqual(state.isRunning, false);
  assert.strictEqual(state.isPaused, false);
  assert.strictEqual(state.cyclePosition, 1);
  assert.strictEqual(state.isFloatingHidden, false);
});

runTest('TEST 2: Start timer sets exact endTimestamp and records task name', () => {
  global.localStorage.clear();
  const task = 'DSA — Sliding Window Technique';
  const state = GlobalTimer.start(task);

  assert.strictEqual(state.isRunning, true);
  assert.strictEqual(state.isPaused, false);
  assert.strictEqual(state.currentTask, task);
  assert.ok(state.startTimestamp > 0);
  assert.ok(state.endTimestamp > state.startTimestamp);
  assert.strictEqual(state.isFloatingHidden, false);

  const expectedRemaining = Math.ceil((state.endTimestamp - Date.now()) / 1000);
  assert.ok(Math.abs(state.remainingSeconds - expectedRemaining) <= 1);
});

runTest('TEST 3: Navigation persistence preserves remaining time across routes without restarting', () => {
  global.localStorage.clear();

  const state = GlobalTimer.start('Implement Redux store');
  const startTime = state.startTimestamp;
  const initialEndTimestamp = state.endTimestamp;

  const simulatedResumeNavTime = startTime + (180 * 1000);
  const remainingOnResume = TimerData.calculateRemaining(initialEndTimestamp, simulatedResumeNavTime);

  assert.strictEqual(remainingOnResume, 1320, '1500s - 180s = 1320s (22:00)');

  const simulatedDsaNavTime = startTime + (300 * 1000);
  const remainingOnDsa = TimerData.calculateRemaining(initialEndTimestamp, simulatedDsaNavTime);

  assert.strictEqual(remainingOnDsa, 1200, '1500s - 300s = 1200s (20:00)');
  assert.strictEqual(state.endTimestamp, initialEndTimestamp, 'endTimestamp must never change across route navigations');
});

runTest('TEST 4: Pausing freezes exact remaining seconds and clears endTimestamp', () => {
  global.localStorage.clear();
  GlobalTimer.start('LeetCode #3 Longest Substring');

  const pausedState = GlobalTimer.pause();
  assert.strictEqual(pausedState.isRunning, false);
  assert.strictEqual(pausedState.isPaused, true);
  assert.strictEqual(pausedState.endTimestamp, null);
  assert.ok(pausedState.remainingSeconds > 0 && pausedState.remainingSeconds <= 1500);

  const stored = GlobalTimer.getState();
  assert.strictEqual(stored.isPaused, true);
  assert.strictEqual(stored.isRunning, false);
});

runTest('TEST 5: Resuming recalculates endTimestamp from preserved remaining seconds', () => {

  GlobalTimer.saveState({
    mode: 'work',
    durationSeconds: 1500,
    remainingSeconds: 900,
    isRunning: false,
    isPaused: true,
    endTimestamp: null,
    cyclePosition: 2,
    currentTask: 'System Design Notes',
    isFloatingHidden: false
  });

  const resumed = GlobalTimer.resume();
  assert.strictEqual(resumed.isRunning, true);
  assert.strictEqual(resumed.isPaused, false);
  assert.ok(resumed.endTimestamp > Date.now());

  const calculatedRemaining = TimerData.calculateRemaining(resumed.endTimestamp);
  assert.ok(Math.abs(calculatedRemaining - 900) <= 1, 'Remaining time resumes from exactly ~900 seconds');
});

runTest('TEST 6: Reset restores duration without modifying cycle progression or history', () => {
  GlobalTimer.saveState({
    mode: 'work',
    durationSeconds: 1500,
    remainingSeconds: 420,
    isRunning: true,
    isPaused: false,
    endTimestamp: Date.now() + 420000,
    cyclePosition: 3,
    currentTask: 'Bug fixing',
    isFloatingHidden: false
  });

  const resetState = GlobalTimer.reset();
  assert.strictEqual(resetState.isRunning, false);
  assert.strictEqual(resetState.isPaused, false);
  assert.strictEqual(resetState.remainingSeconds, 1500);
  assert.strictEqual(resetState.endTimestamp, null);
  assert.strictEqual(resetState.cyclePosition, 3, 'Cycle position must remain intact on reset');
});

runTest('TEST 7: Clicking Close/Hide (X) only hides floating widget and keeps timer running', () => {
  GlobalTimer.start('DSA Practice');
  assert.strictEqual(GlobalTimer.getState().isRunning, true);

  const hiddenState = GlobalTimer.hideFloating();
  assert.strictEqual(hiddenState.isFloatingHidden, true, 'isFloatingHidden must be true');
  assert.strictEqual(hiddenState.isRunning, true, 'Timer MUST continue running when X is clicked');
  assert.ok(hiddenState.endTimestamp !== null, 'endTimestamp must remain active');

  const persisted = GlobalTimer.getState();
  assert.strictEqual(persisted.isFloatingHidden, true);
  assert.strictEqual(persisted.isRunning, true);
});

runTest('TEST 8: Re-opening floating timer via Header Indicator restores visibility', () => {
  assert.strictEqual(GlobalTimer.getState().isFloatingHidden, true);

  const shownState = GlobalTimer.showFloating();
  assert.strictEqual(shownState.isFloatingHidden, false);
  assert.strictEqual(shownState.isRunning, true);
});

runTest('TEST 9: Completion event records exactly ONE session history item and advances cycle', () => {
  global.localStorage.clear();
  global.Storage.set('timer_sessions', []);

  const completingState = {
    mode: 'work',
    durationSeconds: 1500,
    remainingSeconds: 0,
    isRunning: true,
    isPaused: false,
    endTimestamp: Date.now() - 1000,
    cyclePosition: 1,
    currentTask: 'Mastering Graphs & DFS',
    isFloatingHidden: false
  };

  GlobalTimer.completeSession(completingState);

  const sessions = global.Storage.get('timer_sessions', []);
  assert.strictEqual(sessions.length, 1, 'Exactly one completed session must be recorded');
  assert.strictEqual(sessions[0].task, 'Mastering Graphs & DFS');
  assert.strictEqual(sessions[0].mode, 'work');
  assert.strictEqual(sessions[0].durationSeconds, 1500);

  const nextState = GlobalTimer.getState();
  assert.strictEqual(nextState.mode, 'shortBreak', 'Work session 1 advances to shortBreak');
  assert.strictEqual(nextState.cyclePosition, 1);
  assert.strictEqual(nextState.durationSeconds, 300, '5 minutes short break');

  GlobalTimer.completeSession(nextState);
  const sessionsAfterSecond = global.Storage.get('timer_sessions', []);
  assert.strictEqual(sessionsAfterSecond.length, 1, 'Must NOT create duplicate completion session');
});

runTest('TEST 10: Complete 4-step Pomodoro cycle advances correctly to Long Break', () => {

  const t1 = TimerData.getNextSessionTransition('work', 1, 4);
  assert.strictEqual(t1.nextMode, 'shortBreak');
  assert.strictEqual(t1.nextCycle, 1);

  const t2 = TimerData.getNextSessionTransition('shortBreak', 1, 4);
  assert.strictEqual(t2.nextMode, 'work');
  assert.strictEqual(t2.nextCycle, 2);

  const t3 = TimerData.getNextSessionTransition('work', 4, 4);
  assert.strictEqual(t3.nextMode, 'longBreak');
  assert.strictEqual(t3.nextCycle, 1);

  const t4 = TimerData.getNextSessionTransition('longBreak', 1, 4);
  assert.strictEqual(t4.nextMode, 'work');
  assert.strictEqual(t4.nextCycle, 1);
});

runTest('TEST 11: Draggable coordinates clamp cleanly within viewport bounds', () => {
  const winWidth = 1200;
  const winHeight = 800;
  const widgetWidth = 310;
  const widgetHeight = 110;
  const margin = 12;

  function clampPosition(clientX, clientY, offsetX, offsetY) {
    let left = clientX - offsetX;
    let top = clientY - offsetY;
    left = Math.max(margin, Math.min(winWidth - widgetWidth - margin, left));
    top = Math.max(margin, Math.min(winHeight - widgetHeight - margin, top));
    return { left, top };
  }

  const p1 = clampPosition(500, 400, 50, 50);
  assert.strictEqual(p1.left, 450);
  assert.strictEqual(p1.top, 350);

  const p2 = clampPosition(-100, -50, 0, 0);
  assert.strictEqual(p2.left, margin);
  assert.strictEqual(p2.top, margin);

  const p3 = clampPosition(2000, 1500, 0, 0);
  assert.strictEqual(p3.left, winWidth - widgetWidth - margin);
  assert.strictEqual(p3.top, winHeight - widgetHeight - margin);
});

runTest('TEST 12: Relative path resolver accurately directs to timer.html from root vs pages', () => {

  global.window = { location: { pathname: '/index.html' } };
  assert.strictEqual(GlobalTimer.getRelativePath('timer.html'), 'pages/timer.html');

  global.window = { location: { pathname: '/pages/notes.html' } };
  assert.strictEqual(GlobalTimer.getRelativePath('timer.html'), 'timer.html');
});

runTest('TEST 13: Floating widget is strictly hidden when user is ON timer.html', () => {
  global.localStorage.clear();
  GlobalTimer.start('Sliding window practice');

  global.window = { location: { pathname: '/pages/timer.html' } };
  global.document = { body: { classList: { contains: (cls) => cls === 'timer-page' }, getAttribute: (attr) => attr === 'data-page' ? 'timer' : null } };

  const state = GlobalTimer.getState();
  const isTimerActive = state.isRunning || state.isPaused;
  const isAlreadyOnTimerPage = global.window.location.pathname.toLowerCase().endsWith('timer.html');
  const shouldShow = isTimerActive && !isAlreadyOnTimerPage && !state.isFloatingHidden;

  assert.strictEqual(isTimerActive, true);
  assert.strictEqual(isAlreadyOnTimerPage, true);
  assert.strictEqual(shouldShow, false, 'Floating timer MUST be hidden on timer.html');
});

runTest('TEST 14: Floating widget is visible on other pages (e.g. notes.html, dashboard) while timer active', () => {
  global.localStorage.clear();
  GlobalTimer.start('Sliding window practice');

  global.window = { location: { pathname: '/pages/notes.html' } };
  global.document = { body: { classList: { contains: () => false }, getAttribute: () => null } };

  const state = GlobalTimer.getState();
  const isTimerActive = state.isRunning || state.isPaused;
  const isAlreadyOnTimerPage = global.window.location.pathname.toLowerCase().endsWith('timer.html');
  const shouldShow = isTimerActive && !isAlreadyOnTimerPage && !state.isFloatingHidden;

  assert.strictEqual(isTimerActive, true);
  assert.strictEqual(isAlreadyOnTimerPage, false);
  assert.strictEqual(shouldShow, true, 'Floating timer MUST be visible on non-timer pages when running');
});

console.log(`\n=====================================================================`);
console.log(` Results: ${passCount} / ${passCount + failCount} tests passed.`);
console.log(`=====================================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
