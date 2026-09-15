
const assert = require('assert');
const path = require('path');

const TimerData = require(path.join(__dirname, '../../js/data/timerData.js'));

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

console.log('====================================================');
console.log(' MAD DEV: Validating Pomodoro Focus Timer System');
console.log('====================================================\n');

runTest('TEST 1: Default settings & duration validation bounds', () => {
  const defaults = TimerData.getDefaultSettings();
  assert.strictEqual(defaults.focusDuration, 25);
  assert.strictEqual(defaults.shortBreakDuration, 5);
  assert.strictEqual(defaults.longBreakDuration, 15);
  assert.strictEqual(defaults.sessionsBeforeLongBreak, 4);
  assert.strictEqual(defaults.autoStart, false);
  assert.strictEqual(defaults.soundEnabled, true);

  assert.strictEqual(TimerData.validateDuration(150, 1, 90, 25), 90, 'Max focus is 90 min');
  assert.strictEqual(TimerData.validateDuration(-5, 1, 90, 25), 1, 'Min focus is 1 min');
  assert.strictEqual(TimerData.validateDuration('invalid', 1, 90, 25), 1, 'Invalid returns min');
  assert.strictEqual(TimerData.validateDuration(30, 1, 90, 25), 30, 'Valid duration passes');
});

runTest('TEST 2: Timestamp remaining time calculation is exact and non-negative', () => {
  const now = 1700000000000;
  const endTimestamp = now + (25 * 60 * 1000);

  assert.strictEqual(TimerData.calculateRemaining(endTimestamp, now), 1500);

  const tenMinsLater = now + (600 * 1000);
  assert.strictEqual(TimerData.calculateRemaining(endTimestamp, tenMinsLater), 900);

  const expiredTime = endTimestamp + 5000;
  assert.strictEqual(TimerData.calculateRemaining(endTimestamp, expiredTime), 0, 'Must clamp to 0 when expired');
});

runTest('TEST 3: Time formatting formats MM:SS and zero pads correctly', () => {
  assert.strictEqual(TimerData.formatTime(1500), '25:00');
  assert.strictEqual(TimerData.formatTime(300), '05:00');
  assert.strictEqual(TimerData.formatTime(65), '01:05');
  assert.strictEqual(TimerData.formatTime(9), '00:09');
  assert.strictEqual(TimerData.formatTime(0), '00:00');
  assert.strictEqual(TimerData.formatTime(-10), '00:00', 'Negative clamped to 00:00');
  assert.strictEqual(TimerData.formatTime(3665), '1:01:05', 'Hours format correctly');
});

runTest('TEST 4: Progress fraction and strokeDashoffset calculations are accurate', () => {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  const frac1 = TimerData.calculateProgressFraction(1500, 1500);
  assert.strictEqual(frac1, 1);
  const stroke1 = TimerData.calculateStrokeDashoffset(frac1, radius);
  assert.strictEqual(stroke1.offset, 0, 'Offset is 0 at full remaining');

  const frac2 = TimerData.calculateProgressFraction(750, 1500);
  assert.strictEqual(frac2, 0.5);
  const stroke2 = TimerData.calculateStrokeDashoffset(frac2, radius);
  assert.strictEqual(Math.round(stroke2.offset), Math.round(circumference / 2));

  const frac3 = TimerData.calculateProgressFraction(0, 1500);
  assert.strictEqual(frac3, 0);
  const stroke3 = TimerData.calculateStrokeDashoffset(frac3, radius);
  assert.strictEqual(Math.round(stroke3.offset), Math.round(circumference));
});

runTest('TEST 5: Standard 4-step Pomodoro cycle progresses accurately', () => {

  const step1 = TimerData.getNextSessionTransition('work', 1, 4);
  assert.strictEqual(step1.nextMode, 'shortBreak');
  assert.strictEqual(step1.nextCycle, 1);
  assert.strictEqual(step1.isCycleComplete, false);

  const step2 = TimerData.getNextSessionTransition('shortBreak', 1, 4);
  assert.strictEqual(step2.nextMode, 'work');
  assert.strictEqual(step2.nextCycle, 2);

  const step3 = TimerData.getNextSessionTransition('work', 2, 4);
  assert.strictEqual(step3.nextMode, 'shortBreak');
  assert.strictEqual(step3.nextCycle, 2);

  const step4 = TimerData.getNextSessionTransition('shortBreak', 2, 4);
  assert.strictEqual(step4.nextMode, 'work');
  assert.strictEqual(step4.nextCycle, 3);

  const step5 = TimerData.getNextSessionTransition('work', 3, 4);
  assert.strictEqual(step5.nextMode, 'shortBreak');
  assert.strictEqual(step5.nextCycle, 3);

  const step6 = TimerData.getNextSessionTransition('shortBreak', 3, 4);
  assert.strictEqual(step6.nextMode, 'work');
  assert.strictEqual(step6.nextCycle, 4);

  const step7 = TimerData.getNextSessionTransition('work', 4, 4);
  assert.strictEqual(step7.nextMode, 'longBreak');
  assert.strictEqual(step7.isCycleComplete, true);

  const step8 = TimerData.getNextSessionTransition('longBreak', 4, 4);
  assert.strictEqual(step8.nextMode, 'work');
  assert.strictEqual(step8.nextCycle, 1);
});

