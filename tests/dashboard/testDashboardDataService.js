
const assert = require('assert');
const path = require('path');

const mockStorage = {};
global.localStorage = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.Storage = {
  get: (key, def = null) => {
    const raw = global.localStorage.getItem(`devpilot_${key}`);
    try {
      return raw ? JSON.parse(raw) : def;
    } catch (e) {
      return def;
    }
  },
  set: (key, val) => {
    global.localStorage.setItem(`devpilot_${key}`, JSON.stringify(val));
  }
};

global.window = {
  Storage: global.Storage,
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {}
};

const HabitsData = require(path.join(__dirname, '../../js/data/habitsData.js'));
global.HabitsData = HabitsData;
global.window.HabitsData = HabitsData;

const HabitService = require(path.join(__dirname, '../../js/core/habitService.js'));
global.HabitService = HabitService;
global.window.HabitService = HabitService;

const DsaModule = require(path.join(__dirname, '../../js/data/dsaData.js'));
global.dsaRoadmap = DsaModule.dsaRoadmap || [];
global.window.dsaRoadmap = global.dsaRoadmap;

const CareerEngine = require(path.join(__dirname, '../../js/core/careerProgressionEngine.js'));
global.careerProgressionEngine = CareerEngine;
global.window.careerProgressionEngine = CareerEngine;

const TimerData = require(path.join(__dirname, '../../js/data/timerData.js'));
global.TimerData = TimerData;
global.window.TimerData = TimerData;

const DashboardDataService = require(path.join(__dirname, '../../js/core/dashboardDataService.js'));

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
console.log(' MAD DEV: Validating DashboardDataService');
console.log('====================================================\n');

runTest('TEST 1: GitHub Settings persistence', () => {
  DashboardDataService.setGithubSettings('mad-developer');
  const updated = DashboardDataService.getGithubSettings();
  assert.strictEqual(updated.username, 'mad-developer');

  DashboardDataService.setGithubSettings('custom-dev');
  const updated2 = DashboardDataService.getGithubSettings();
  assert.strictEqual(updated2.username, 'custom-dev');
});

runTest('TEST 2: Momentum Streak Calculation', () => {
  const streak = DashboardDataService.getStreak();
  assert.strictEqual(typeof streak.currentStreak, 'number');
  assert.strictEqual(typeof streak.isExtendedToday, 'boolean');
  assert.ok(streak.currentStreak >= 0);
});

runTest('TEST 3: Daily Goals & Main Goal retrieval', () => {
  const todayStr = DashboardDataService.getTodayDateStr();
  const goals = DashboardDataService.getDailyGoals(todayStr);
  assert.ok(Array.isArray(goals), 'Goals should be an array');
  assert.ok(goals.length > 0, 'Should have initial daily goals');

  const mainGoal = DashboardDataService.getMainGoal(todayStr);
  assert.ok(mainGoal.title, 'Main goal must have a title');
  assert.ok(mainGoal.totalCount >= goals.length, 'Total count must match goals');
  assert.strictEqual(typeof mainGoal.percentage, 'number');
});

runTest('TEST 4: Toggling Daily Goal updates progress', () => {
  const todayStr = DashboardDataService.getTodayDateStr();
  const goalsBefore = DashboardDataService.getDailyGoals(todayStr);
  const targetGoal = goalsBefore[0];
  const initialStatus = !!targetGoal.completed;

  DashboardDataService.toggleDailyGoal(targetGoal.id);

  const goalsAfter = DashboardDataService.getDailyGoals(todayStr);
  const updatedGoal = goalsAfter.find(g => g.id === targetGoal.id);
  assert.strictEqual(updatedGoal.completed, !initialStatus, 'Goal completed status should toggle');

  DashboardDataService.toggleDailyGoal(targetGoal.id);
});

runTest('TEST 5: Next DSA Item Discovery', () => {
  const nextItem = DashboardDataService.getNextDSAItem();
  const dsaProgress = DashboardDataService.getDSAProgress();
  assert.ok(nextItem, 'Should return a next DSA item');
  assert.ok(nextItem.title, 'Item must have a title');
  assert.ok(nextItem.targetUrl.startsWith('pages/dsa.html'), 'URL must point to dsa.html');
  assert.strictEqual(typeof nextItem.percentage, 'number');
  assert.strictEqual(nextItem.percentage, dsaProgress.percentage, 'Next item percentage must match overall DSA total progress');
  assert.strictEqual(typeof nextItem.totalSolved, 'number');
  assert.strictEqual(typeof nextItem.totalQuestions, 'number');
});

runTest('TEST 6: Real LeetCode solved count', () => {
  const count = DashboardDataService.getLeetCodeCount();
  assert.strictEqual(typeof count, 'number');
  assert.ok(count >= 0);
});

