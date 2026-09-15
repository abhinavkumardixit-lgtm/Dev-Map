
const assert = require('assert');
const path = require('path');

const HabitsData = require(path.join(__dirname, '../../js/data/habitsData.js'));

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
console.log(' MAD DEV: Validating Consistency & Habit Tracker');
console.log('====================================================\n');

runTest('TEST 1: Empty storage starts clean with 0 mock habits; legacy habits migrate cleanly', () => {

  const emptyMigrated = HabitsData.migrateLegacyHabits([]);
  assert.strictEqual(emptyMigrated.length, 0, 'Production users must start with empty array when no data exists');

  const nullMigrated = HabitsData.migrateLegacyHabits(null);
  assert.strictEqual(nullMigrated.length, 0, 'Null storage must return empty array');

  const legacyHabits = [
    { id: 'h1', title: 'Solve 2 LeetCode Problems', category: 'DSA', completed: true, streak: 12 },
    { id: 'h2', title: 'Revise JS Event Loop', category: 'WebDev', completed: false, streak: 8 }
  ];

  const migrated = HabitsData.migrateLegacyHabits(legacyHabits, '2026-09-14');
  assert.strictEqual(migrated.length, 2, 'Must preserve existing user habits');

  const h1 = migrated[0];
  assert.strictEqual(h1.title, 'Solve 2 LeetCode Problems');
  assert.strictEqual(h1.active, true);
  assert.strictEqual(h1.completionHistory['2026-09-14'], true, 'Today must be marked true if completed');
  assert.strictEqual(h1.completionHistory['2026-09-13'], true, 'Yesterday must be true');

  const h2 = migrated[1];
  assert.strictEqual(h2.completionHistory['2026-09-14'], undefined, 'Today must not be marked true if completed was false');
  assert.strictEqual(h2.completionHistory['2026-09-13'], true, 'Previous streak ending yesterday must be preserved');
});

runTest('TEST 2: Consecutive streak ending today vs at-risk when incomplete', () => {
  const refDate = '2026-09-14';

  const completedHabit = {
    id: 'h_test1',
    title: 'DSA Practice',
    active: true,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-14': true,
      '2026-09-13': true,
      '2026-09-12': true,
      '2026-09-11': true,
      '2026-09-10': false
    }
  };

  const statsA = HabitsData.calculateHabitStreak(completedHabit, refDate);
  assert.strictEqual(statsA.currentStreak, 4, 'Current streak should be 4');
  assert.strictEqual(statsA.isAtRisk, false, 'Not at risk because completed today');
  assert.strictEqual(statsA.isCompletedToday, true);

  const incompleteHabit = {
    id: 'h_test2',
    title: 'Commit to GitHub',
    active: true,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-13': true,
      '2026-09-12': true,
      '2026-09-11': true,
      '2026-09-10': false
    }
  };

  const statsB = HabitsData.calculateHabitStreak(incompleteHabit, refDate);
  assert.strictEqual(statsB.currentStreak, 3, 'Streak alive from yesterday should be 3');
  assert.strictEqual(statsB.isAtRisk, true, 'Must be marked at risk today');
  assert.strictEqual(statsB.isCompletedToday, false);
});

runTest('TEST 3: Streak resets to 0 when previous eligible day was missed', () => {
  const refDate = '2026-09-14';

  const brokenHabit = {
    id: 'h_broken',
    title: 'Daily Reading',
    active: true,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-12': true,
      '2026-09-11': true,
      '2026-09-10': true
    }
  };

  const stats = HabitsData.calculateHabitStreak(brokenHabit, refDate);
  assert.strictEqual(stats.currentStreak, 0, 'Current streak must be 0 because yesterday was missed');
  assert.strictEqual(stats.isAtRisk, false, 'Not at risk because streak is already broken');
});

