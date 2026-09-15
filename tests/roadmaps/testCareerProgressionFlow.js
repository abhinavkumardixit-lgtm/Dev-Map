
const assert = require('assert');
const path = require('path');

const storageStore = {};
global.localStorage = {
  getItem: (key) => storageStore[key] || null,
  setItem: (key, val) => { storageStore[key] = String(val); },
  removeItem: (key) => { delete storageStore[key]; },
  clear: () => { for (const k of Object.keys(storageStore)) delete storageStore[k]; }
};

const rootDir = path.resolve(__dirname, '../../');
const engine = require(path.join(rootDir, 'js/core/careerProgressionEngine.js'));
const { careerRoles } = require(path.join(rootDir, 'js/data/careerRolesData.js'));
const { careerRoadmaps } = require(path.join(rootDir, 'js/data/careerRoadmapsData.js'));
const roadmapsController = require(path.join(rootDir, 'js/pages/roadmaps.js'));

global.careerRoadmaps = careerRoadmaps;
global.careerRoles = careerRoles;

let totalTests = 0;
let passedTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [FAIL] ${description}`);
    console.error(`  Error: ${err.message}`);
    console.error(err.stack);
  }
}

console.log('===========================================================');
console.log(' MAD DEV: Career Progression & Flow Test Suite');
console.log('===========================================================\n');

runTest('Initial state: No active career, all roles are AVAILABLE', () => {
  localStorage.clear();
  const state = engine.getCareerState();
  assert.strictEqual(state.activeCareer, null, 'Active career should initially be null');
  assert.strictEqual(engine.getActiveCareerId(state), null);

  const feCardState = engine.getRoleCardState('frontend-developer', state);
  const beCardState = engine.getRoleCardState('backend-developer', state);
  assert.strictEqual(feCardState, 'AVAILABLE');
  assert.strictEqual(beCardState, 'AVAILABLE');
});

runTest('Commitment flow: Committing to Frontend Developer sets it ACTIVE and locks other roles', () => {
  const commitAnswers = {
    goal: 'Get a full-time job',
    experienceLevel: 'Beginner',
    sequenceConsent: true
  };

  const updatedState = engine.commitToCareer('frontend-developer', commitAnswers);
  assert.strictEqual(updatedState.activeCareer, 'frontend-developer');
  assert.strictEqual(updatedState.activeCareerStatus, 'active');
  assert.ok(updatedState.commitmentData['frontend-developer'], 'Commitment data must be recorded');
  assert.strictEqual(updatedState.commitmentData['frontend-developer'].goal, 'Get a full-time job');
  assert.strictEqual(updatedState.commitmentData['frontend-developer'].experienceLevel, 'Beginner');

  assert.strictEqual(engine.getRoleCardState('frontend-developer', updatedState), 'ACTIVE', 'Frontend must be ACTIVE');
  assert.strictEqual(engine.getRoleCardState('backend-developer', updatedState), 'LOCKED', 'Backend must be LOCKED');
  assert.strictEqual(engine.getRoleCardState('ai-engineer', updatedState), 'LOCKED', 'AI Engineer must be LOCKED');
  assert.strictEqual(engine.getRoleCardState('devops-engineer', updatedState), 'LOCKED', 'DevOps must be LOCKED');
});

runTest('Sequential locking: Level 1 topic 1 is available, subsequent topics and future levels are locked', () => {
  const feRoadmap = careerRoadmaps['frontend'];
  const state = engine.getCareerState();

  const statuses = engine.resolveSequentialNodeStatuses('frontend-developer', feRoadmap, state);

  assert.ok(statuses['fe-html'], 'fe-html must exist in status map');
  assert.strictEqual(statuses['fe-html'].status, 'available', 'fe-html must be available initially');

  assert.ok(statuses['fe-css'], 'fe-css must exist in status map');
  assert.strictEqual(statuses['fe-css'].status, 'locked', 'fe-css must be locked before fe-html is completed');
  assert.ok(statuses['fe-css'].reason.includes('HTML5'), 'Lock reason must mention HTML5');

  const lvl2Skill = feRoadmap.levels[1].skills[0];
  assert.strictEqual(statuses[lvl2Skill.id].status, 'locked', 'Level 2 topics must be locked before Level 1 is completed');
});

runTest('Completing fe-html unlocks fe-css; subsequent topics unlock sequentially', () => {
  const feRoadmap = careerRoadmaps['frontend'];

  const success = roadmapsController.setSkillStatus('frontend-developer', 'fe-html', 'completed');
  assert.strictEqual(success, true, 'setSkillStatus on available fe-html should succeed');

  const state = engine.getCareerState();
  assert.ok(state['frontend-developer'].completed.includes('fe-html'), 'fe-html in completed list');

  const statuses = engine.resolveSequentialNodeStatuses('frontend-developer', feRoadmap, state);
  assert.strictEqual(statuses['fe-html'].status, 'completed');
  assert.strictEqual(statuses['fe-css'].status, 'available', 'fe-css should unlock to available now');
});

runTest('Anti-skipping: Directly marking a locked topic complete is strictly rejected', () => {
  const feRoadmap = careerRoadmaps['frontend'];
  const state = engine.getCareerState();

  const lvl3Skill = feRoadmap.levels[2].skills[0];
  const validation = engine.validateSkillAction('frontend-developer', lvl3Skill.id, 'completed', state, feRoadmap);

  assert.strictEqual(validation.valid, false, 'Validation must reject completing locked skill');
  assert.strictEqual(validation.nodeStatus, 'locked');
  assert.ok(validation.error.length > 0, 'Error reason must be provided');

  const attempted = roadmapsController.setSkillStatus('frontend-developer', lvl3Skill.id, 'completed');
  assert.strictEqual(attempted, false, 'Controller must reject completing locked skill');

  const stateAfter = engine.getCareerState();
  assert.strictEqual(stateAfter['frontend-developer'].completed.includes(lvl3Skill.id), false);
});

runTest('Action protection: Attempting to complete a topic in a locked career is rejected', () => {
  const beRoadmap = careerRoadmaps['backend'];
  const state = engine.getCareerState();
  assert.strictEqual(state.activeCareer, 'frontend-developer');

  const beFirstSkill = beRoadmap.levels[0].skills[0];
  const validation = engine.validateSkillAction('backend-developer', beFirstSkill.id, 'completed', state, beRoadmap);

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.nodeStatus, 'career-locked');
  assert.ok(validation.error.includes('currently locked'));
});

runTest('Project milestones: Project 1 requires Level 1 completion; Project 2 requires Level 2', () => {
  const feRoadmap = careerRoadmaps['frontend'];
  const state = engine.getCareerState();

  const p1Status = engine.getProjectLockStatus('frontend-developer', 0, state, feRoadmap);
  assert.strictEqual(p1Status.isUnlocked, false, 'Project 1 must be locked until Level 1 is fully completed');
  assert.strictEqual(p1Status.requiredLevel, 1);

  feRoadmap.levels[0].skills.forEach(s => {
    if (!state['frontend-developer'].completed.includes(s.id)) {
      state['frontend-developer'].completed.push(s.id);
    }
  });
  engine.saveCareerState(state);

  const p1StatusAfter = engine.getProjectLockStatus('frontend-developer', 0, state, feRoadmap);
  assert.strictEqual(p1StatusAfter.isUnlocked, true, 'Project 1 must unlock after Level 1 is completed');

  const p2Status = engine.getProjectLockStatus('frontend-developer', 1, state, feRoadmap);
  assert.strictEqual(p2Status.isUnlocked, false, 'Project 2 must remain locked until Level 2 is completed');
});

runTest('"You Are Here" tracking calculates accurate current topic, next topic, and locked milestone', () => {
  const feRoadmap = careerRoadmaps['frontend'];
  const state = engine.getCareerState();

  const youAreHere = engine.getYouAreHereInfo('frontend-developer', feRoadmap, state);
  assert.ok(youAreHere, 'YouAreHere object returned');
  assert.ok(youAreHere.currentSkill, 'Current topic identified');
  assert.ok(youAreHere.nextSkill, 'Next topic identified');
  assert.ok(youAreHere.nextLockedMilestone, 'Next locked milestone identified');

  const feRole = careerRoles.find(r => r.id === 'frontend-developer');
  const prog = roadmapsController.calculateRoleProgress(feRole);
  assert.ok(prog.completed > 0, 'Completed count > 0');
  assert.strictEqual(prog.percent, Math.round((prog.completed / prog.total) * 100));
});

runTest('Pause and Resume: Pausing changes card state to PAUSED without deleting progress', () => {
  const pausedState = engine.pauseActiveCareer('frontend-developer');
  assert.strictEqual(pausedState.activeCareerStatus, 'paused');
  assert.strictEqual(engine.getRoleCardState('frontend-developer', pausedState), 'PAUSED');

  assert.ok(pausedState['frontend-developer'].completed.length > 0);

  const resumedState = engine.resumeActiveCareer('frontend-developer');
  assert.strictEqual(resumedState.activeCareerStatus, 'active');
  assert.strictEqual(engine.getRoleCardState('frontend-developer', resumedState), 'ACTIVE');
});

runTest('Change Career flow: Preserves old progress in history, allows switching to another and restoring', () => {
  const feRole = careerRoles.find(r => r.id === 'frontend-developer');
  const currentProg = roadmapsController.calculateRoleProgress(feRole);
  const completedFeSkillsCount = currentProg.completed;
  assert.ok(completedFeSkillsCount > 0);

  const switchedState = engine.changeActiveCareer(
    'backend-developer',
    'I discovered another career I prefer',
    currentProg.percent
  );

  assert.strictEqual(switchedState.activeCareer, 'backend-developer');
  assert.strictEqual(switchedState.activeCareerStatus, 'active');
  assert.strictEqual(engine.getRoleCardState('backend-developer', switchedState), 'ACTIVE');
  assert.strictEqual(engine.getRoleCardState('frontend-developer', switchedState), 'LOCKED');

  assert.ok(switchedState.previousCareers.length > 0);
  const prevEntry = switchedState.previousCareers[switchedState.previousCareers.length - 1];
  assert.strictEqual(prevEntry.careerId, 'frontend-developer');
  assert.strictEqual(prevEntry.reason, 'I discovered another career I prefer');

  assert.strictEqual(switchedState['frontend-developer'].completed.length, completedFeSkillsCount);

  const restoredState = engine.changeActiveCareer('frontend-developer', 'Switched back');
  assert.strictEqual(restoredState.activeCareer, 'frontend-developer');
  assert.strictEqual(engine.getRoleCardState('frontend-developer', restoredState), 'ACTIVE');

  const restoredProg = roadmapsController.calculateRoleProgress(feRole);
  assert.strictEqual(restoredProg.completed, completedFeSkillsCount);
});

runTest('getActiveCareerDashboardSummary returns accurate data for dashboard display', () => {
  const summary = engine.getActiveCareerDashboardSummary(engine.getCareerState(), careerRoles, careerRoadmaps);
  assert.strictEqual(summary.hasActiveCareer, true);
  assert.strictEqual(summary.activeCareerId, 'frontend-developer');
  assert.strictEqual(summary.roleTitle, 'Frontend Developer');
  assert.ok(summary.percent > 0);
  assert.ok(summary.currentSkillTitle);
  assert.strictEqual(summary.status, 'active');
});

runTest('Backward compatibility: resolveRoadmapNodeStatuses, calculateRoleProgress, and findNextRecommendedSkill exist and work', () => {
  const feRoadmap = careerRoadmaps['frontend'];
  const statusMap = roadmapsController.resolveRoadmapNodeStatuses('frontend-developer', feRoadmap);
  assert.ok(typeof statusMap === 'object');
  assert.strictEqual(typeof statusMap['fe-html'], 'string', 'Values in resolveRoadmapNodeStatuses must be simple strings for legacy tests');

  const feRole = careerRoles.find(r => r.id === 'frontend-developer');
  const prog = roadmapsController.calculateRoleProgress(feRole);
  assert.ok(prog.total > 0);

  const next = roadmapsController.findNextRecommendedSkill(feRoadmap, statusMap);
  assert.ok(next !== null);
});

console.log(`\n===========================================================`);
console.log(` Career Progression Results: ${passedTests} / ${totalTests} Passed`);
console.log(`===========================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
