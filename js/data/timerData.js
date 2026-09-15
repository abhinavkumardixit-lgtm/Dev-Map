
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TimerData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function formatDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatTime(seconds) {
    const totalSec = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const paddedMins = String(mins).padStart(2, '0');
    const paddedSecs = String(secs).padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${paddedMins}:${paddedSecs}`;
    }
    return `${paddedMins}:${paddedSecs}`;
  }

  function formatTimestamp(isoOrEpoch) {
    const d = new Date(isoOrEpoch);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function calculateRemaining(endTimestamp, now = Date.now()) {
    if (!endTimestamp || typeof endTimestamp !== 'number') return 0;
    const diffMs = endTimestamp - now;
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  function calculateProgressFraction(remainingSeconds, totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return 0;
    const fraction = remainingSeconds / totalSeconds;
    return Math.max(0, Math.min(1, fraction));
  }

  function calculateStrokeDashoffset(fraction, radius = 120) {
    const circumference = 2 * Math.PI * radius;

    const offset = circumference - (fraction * circumference);
    return {
      circumference,
      offset: Math.max(0, Math.min(circumference, offset))
    };
  }

  function getNextSessionTransition(currentMode, currentCycle = 1, sessionsBeforeLongBreak = 4) {
    const maxCycles = Math.max(2, sessionsBeforeLongBreak || 4);

    if (currentMode === 'work') {
      if (currentCycle >= maxCycles) {

        return {
          nextMode: 'longBreak',
          nextCycle: 1,
          isCycleComplete: true,
          label: 'Long Break',
          message: `Cycle complete! You've completed ${maxCycles} focus sessions. Time for a well-deserved rest.`
        };
      } else {

        return {
          nextMode: 'shortBreak',
          nextCycle: currentCycle,
          isCycleComplete: false,
          label: 'Short Break',
          message: `Focus session ${currentCycle} complete! Take a quick 5-minute break.`
        };
      }
    } else if (currentMode === 'shortBreak') {

      const nextCycle = currentCycle + 1;
      return {
        nextMode: 'work',
        nextCycle,
        isCycleComplete: false,
        label: `Focus ${nextCycle}`,
        message: `Break over! Ready for Focus session ${nextCycle} of ${maxCycles}?`
      };
    } else {

      return {
        nextMode: 'work',
        nextCycle: 1,
        isCycleComplete: false,
        label: 'Focus 1',
        message: `Long break finished! Refreshed and ready for a brand new cycle?`
      };
    }
  }

  function calculateTodayStats(sessions = [], refDate = new Date()) {
    const todayStr = formatDate(refDate);

    const refD = refDate instanceof Date ? new Date(refDate.getTime()) : new Date(refDate);
    const day = refD.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(refD);
    monday.setDate(refD.getDate() + diffToMon);
    const mondayStr = formatDate(monday);

    let todayFocusCount = 0;
    let todayFocusSeconds = 0;
    let weekFocusCount = 0;
    let totalFocusSeconds = 0;
    let longestSessionSeconds = 0;
    let lastCompletedSession = null;

    const todaySessionsList = [];

    sessions.forEach(s => {
      if (!s || !s.completedAt) return;
      const sDateStr = formatDate(s.completedAt);
      const isWork = s.mode === 'work';
      const durationSec = s.durationSeconds || 0;

      if (isWork) {

        if (durationSec < 60) return;

        totalFocusSeconds += durationSec;
        if (durationSec > longestSessionSeconds) {
          longestSessionSeconds = durationSec;
        }

        if (sDateStr >= mondayStr && sDateStr <= todayStr) {
          weekFocusCount++;
        }

        if (sDateStr === todayStr) {
          todayFocusCount++;
          todayFocusSeconds += durationSec;
          todaySessionsList.push(s);
        }
      }

      if (!lastCompletedSession || new Date(s.completedAt) > new Date(lastCompletedSession.completedAt)) {
        lastCompletedSession = s;
      }
    });

    todaySessionsList.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const todayFocusMinutes = todayFocusSeconds > 0 ? Math.max(1, Math.round(todayFocusSeconds / 60)) : 0;
    const totalFocusMinutes = totalFocusSeconds > 0 ? Math.max(1, Math.round(totalFocusSeconds / 60)) : 0;

    return {
      todayFocusCount,
      todayFocusMinutes,
      weekFocusCount,
      totalFocusMinutes,
      longestSessionMinutes: Math.round(longestSessionSeconds / 60),
      todaySessionsList,
      lastCompletedSession
    };
  }

  function getDefaultSettings() {
    return {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      autoStart: false,
      soundEnabled: true,
      notificationsEnabled: false
    };
  }

  function validateDuration(val, min = 1, max = 120, defaultVal = 25) {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < min) return min;
    if (num > max) return max;
    return num;
  }

  function generateStarterSessions() {
    return [];
  }

  return {
    formatDate,
    formatTime,
    formatTimestamp,
    calculateRemaining,
    calculateProgressFraction,
    calculateStrokeDashoffset,
    getNextSessionTransition,
    calculateTodayStats,
    getDefaultSettings,
    validateDuration,
    generateStarterSessions
  };
});