runTest('TEST 4: Best streak correctly finds maximum run (3 -> 5 -> 8 -> 2 => best = 8)', () => {
  const history = {};

  history['2026-07-26'] = true;
  history['2026-07-27'] = true;
  history['2026-07-28'] = true;

  history['2026-08-05'] = true;
  history['2026-08-06'] = true;
  history['2026-08-07'] = true;
  history['2026-08-08'] = true;
  history['2026-08-09'] = true;

  history['2026-08-20'] = true;
  history['2026-08-21'] = true;
  history['2026-08-22'] = true;
  history['2026-08-23'] = true;
  history['2026-08-24'] = true;
  history['2026-08-25'] = true;
  history['2026-08-26'] = true;
  history['2026-08-27'] = true;

  history['2026-09-13'] = true;
  history['2026-09-14'] = true;

  const habit = {
    id: 'h_best',
    title: 'LeetCode',
    active: true,
    targetFrequency: 'daily',
    completionHistory: history
  };

  const stats = HabitsData.calculateHabitStreak(habit, '2026-09-14');
  assert.strictEqual(stats.currentStreak, 2, 'Current streak should be 2');
  assert.strictEqual(stats.bestStreak, 8, 'Best streak must find maximum run of 8');
});

runTest('TEST 5: Overall consistency streak counts any eligible habit completed on that day', () => {
  const refDate = '2026-09-14';

  const habit1 = {
    id: 'h1',
    active: true,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-14': true,
      '2026-09-12': true
    }
  };

  const habit2 = {
    id: 'h2',
    active: true,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-13': true,
      '2026-09-11': true
    }
  };

  const statsH1 = HabitsData.calculateHabitStreak(habit1, refDate);
  assert.strictEqual(statsH1.currentStreak, 1, 'Habit 1 individual streak is 1');

  const statsH2 = HabitsData.calculateHabitStreak(habit2, refDate);
  assert.strictEqual(statsH2.currentStreak, 1, 'Habit 2 streak from yesterday is 1');
  assert.strictEqual(statsH2.isAtRisk, true);

  const overall = HabitsData.calculateOverallStreak([habit1, habit2], null, refDate);
  assert.strictEqual(overall.currentStreak, 4, 'Overall consistency streak must be 4 across both habits');
  assert.strictEqual(overall.isAtRisk, false, 'Overall streak is alive today');
});

runTest('TEST 6: Engine supports normalized database rows [ { habit_id, completion_date } ]', () => {
  const refDate = '2026-09-14';

  const habits = [
    { id: 'h1', active: true, target_frequency: 'daily' },
    { id: 'h2', active: true, target_frequency: 'daily' }
  ];

  const normalizedCompletions = [
    { habit_id: 'h1', completion_date: '2026-09-14' },
    { habit_id: 'h1', completion_date: '2026-09-13' },
    { habit_id: 'h2', completion_date: '2026-09-14' }
  ];

  const progress = HabitsData.calculateTodayProgress(habits, normalizedCompletions, refDate);
  assert.strictEqual(progress.total, 2);
  assert.strictEqual(progress.completed, 2);
  assert.strictEqual(progress.pct, 100);

  const h1Streak = HabitsData.calculateHabitStreak(habits[0], refDate, normalizedCompletions);
  assert.strictEqual(h1Streak.currentStreak, 2);

  const overall = HabitsData.calculateOverallStreak(habits, normalizedCompletions, refDate);
  assert.strictEqual(overall.currentStreak, 2);
});

runTest('TEST 7: Today completion accurately calculates fraction and percentage', () => {
  const refDate = '2026-09-14';

  const habits = [
    { id: 'h1', active: true, targetFrequency: 'daily', completionHistory: { '2026-09-14': true } },
    { id: 'h2', active: true, targetFrequency: 'daily', completionHistory: { '2026-09-14': true } },
    { id: 'h3', active: true, targetFrequency: 'daily', completionHistory: { '2026-09-14': false } },
    { id: 'h4', active: true, targetFrequency: 'daily', completionHistory: { '2026-09-14': false } }
  ];

  const progress = HabitsData.calculateTodayProgress(habits, null, refDate);
  assert.strictEqual(progress.total, 4);
  assert.strictEqual(progress.completed, 2);
  assert.strictEqual(progress.pct, 50);
  assert.strictEqual(progress.text, '2 of 4 Completed');
});