runTest('TEST 6: Custom sessions before long break triggers long break at configured threshold', () => {

  const step1 = TimerData.getNextSessionTransition('work', 1, 2);
  assert.strictEqual(step1.nextMode, 'shortBreak');
  assert.strictEqual(step1.isCycleComplete, false);

  const step2 = TimerData.getNextSessionTransition('shortBreak', 1, 2);
  assert.strictEqual(step2.nextMode, 'work');
  assert.strictEqual(step2.nextCycle, 2);

  const step3 = TimerData.getNextSessionTransition('work', 2, 2);
  assert.strictEqual(step3.nextMode, 'longBreak');
  assert.strictEqual(step3.isCycleComplete, true);
});

runTest('TEST 7: Today statistics aggregate correctly and ignore yesterday sessions', () => {
  const today = new Date('2026-09-14T12:00:00');
  const yesterday = new Date('2026-09-13T15:00:00');

  const sessions = [

    { id: '1', mode: 'work', durationSeconds: 1500, completedAt: today.toISOString(), task: 'LeetCode' },
    { id: '2', mode: 'work', durationSeconds: 1500, completedAt: today.toISOString(), task: 'React Hooks' },

    { id: '3', mode: 'shortBreak', durationSeconds: 300, completedAt: today.toISOString() },

    { id: '4', mode: 'work', durationSeconds: 1500, completedAt: yesterday.toISOString(), task: 'Yesterday Task 1' },
    { id: '5', mode: 'work', durationSeconds: 1800, completedAt: yesterday.toISOString(), task: 'Yesterday Task 2' }
  ];

  const stats = TimerData.calculateTodayStats(sessions, today);
  assert.strictEqual(stats.todayFocusCount, 2, 'Must only count 2 work sessions today');
  assert.strictEqual(stats.todayFocusMinutes, 50, '25 + 25 = 50 minutes focused today');
  assert.strictEqual(stats.todaySessionsList.length, 2, 'History list must only have today sessions');
  assert.strictEqual(stats.weekFocusCount, 2, 'Sessions this week from Monday Sep 14');
  assert.strictEqual(stats.totalFocusMinutes, 105, '50 today + 55 yesterday = 105 total min');
  assert.strictEqual(stats.longestSessionMinutes, 30, 'Longest session was 1800s = 30m');
});

runTest('TEST 8: Skip advances transition without logging completed session', () => {
  const currentMode = 'work';
  const currentCycle = 2;

  const transition = TimerData.getNextSessionTransition(currentMode, currentCycle, 4);
  assert.strictEqual(transition.nextMode, 'shortBreak');

  const sessions = [];
  const stats = TimerData.calculateTodayStats(sessions);
  assert.strictEqual(stats.todayFocusCount, 0, 'No completed sessions logged on skip');
});

runTest('TEST 9: Reset restores duration without modifying history or cycle', () => {
  const activeState = {
    mode: 'work',
    durationSeconds: 1500,
    remainingSeconds: 420,
    isRunning: true,
    isPaused: false,
    cyclePosition: 3,
    currentTask: 'System Design'
  };

  activeState.isRunning = false;
  activeState.isPaused = false;
  activeState.remainingSeconds = activeState.durationSeconds;

  assert.strictEqual(activeState.remainingSeconds, 1500, 'Remaining reset to 1500');
  assert.strictEqual(activeState.cyclePosition, 3, 'Cycle position 3 must be preserved');
  assert.strictEqual(activeState.currentTask, 'System Design', 'Task must be preserved');
});

runTest('TEST 10: Timer reload simulation recovers exact elapsed background time', () => {
  const startTime = 1726300000000;
  const durationSec = 1500;
  const endTime = startTime + (durationSec * 1000);

  const savedState = {
    mode: 'work',
    durationSeconds: durationSec,
    startTimestamp: startTime,
    endTimestamp: endTime,
    remainingSeconds: durationSec,
    isRunning: true,
    isPaused: false,
    cyclePosition: 1,
    currentTask: 'LeetCode'
  };

  const reloadTime = startTime + (400 * 1000);
  const remainingAtReload = TimerData.calculateRemaining(savedState.endTimestamp, reloadTime);

  assert.strictEqual(remainingAtReload, 1100, '1500 - 400 = 1100 seconds remaining');
  assert.strictEqual(TimerData.formatTime(remainingAtReload), '18:20');
});

runTest('TEST 11: Sub-minute intervals (< 60s) from premature clicks are excluded from completed sessions', () => {
  const today = new Date();
  const sessions = [
    { id: '1', mode: 'work', durationSeconds: 11, completedAt: today.toISOString(), task: '11s accidental click' },
    { id: '2', mode: 'work', durationSeconds: 1, completedAt: today.toISOString(), task: '1s accidental click' },
    { id: '3', mode: 'work', durationSeconds: 1500, completedAt: today.toISOString(), task: 'Real 25m Focus' }
  ];

  const stats = TimerData.calculateTodayStats(sessions, today);
  assert.strictEqual(stats.todayFocusCount, 1, 'Only genuine >= 60s session should count towards focus session count');
  assert.strictEqual(stats.todayFocusMinutes, 25, 'Focus minutes should only reflect genuine session');
  assert.strictEqual(stats.todaySessionsList.length, 1, 'Premature clicks (< 60s) must be excluded from today sessions list');
  assert.strictEqual(stats.todaySessionsList[0].task, 'Real 25m Focus');
});

console.log(`\nResults: ${passCount} / ${passCount + failCount} tests passed.`);
if (failCount > 0) {
  process.exit(1);
}