runTest('TEST 7: Career Roadmap milestones & Next Milestone', () => {
  const roadmapProgress = DashboardDataService.getCareerRoadmapProgress();
  assert.ok(roadmapProgress, 'Should return roadmap progress');
  assert.ok(Array.isArray(roadmapProgress.milestones), 'Milestones must be an array');
  assert.strictEqual(roadmapProgress.milestones.length, 3, 'Should have 3 core milestones (DSA, Career Course, Interview Prep)');
  assert.ok(roadmapProgress.nextMilestone, 'Next milestone must exist');

  const dsaMilestone = roadmapProgress.milestones.find(m => m.type === 'dsa');
  assert.ok(dsaMilestone, 'DSA milestone must exist');
  assert.strictEqual(typeof dsaMilestone.percentage, 'number');

  const careerMilestone = roadmapProgress.milestones.find(m => m.type === 'career');
  assert.ok(careerMilestone, 'Career milestone must exist');
  assert.ok(careerMilestone.title.includes('Career:'), 'Career title should include role name');
  assert.strictEqual(typeof careerMilestone.percentage, 'number');
  assert.ok(careerMilestone.subtitle, 'Career milestone must have level & skills subtitle');
  assert.ok(careerMilestone.url, 'Career milestone must have a link');

  const interviewMilestone = roadmapProgress.milestones.find(m => m.type === 'interview');
  assert.ok(interviewMilestone, 'Interview Prep milestone must exist');
  assert.ok(interviewMilestone.title.includes('Interview:'), 'Interview milestone must include category section');
  assert.strictEqual(typeof interviewMilestone.percentage, 'number');
  assert.ok(interviewMilestone.subtitle, 'Interview milestone must include subsection/topic');
  assert.ok(interviewMilestone.question, 'Interview milestone must include active/next question preview');

  const interviewDetails = DashboardDataService.getInterviewPrepDetails();
  assert.ok(interviewDetails.categoryTitle, 'Interview details must have category section title');
  assert.ok(interviewDetails.topicName, 'Interview details must have subsection/topic name');
  assert.ok(interviewDetails.nextQuestion, 'Interview details must provide next question text');

  Storage.set('career_roadmaps_progress', {
    activeCareer: 'frontend-developer',
    activeCareerStatus: 'active',
    'frontend-developer': {
      completed: ['fe-html', 'fe-css']
    }
  });

  const updatedProgress = DashboardDataService.getCareerRoadmapProgress();
  assert.strictEqual(updatedProgress.activeCareerId, 'frontend-developer');
  assert.ok(updatedProgress.roleTitle.toLowerCase().includes('frontend'));
  assert.ok(updatedProgress.percent > 0, 'Completed skills must yield real percentage > 0');

  const updatedCareerMilestone = updatedProgress.milestones.find(m => m.type === 'career');
  assert.ok(updatedCareerMilestone.title.toLowerCase().includes('frontend'));
  assert.strictEqual(updatedCareerMilestone.percentage, updatedProgress.percent);

  Storage.set('career_roadmaps_progress', {});
});

runTest('TEST 8: Developer Notes Count', () => {
  const notesCount = DashboardDataService.getNotesCount();
  assert.strictEqual(typeof notesCount, 'number');
  assert.ok(notesCount >= 0);

  Storage.set('dev_notes', [{ id: '1', title: 'Test Note' }, { id: '2', title: 'Second Note' }]);
  const updatedCount = DashboardDataService.getNotesCount();
  assert.strictEqual(updatedCount, 2);

  Storage.set('dev_notes', []);
});

runTest('TEST 9: Calendar generation and leap year handling', () => {

  const feb2024 = DashboardDataService.getCalendarData(2024, 1, '2024-02-15');
  const feb2024CurrentMonthDays = feb2024.days.filter(d => d.isCurrentMonth);
  assert.strictEqual(feb2024CurrentMonthDays.length, 29, 'Feb 2024 must have 29 days');

  const feb2026 = DashboardDataService.getCalendarData(2026, 1, '2026-02-15');
  const feb2026CurrentMonthDays = feb2026.days.filter(d => d.isCurrentMonth);
  assert.strictEqual(feb2026CurrentMonthDays.length, 28, 'Feb 2026 must have 28 days');

  const selectedDay = feb2026.days.find(d => d.dateStr === '2026-02-15');
  assert.ok(selectedDay && selectedDay.isSelected, '2026-02-15 must be flagged isSelected');
});

runTest('TEST 10: AI Suggestion Engine', () => {
  const suggestion = DashboardDataService.getAISuggestion();
  assert.ok(suggestion, 'Must return an AI suggestion');
  assert.ok(suggestion.title, 'Suggestion must have a title');
  assert.ok(suggestion.reason, 'Suggestion must have an explanation');
  assert.ok(suggestion.targetUrl, 'Suggestion must have a targetUrl');
});

runTest('TEST 11: Focus Time Today Aggregation', () => {
  const todayStr = DashboardDataService.getTodayDateStr();

  const initial = DashboardDataService.getFocusTimeToday();
  assert.strictEqual(typeof initial.minutes, 'number');

  Storage.set('timer_sessions', [
    {
      id: 'sess-1',
      date: todayStr,
      durationMinutes: 25,
      mode: 'work',
      completed: true
    },
    {
      id: 'sess-2',
      date: todayStr,
      durationMinutes: 30,
      mode: 'work',
      completed: true
    }
  ]);

  const updated = DashboardDataService.getFocusTimeToday();
  assert.strictEqual(updated.minutes, 55);
  assert.strictEqual(updated.displayStr, '55m');
  assert.strictEqual(updated.sessionsCount, 2);

  Storage.set('timer_sessions', []);
});

console.log('\n----------------------------------------------------');
console.log(`Test Execution Finished: ${passCount} Passed, ${failCount} Failed`);
console.log('----------------------------------------------------');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL DASHBOARD TEST SUITES PASSED CLEANLY! 🎉\n');
  process.exit(0);
}