runTest('TEST 8: Weekly momentum handles zero previous activity safely without NaN or Infinity', () => {
  const refDate = '2026-09-14';

  const emptyHabits = [
    { id: 'h1', active: true, targetFrequency: 'daily', completionHistory: {} }
  ];
  const momentumEmpty = HabitsData.calculateWeeklyMomentum(emptyHabits, null, refDate);
  assert.strictEqual(momentumEmpty.diffPct, 0);
  assert.strictEqual(momentumEmpty.diffText, 'Baseline week');
  assert.ok(!isNaN(momentumEmpty.diffPct), 'diffPct must not be NaN');

  const activeThisWeek = [
    {
      id: 'h1',
      active: true,
      targetFrequency: 'daily',
      completionHistory: {
        '2026-09-14': true,
        '2026-09-13': true,
        '2026-09-12': true
      }
    }
  ];
  const momentumNew = HabitsData.calculateWeeklyMomentum(activeThisWeek, null, refDate);
  assert.strictEqual(momentumNew.diffText, 'New activity this week');
  assert.ok(!isNaN(momentumNew.diffPct));
});

runTest('TEST 9: Heatmap matrix generates 26 columns with correct intensity levels (l0 to l4)', () => {
  const refDate = '2026-09-14';

  const completions = [

    { habit_id: 'h1', completion_date: '2026-09-14' },

    { habit_id: 'h1', completion_date: '2026-09-13' },
    { habit_id: 'h2', completion_date: '2026-09-13' },

    { habit_id: 'h1', completion_date: '2026-09-12' },
    { habit_id: 'h2', completion_date: '2026-09-12' },
    { habit_id: 'h3', completion_date: '2026-09-12' },

    { habit_id: 'h1', completion_date: '2026-09-11' },
    { habit_id: 'h2', completion_date: '2026-09-11' },
    { habit_id: 'h3', completion_date: '2026-09-11' },
    { habit_id: 'h4', completion_date: '2026-09-11' }
  ];

  const habits = [
    { id: 'h1', title: 'Habit 1', active: true },
    { id: 'h2', title: 'Habit 2', active: true },
    { id: 'h3', title: 'Habit 3', active: true },
    { id: 'h4', title: 'Habit 4', active: true }
  ];

  const weeks = HabitsData.calculateHeatmapMatrix(habits, completions, 26, refDate);
  assert.strictEqual(weeks.length, 26, 'Heatmap must have 26 weeks');

  const allDays = weeks.flat();
  const daySep14 = allDays.find(d => d.date === '2026-09-14');
  const daySep13 = allDays.find(d => d.date === '2026-09-13');
  const daySep12 = allDays.find(d => d.date === '2026-09-12');
  const daySep11 = allDays.find(d => d.date === '2026-09-11');
  const daySep10 = allDays.find(d => d.date === '2026-09-10');

  assert.strictEqual(daySep14.levelClass, 'heatmap-l1', '1 completion = l1');
  assert.strictEqual(daySep13.levelClass, 'heatmap-l2', '2 completions = l2');
  assert.strictEqual(daySep12.levelClass, 'heatmap-l3', '3 completions = l3');
  assert.strictEqual(daySep11.levelClass, 'heatmap-l4', '4 completions = l4');
  assert.strictEqual(daySep10.levelClass, 'heatmap-l0', '0 completions = l0');
});

runTest('TEST 10: Habit Insights handles empty accounts gracefully ("No data yet")', () => {

  const emptyInsights = HabitsData.calculateHabitInsights([], null, '2026-09-14');
  assert.strictEqual(emptyInsights.mostConsistent, null);
  assert.strictEqual(emptyInsights.totalCheckmarks, 0);

  const habits = [
    {
      id: 'h1',
      title: 'DSA Consistency',
      category: 'DSA',
      active: true,
      targetFrequency: 'daily',
      completionHistory: { '2026-09-14': true, '2026-09-13': true }
    },
    {
      id: 'h2',
      title: 'Docker Deployment',
      category: 'DevOps',
      active: true,
      targetFrequency: 'daily',
      completionHistory: { '2026-09-14': false, '2026-09-13': false }
    }
  ];

  const insights = HabitsData.calculateHabitInsights(habits, null, '2026-09-14');
  assert.strictEqual(insights.mostConsistent.title, 'DSA Consistency');
  assert.strictEqual(insights.needsAttention.title, 'Docker Deployment');
  assert.strictEqual(insights.totalCheckmarks, 2);
});

