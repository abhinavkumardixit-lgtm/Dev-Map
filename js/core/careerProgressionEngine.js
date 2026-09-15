
(function () {
  'use strict';

  const STORAGE_KEY = 'career_roadmaps_progress';

  function getCareerState() {
    if (typeof Storage !== 'undefined' && Storage.get) {
      const res = Storage.get(STORAGE_KEY, null);
      if (res && typeof res === 'object') {
        if (!res.commitmentData) res.commitmentData = {};
        if (!Array.isArray(res.previousCareers)) res.previousCareers = [];
        return res;
      }
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`devpilot_${STORAGE_KEY}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.commitmentData) parsed.commitmentData = {};
            if (!Array.isArray(parsed.previousCareers)) parsed.previousCareers = [];
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[CareerProgressionEngine] Error reading storage:', e);
    }
    return {
      activeCareer: null,
      activeCareerStatus: 'available',
      commitmentData: {},
      previousCareers: []
    };
  }

  function saveCareerState(state) {
    if (!state || typeof state !== 'object') return;
    if (typeof Storage !== 'undefined' && Storage.set) {
      Storage.set(STORAGE_KEY, state);
      return;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`devpilot_${STORAGE_KEY}`, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('[CareerProgressionEngine] Error saving storage:', e);
    }
  }

  function getActiveCareerId(state = getCareerState()) {
    return state.activeCareer || null;
  }

  function getRoleCardState(roleId, state = getCareerState(), roleProgress = null) {
    const activeId = state.activeCareer;
    const activeStatus = state.activeCareerStatus || 'active';

    if (activeId === roleId) {
      if (activeStatus === 'paused') return 'PAUSED';
      if (activeStatus === 'completed') return 'COMPLETED';
      if (roleProgress && roleProgress.percent >= 100) return 'COMPLETED';
      return 'ACTIVE';
    }

    if (activeId && activeStatus !== 'completed') {
      return 'LOCKED';
    }

    return 'AVAILABLE';
  }

  function commitToCareer(careerId, answers = {}) {
    if (!careerId) throw new Error('Career ID is required to commit');

    const state = getCareerState();
    state.activeCareer = careerId;
    state.activeCareerStatus = 'active';

    if (!state.commitmentData) state.commitmentData = {};
    state.commitmentData[careerId] = {
      committedAt: new Date().toISOString(),
      goal: answers.goal || 'Build strong professional skills',
      experienceLevel: answers.experienceLevel || 'Beginner',
      sequenceConsent: answers.sequenceConsent !== false,
      commitmentConfirmed: true
    };

    if (!state[careerId]) {
      state[careerId] = {
        completed: [],
        inProgress: [],
        checklist: [],
        completedProjects: []
      };
    }

    saveCareerState(state);
    return state;
  }

  function pauseActiveCareer(careerId) {
    const state = getCareerState();
    if (state.activeCareer === careerId) {
      state.activeCareerStatus = 'paused';
      saveCareerState(state);
    }
    return state;
  }

  function resumeActiveCareer(careerId) {
    const state = getCareerState();
    if (state.activeCareer === careerId) {
      state.activeCareerStatus = 'active';
      saveCareerState(state);
    }
    return state;
  }

  function changeActiveCareer(newCareerId = null, reason = 'Other', currentProgressPct = 0) {
    const state = getCareerState();
    const oldCareerId = state.activeCareer;

    if (oldCareerId) {
      if (!Array.isArray(state.previousCareers)) state.previousCareers = [];
      state.previousCareers.push({
        careerId: oldCareerId,
        progressPercent: currentProgressPct || 0,
        switchedAt: new Date().toISOString(),
        reason: reason || 'Exploring another path'
      });
    }

    if (newCareerId) {
      state.activeCareer = newCareerId;
      state.activeCareerStatus = 'active';
      if (!state[newCareerId]) {
        state[newCareerId] = { completed: [], inProgress: [], checklist: [], completedProjects: [] };
      }
    } else {
      state.activeCareer = null;
      state.activeCareerStatus = 'available';
    }

    saveCareerState(state);
    return state;
  }

  function resetCareerProgress(careerId) {
    const state = getCareerState();
    if (careerId) {
      state[careerId] = {
        completed: [],
        inProgress: [],
        checklist: [],
        completedProjects: []
      };
      if (state.activeCareer === careerId && state.activeCareerStatus === 'completed') {
        state.activeCareerStatus = 'active';
      }
      saveCareerState(state);
    }
    return state;
  }

  function getProjectLockStatus(careerId, projectIndex, userState, roadmap) {
    if (!roadmap || !Array.isArray(roadmap.levels)) {
      return { isUnlocked: true, requiredLevel: 1, reason: '' };
    }

    const roleState = userState[careerId] || { completed: [] };
    const completedSet = new Set(roleState.completed || []);

    const isLevelDone = (lvlNum) => {
      const levelObj = roadmap.levels.find(l => l.levelNum === lvlNum);
      if (!levelObj || !Array.isArray(levelObj.skills) || levelObj.skills.length === 0) return true;

      const essential = levelObj.skills.filter(s => (s.importance || '').toLowerCase() === 'essential' || (s.importance || '').toLowerCase() === 'core');
      const targets = essential.length > 0 ? essential : levelObj.skills;
      return targets.every(s => completedSet.has(s.id));
    };

    if (projectIndex === 0) {
      const l1Done = isLevelDone(1);
      return {
        isUnlocked: l1Done,
        requiredLevel: 1,
        reason: l1Done ? 'Unlocked' : 'Complete Level 1: Foundation skills to unlock Project 01'
      };
    }

    if (projectIndex === 1) {
      const l1Done = isLevelDone(1);
      const l2Done = isLevelDone(2);
      const unlocked = l1Done && l2Done;
      return {
        isUnlocked: unlocked,
        requiredLevel: 2,
        reason: unlocked ? 'Unlocked' : 'Complete Level 2: Core skills to unlock Project 02'
      };
    }

    const l1Done = isLevelDone(1);
    const l2Done = isLevelDone(2);
    const l3Done = isLevelDone(3);
    const unlocked = l1Done && l2Done && l3Done;
    return {
      isUnlocked: unlocked,
      requiredLevel: 3,
      reason: unlocked ? 'Unlocked' : 'Complete Level 3: Advanced architecture skills to unlock Project 03'
    };
  }

  function isJobReadyUnlocked(careerId, userState, roadmap) {
    if (!roadmap || !Array.isArray(roadmap.levels)) return false;
    const roleState = userState[careerId] || { completed: [] };
    const completedSet = new Set(roleState.completed || []);

    let totalEssential = 0;
    let completedEssential = 0;

    roadmap.levels.forEach(lvl => {
      (lvl.skills || []).forEach(s => {
        totalEssential++;
        if (completedSet.has(s.id)) completedEssential++;
      });
    });

    if (totalEssential === 0) return false;

    return (completedEssential / totalEssential) >= 0.8;
  }

  function resolveSequentialNodeStatuses(careerId, roadmap, userState = getCareerState()) {
    const nodeStatusMap = {};
    if (!roadmap || !Array.isArray(roadmap.levels)) return nodeStatusMap;

    const roleState = userState[careerId] || { completed: [], inProgress: [] };
    const completedSet = new Set(roleState.completed || []);
    const inProgressSet = new Set(roleState.inProgress || []);

    const skillNameMap = {};
    roadmap.levels.forEach(lvl => {
      (lvl.skills || []).forEach(s => {
        skillNameMap[s.id] = s.title || s.id;
      });
    });

    const isLevelCompleted = (lvlNum) => {
      const lvl = roadmap.levels.find(l => l.levelNum === lvlNum);
      if (!lvl || !lvl.skills || lvl.skills.length === 0) return true;

      const essential = lvl.skills.filter(s => (s.importance || '').toLowerCase() === 'essential' || (s.importance || '').toLowerCase() === 'core');
      const targets = essential.length > 0 ? essential : lvl.skills;
      return targets.every(s => completedSet.has(s.id));
    };

    roadmap.levels.forEach((lvl, lvlIdx) => {
      const lvlNum = lvl.levelNum || (lvlIdx + 1);
      const skills = lvl.skills || [];

      const priorLevelCompleted = lvlNum === 1 || isLevelCompleted(lvlNum - 1);

      skills.forEach((skill, sIdx) => {

        if (completedSet.has(skill.id)) {
          nodeStatusMap[skill.id] = {
            status: 'completed',
            reason: 'Skill mastered',
            missingPrereqs: []
          };
          return;
        }

        if (inProgressSet.has(skill.id)) {
          nodeStatusMap[skill.id] = {
            status: 'in-progress',
            reason: 'Actively learning',
            missingPrereqs: []
          };
          return;
        }

        const prereqs = Array.isArray(skill.prerequisites) ? skill.prerequisites : [];
        const missingExplicit = prereqs.filter(pId => !completedSet.has(pId));

        if (missingExplicit.length > 0) {
          const missingTitles = missingExplicit.map(pId => skillNameMap[pId] || pId);
          nodeStatusMap[skill.id] = {
            status: 'locked',
            reason: `Prerequisite required: ${missingTitles.join(', ')}`,
            missingPrereqs: missingExplicit,
            missingTitles
          };
          return;
        }

        if (sIdx > 0 && prereqs.length === 0) {
          const prevSkill = skills[sIdx - 1];
          if (!completedSet.has(prevSkill.id)) {
            nodeStatusMap[skill.id] = {
              status: 'locked',
              reason: `Complete preceding topic "${prevSkill.title}" first`,
              missingPrereqs: [prevSkill.id],
              missingTitles: [prevSkill.title]
            };
            return;
          }
        }

        if (!priorLevelCompleted && sIdx > 0) {
          nodeStatusMap[skill.id] = {
            status: 'locked',
            reason: `Complete Level ${lvlNum - 1} foundational skills to unlock this advanced topic`,
            missingPrereqs: [],
            missingTitles: [`Level ${lvlNum - 1}`]
          };
          return;
        }

        nodeStatusMap[skill.id] = {
          status: 'available',
          reason: 'Ready to learn',
          missingPrereqs: []
        };
      });
    });

    return nodeStatusMap;
  }

  function validateSkillAction(careerId, skillId, newStatus, userState = getCareerState(), roadmap = null) {
    if (!careerId || !skillId) {
      return { valid: false, error: 'Invalid career or skill identifier' };
    }

    if (userState.activeCareer && userState.activeCareer !== careerId) {
      return {
        valid: false,
        error: 'This career path is currently locked. Complete or change your active career path to learn this skill.',
        nodeStatus: 'career-locked'
      };
    }

    if (newStatus === 'available') {
      return { valid: true };
    }

    if (roadmap) {
      const nodeStatusMap = resolveSequentialNodeStatuses(careerId, roadmap, userState);
      const nodeInfo = nodeStatusMap[skillId];

      if (!nodeInfo) {
        return { valid: false, error: 'Skill node not found in roadmap' };
      }

      if (nodeInfo.status === 'locked') {
        return {
          valid: false,
          error: nodeInfo.reason || 'This skill is currently locked by prerequisite dependencies.',
          nodeStatus: 'locked',
          missingPrereqs: nodeInfo.missingPrereqs
        };
      }
    }

    return { valid: true };
  }

  function getYouAreHereInfo(careerId, roadmap, userState = getCareerState(), nodeStatusMap = null) {
    if (!roadmap || !Array.isArray(roadmap.levels)) {
      return null;
    }

    const statuses = nodeStatusMap || resolveSequentialNodeStatuses(careerId, roadmap, userState);

    let currentSkill = null;
    let nextSkill = null;
    let nextLockedMilestone = null;
    let currentLevelName = '';
    let currentLevelNum = 1;

    for (const lvl of roadmap.levels) {
      for (const s of lvl.skills || []) {
        const info = statuses[s.id];
        if (info && info.status === 'in-progress') {
          currentSkill = s;
          currentLevelName = lvl.name;
          currentLevelNum = lvl.levelNum;
          break;
        }
      }
      if (currentSkill) break;
    }

    if (!currentSkill) {
      for (const lvl of roadmap.levels) {
        for (const s of lvl.skills || []) {
          const info = statuses[s.id];
          if (info && info.status === 'available') {
            currentSkill = s;
            currentLevelName = lvl.name;
            currentLevelNum = lvl.levelNum;
            break;
          }
        }
        if (currentSkill) break;
      }
    }

    if (currentSkill) {
      let foundCurrent = false;
      for (const lvl of roadmap.levels) {
        for (const s of lvl.skills || []) {
          if (foundCurrent) {
            nextSkill = s;
            break;
          }
          if (s.id === currentSkill.id) {
            foundCurrent = true;
          }
        }
        if (nextSkill) break;
      }
    }

    for (const lvl of roadmap.levels) {
      for (const s of lvl.skills || []) {
        const info = statuses[s.id];
        if (info && info.status === 'locked') {
          nextLockedMilestone = s;
          break;
        }
      }
      if (nextLockedMilestone) break;
    }

    return {
      currentLevelNum,
      currentLevelName,
      currentSkill,
      nextSkill,
      nextLockedMilestone
    };
  }

  function getActiveCareerDashboardSummary(userState = getCareerState(), roles = [], roadmaps = {}) {
    const activeId = userState.activeCareer;
    if (!activeId) {
      return {
        hasActiveCareer: false,
        roleTitle: 'No Active Roadmap',
        percent: 0,
        status: 'available'
      };
    }

    const role = (roles || []).find(r => r.id === activeId);
    const roadmap = roadmaps ? roadmaps[role?.roadmapId || activeId] : null;

    let percent = 0;
    let completedCount = 0;
    let totalCount = 0;

    if (roadmap && Array.isArray(roadmap.levels)) {
      const roleProg = userState[activeId] || { completed: [] };
      const completedSet = new Set(roleProg.completed || []);
      roadmap.levels.forEach(lvl => {
        (lvl.skills || []).forEach(s => {
          totalCount++;
          if (completedSet.has(s.id)) completedCount++;
        });
      });
      percent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
    }

    const youAreHere = roadmap ? getYouAreHereInfo(activeId, roadmap, userState) : null;

    return {
      hasActiveCareer: true,
      activeCareerId: activeId,
      roleTitle: role ? role.title : activeId,
      roleIcon: role ? role.icon : 'map',
      percent,
      completedCount,
      totalCount,
      status: userState.activeCareerStatus || 'active',
      currentSkillTitle: youAreHere?.currentSkill?.title || null,
      nextSkillTitle: youAreHere?.nextSkill?.title || null,
      currentLevelName: youAreHere?.currentLevelName || null,
      currentLevelNum: youAreHere?.currentLevelNum || 1
    };
  }

  if (typeof window !== 'undefined') {
    window.careerProgressionEngine = {
      getCareerState,
      saveCareerState,
      getActiveCareerId,
      getRoleCardState,
      commitToCareer,
      pauseActiveCareer,
      resumeActiveCareer,
      changeActiveCareer,
      resetCareerProgress,
      getProjectLockStatus,
      isJobReadyUnlocked,
      resolveSequentialNodeStatuses,
      validateSkillAction,
      getYouAreHereInfo,
      getActiveCareerDashboardSummary
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getCareerState,
      saveCareerState,
      getActiveCareerId,
      getRoleCardState,
      commitToCareer,
      pauseActiveCareer,
      resumeActiveCareer,
      changeActiveCareer,
      resetCareerProgress,
      getProjectLockStatus,
      isJobReadyUnlocked,
      resolveSequentialNodeStatuses,
      validateSkillAction,
      getYouAreHereInfo,
      getActiveCareerDashboardSummary
    };
  }
})();