runTest('TEST 11: Weekly goals isolate data strictly by calendar week (YYYY-Wxx)', () => {
  const refDate = '2026-09-14';
  const weekId = HabitsData.getWeekId(refDate);
  assert.strictEqual(weekId, '2026-W38');

  const goal = {
    id: 'wg1',
    title: 'Solve DSA 5 times',
    habitId: 'h_dsa',
    target: 5,
    weekId
  };

  const habits = [
    {
      id: 'h_dsa',
      title: 'DSA',
      active: true,
      targetFrequency: 'daily',
      completionHistory: {
        '2026-09-14': true,
        '2026-09-13': true,
        '2026-09-12': true
      }
    }
  ];

  const progress = HabitsData.calculateWeeklyGoalProgress(goal, habits, null, refDate);

  assert.strictEqual(progress.current, 1, 'Must only count completions in current calendar week');
  assert.strictEqual(progress.target, 5);
  assert.strictEqual(progress.pct, 20);
});

runTest('TEST 12: Daily goals calculate progress, fraction text, and completion status', () => {
  const dailyGoals = [
    { id: 'dg1', title: '3 LeetCode Problems', target: 3, progress: 3, completed: true },
    { id: 'dg2', title: 'Read System Design', target: 1, progress: 0, completed: false }
  ];

  const summary = HabitsData.calculateDailyGoalsSummary(dailyGoals);
  assert.strictEqual(summary.total, 2);
  assert.strictEqual(summary.completed, 1);
  assert.strictEqual(summary.pct, 50);
  assert.strictEqual(summary.text, '1 of 2 Completed');
});

runTest('TEST 13: Deactivated habit is excluded from today progress but preserved in heatmap and stats', () => {
  const refDate = '2026-09-14';

  const activeHabit = {
    id: 'h_active',
    title: 'Active Habit',
    active: true,
    targetFrequency: 'daily',
    completionHistory: { '2026-09-14': true }
  };

  const archivedHabit = {
    id: 'h_archived',
    title: 'Archived Habit',
    active: false,
    targetFrequency: 'daily',
    completionHistory: {
      '2026-09-14': true,
      '2026-09-13': true,
      '2026-09-12': true
    }
  };

  const allHabits = [activeHabit, archivedHabit];

  const todayProgress = HabitsData.calculateTodayProgress(allHabits, null, refDate);
  assert.strictEqual(todayProgress.total, 1, 'Only 1 active habit scheduled today');
  assert.strictEqual(todayProgress.completed, 1);

  const heatmap = HabitsData.calculateHeatmapMatrix(allHabits, null, 26, refDate);
  const daySep13 = heatmap.flat().find(d => d.date === '2026-09-13');
  assert.strictEqual(daySep13.count, 1, 'Historical completions of archived habit must be preserved in heatmap');
});

runTest('TEST 14: Date manipulation correctly preserves local calendar dates without UTC drift', () => {
  const dateStr = '2026-09-14';
  const parsed = HabitsData.parseDate(dateStr);
  assert.strictEqual(HabitsData.formatDate(parsed), '2026-09-14');

  const plusOne = HabitsData.addDays(dateStr, 1);
  assert.strictEqual(plusOne, '2026-09-15');

  const minusSeven = HabitsData.addDays(dateStr, -7);
  assert.strictEqual(minusSeven, '2026-09-07');

  const diff = HabitsData.diffDays('2026-09-14', '2026-09-07');
  assert.strictEqual(diff, 7);
});

console.log(`\n====================================================`);
console.log(` Test Execution Complete: ${passCount} Passed, ${failCount} Failed`);
console.log(`====================================================`);

if (failCount > 0) {
  process.exit(1);
}
