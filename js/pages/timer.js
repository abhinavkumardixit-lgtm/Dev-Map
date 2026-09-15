
(function () {
  'use strict';

  let settings = {};
  let activeState = {};
  let sessions = [];
  let timerInterval = null;
  let nextPendingTransition = null;

  let dom = {};

  document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    loadSettings();
    loadSessions();
    loadActiveState();
    bindEvents();
    renderAll();
    setupVisibilityListeners();
  });

  function cacheDomElements() {
    dom = {

      completedRoundsCount: document.getElementById('completed-rounds-count'),
      btnExitFocusMode: document.getElementById('btn-exit-focus-mode'),
      btnExitFocusTop: document.getElementById('btn-exit-focus-top'),
      btnExitFocusCenter: document.getElementById('btn-exit-focus-center'),
      btnFocusMode: document.getElementById('btn-focus-mode'),
      btnShortcuts: document.getElementById('btn-shortcuts'),
      btnTimerSettings: document.getElementById('btn-timer-settings'),
      focusModeTaskText: document.getElementById('focus-mode-task-text'),
      focusModeTaskPill: document.getElementById('focus-mode-task-pill'),

      taskInput: document.getElementById('task-input'),
      taskSuggestionsRow: document.getElementById('task-suggestions-row'),
      activeTaskDisplay: document.getElementById('active-task-display'),
      activeTaskText: document.getElementById('active-task-text'),

      modeBtns: document.querySelectorAll('.timer-mode-btn'),
      modeBtnWork: document.getElementById('mode-btn-work'),
      modeBtnShort: document.getElementById('mode-btn-short'),
      modeBtnLong: document.getElementById('mode-btn-long'),
      modeWorkMin: document.getElementById('mode-work-min'),
      modeShortMin: document.getElementById('mode-short-min'),
      modeLongMin: document.getElementById('mode-long-min'),

      timerCircleContainer: document.getElementById('timer-circle-container'),
      timerCircleProgress: document.getElementById('timer-circle-progress'),
      timerTimeDisplay: document.getElementById('timer-time-display'),
      timerModeBadge: document.getElementById('timer-mode-badge'),

      btnTimerStart: document.getElementById('btn-timer-start'),
      btnTimerComplete: document.getElementById('btn-timer-complete'),
      timerStartIcon: document.getElementById('timer-start-icon'),
      timerStartText: document.getElementById('timer-start-text'),
      btnTimerReset: document.getElementById('btn-timer-reset'),
      btnTimerSkip: document.getElementById('btn-timer-skip'),

      cycleFractionText: document.getElementById('cycle-fraction-text'),
      roundsIndicators: document.getElementById('rounds-indicators'),

      statTodaySessions: document.getElementById('stat-today-sessions'),
      statTodayMinutes: document.getElementById('stat-today-minutes'),
      statCyclePosition: document.getElementById('stat-cycle-position'),
      statWeekSessions: document.getElementById('stat-week-sessions'),

      sessionsHistoryList: document.getElementById('sessions-history-list'),
      btnClearHistory: document.getElementById('btn-clear-history'),

      modalTimerSettings: document.getElementById('modal-timer-settings'),
      formTimerSettings: document.getElementById('form-timer-settings'),
      settingFocusDur: document.getElementById('setting-focus-dur'),
      settingShortDur: document.getElementById('setting-short-dur'),
      settingLongDur: document.getElementById('setting-long-dur'),
      settingCycles: document.getElementById('setting-cycles'),
      settingSound: document.getElementById('setting-sound'),
      settingNotifications: document.getElementById('setting-notifications'),
      settingAutostart: document.getElementById('setting-autostart'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnCancelSettings: document.getElementById('btn-cancel-settings'),

      modalSessionCompleted: document.getElementById('modal-session-completed'),
      completedModalTitle: document.getElementById('completed-modal-title'),
      completedModalMsg: document.getElementById('completed-modal-msg'),
      btnModalStartNext: document.getElementById('btn-modal-start-next'),
      btnModalStartNextText: document.getElementById('btn-modal-start-next-text'),
      btnModalSkipNext: document.getElementById('btn-modal-skip-next'),

      modalShortcuts: document.getElementById('modal-shortcuts'),
      btnCloseShortcuts: document.getElementById('btn-close-shortcuts')
    };
  }

  function loadSettings() {
    const stored = Storage.get('timer_settings');
    settings = Object.assign({}, TimerData.getDefaultSettings(), stored || {});
    updateModeLabels();
  }

  function saveSettings() {
    Storage.set('timer_settings', settings);
    updateModeLabels();
  }

  function updateModeLabels() {
    if (dom.modeWorkMin) dom.modeWorkMin.textContent = settings.focusDuration;
    if (dom.modeShortMin) dom.modeShortMin.textContent = settings.shortBreakDuration;
    if (dom.modeLongMin) dom.modeLongMin.textContent = settings.longBreakDuration;
  }

  function loadSessions() {
    const stored = Storage.get('timer_sessions');
    if (Array.isArray(stored)) {

      sessions = stored.filter(s => s && s.id !== 'ts_1' && s.id !== 'ts_2' && s.id !== 'ts_3' && (s.mode !== 'work' || !s.durationSeconds || s.durationSeconds >= 60));
    } else {
      sessions = [];
    }
    Storage.set('timer_sessions', sessions);
  }

  function saveSessions() {
    Storage.set('timer_sessions', sessions);
    renderTodayStats();
    renderSessionsHistory();
  }

  function loadActiveState() {
    const stored = Storage.get('timer_active_state');
    const defaultDuration = (settings.focusDuration || 25) * 60;

    activeState = Object.assign({
      mode: 'work',
      durationSeconds: defaultDuration,
      startTimestamp: null,
      endTimestamp: null,
      remainingSeconds: defaultDuration,
      isRunning: false,
      isPaused: false,
      cyclePosition: 1,
      currentTask: ''
    }, stored || {});

    if (activeState.isRunning && activeState.endTimestamp) {
      const remaining = TimerData.calculateRemaining(activeState.endTimestamp);
      if (remaining > 0) {
        activeState.remainingSeconds = remaining;
        startTicking();
      } else {

        activeState.remainingSeconds = 0;
        activeState.isRunning = false;
        activeState.isPaused = false;
        setTimeout(() => handleTimerCompletion(), 300);
      }
    } else if (activeState.isPaused) {

      activeState.isRunning = false;
    } else {

      activeState.isRunning = false;
      activeState.isPaused = false;
      activeState.endTimestamp = null;
    }

    if (activeState.currentTask && dom.taskInput) {
      dom.taskInput.value = activeState.currentTask;
    }

    if (typeof window.GlobalTimer !== 'undefined') {
      window.GlobalTimer.subscribe((updatedState) => {
        activeState = Object.assign({}, activeState, updatedState);
        loadSessions();
        renderAll();
      });
    }
  }

  function saveActiveState() {
    Storage.set('timer_active_state', activeState);
    if (typeof window.GlobalTimer !== 'undefined') {
      window.GlobalTimer.render();
    }
  }

  function renderAll() {
    renderModeButtons();
    renderTimerDisplay();
    renderControls();
    renderCycleSteps();
    renderTodayStats();
    renderSessionsHistory();
    renderTaskDisplay();
  }

  function renderModeButtons() {
    if (!dom.modeBtns) return;
    dom.modeBtns.forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      btn.classList.toggle('active', mode === activeState.mode);
    });
  }

  function renderTimerDisplay() {
    const timeStr = TimerData.formatTime(activeState.remainingSeconds);
    if (dom.timerTimeDisplay) dom.timerTimeDisplay.textContent = timeStr;
    document.title = `${timeStr} - DevPilot Focus Timer`;

    if (dom.timerModeBadge) {
      let label = 'Deep Work Focus';
      if (activeState.mode === 'shortBreak') label = 'Short Break Rest';
      if (activeState.mode === 'longBreak') label = 'Long Break Recovery';
      dom.timerModeBadge.textContent = label;
    }

    if (dom.timerCircleProgress) {
      const fraction = TimerData.calculateProgressFraction(
        activeState.remainingSeconds,
        activeState.durationSeconds
      );
      const strokeData = TimerData.calculateStrokeDashoffset(fraction, 120);

      dom.timerCircleProgress.style.strokeDasharray = `${strokeData.circumference} ${strokeData.circumference}`;
      dom.timerCircleProgress.style.strokeDashoffset = strokeData.offset;

      let color = '#4f46e5';
      if (activeState.mode === 'shortBreak') color = '#10b981';
      if (activeState.mode === 'longBreak') color = '#f59e0b';
      dom.timerCircleProgress.style.stroke = color;
    }
  }

  function renderControls() {
    if (dom.btnTimerStart) {
      if (activeState.isRunning) {
        if (dom.timerStartText) dom.timerStartText.textContent = 'Pause';
        if (dom.timerStartIcon) dom.timerStartIcon.textContent = 'pause';
        dom.btnTimerStart.classList.remove('btn-primary');
        dom.btnTimerStart.classList.add('btn-secondary');
        if (dom.timerCircleContainer) dom.timerCircleContainer.classList.add('is-running');
      } else if (activeState.isPaused) {
        if (dom.timerStartText) dom.timerStartText.textContent = 'Resume';
        if (dom.timerStartIcon) dom.timerStartIcon.textContent = 'play_arrow';
        dom.btnTimerStart.classList.add('btn-primary');
        dom.btnTimerStart.classList.remove('btn-secondary');
        if (dom.timerCircleContainer) dom.timerCircleContainer.classList.remove('is-running');
      } else {
        let label = 'Start Focus';
        if (activeState.mode !== 'work') label = 'Start Break';
        if (dom.timerStartText) dom.timerStartText.textContent = label;
        if (dom.timerStartIcon) dom.timerStartIcon.textContent = 'play_arrow';
        dom.btnTimerStart.classList.add('btn-primary');
        dom.btnTimerStart.classList.remove('btn-secondary');
        if (dom.timerCircleContainer) dom.timerCircleContainer.classList.remove('is-running');
      }
    }
  }

  function renderCycleSteps() {
    const maxCycles = settings.sessionsBeforeLongBreak || 4;
    const current = Math.min(maxCycles, Math.max(1, activeState.cyclePosition || 1));

    if (dom.cycleFractionText) {
      dom.cycleFractionText.textContent = `Session ${current} of ${maxCycles}`;
    }

    if (dom.roundsIndicators) {
      let html = '';
      for (let i = 1; i <= maxCycles; i++) {
        let statusClass = '';
        let icon = 'radio_button_unchecked';

        if (i < current) {
          statusClass = 'completed';
          icon = 'check_circle';
        } else if (i === current) {
          statusClass = 'current';
          icon = 'radio_button_checked';
        }

        html += `
          <button type="button" class="cycle-step-pill ${statusClass}" data-cycle-step="${i}" title="Pomodoro Focus Session ${i} of ${maxCycles}">
            <span class="material-symbols-outlined text-[14px]">${icon}</span>
            <span>Focus ${i}</span>
          </button>
        `;
      }

      const isLongBreak = activeState.mode === 'longBreak';
      html += `
        <button type="button" class="cycle-step-pill ${isLongBreak ? 'current' : ''}" data-cycle-mode="longBreak" title="Long Break Recovery">
          <span class="material-symbols-outlined text-[14px]">local_cafe</span>
          <span>Long Break</span>
        </button>
      `;

      dom.roundsIndicators.innerHTML = html;
    }
  }

  function renderTodayStats() {
    const stats = TimerData.calculateTodayStats(sessions);

    if (dom.completedRoundsCount) dom.completedRoundsCount.textContent = stats.todayFocusCount;
    if (dom.statTodaySessions) dom.statTodaySessions.textContent = stats.todayFocusCount;
    if (dom.statTodayMinutes) dom.statTodayMinutes.textContent = stats.todayFocusMinutes;
    if (dom.statCyclePosition) {
      dom.statCyclePosition.textContent = `${activeState.cyclePosition || 1} / ${settings.sessionsBeforeLongBreak || 4}`;
    }
    if (dom.statWeekSessions) dom.statWeekSessions.textContent = stats.weekFocusCount;
  }

  function renderSessionsHistory() {
    if (!dom.sessionsHistoryList) return;

    const stats = TimerData.calculateTodayStats(sessions);

    const todaySessions = stats.todaySessionsList.filter(s => s && s.mode === 'work');

    if (todaySessions.length === 0) {
      dom.sessionsHistoryList.innerHTML = `
        <div class="text-center py-7 text-slate-400 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
          <span class="material-symbols-outlined text-3xl mb-1 text-slate-400">hourglass_empty</span>
          <p class="text-xs font-semibold text-slate-600">No focus intervals completed yet today.</p>
          <p class="text-[11px] text-slate-400 mt-1">Type your focus task above and hit "Start Focus" to log real sessions!</p>
        </div>
      `;
      return;
    }

    dom.sessionsHistoryList.innerHTML = todaySessions.map(session => {
      const timeStr = TimerData.formatTimestamp(session.completedAt);
      const secs = session.durationSeconds || 1500;
      let durationBadge = '';
      let durSubtitle = '';

      if (secs < 60) {
        durationBadge = `+${secs}s Focus`;
        durSubtitle = `${secs} sec`;
      } else {
        const mins = Math.round(secs / 60);
        durationBadge = `+${mins}m Focus`;
        durSubtitle = `${mins} min`;
      }

      return `
        <div class="session-history-item group" data-id="${session.id}">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <span class="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
            <div class="truncate">
              <p class="text-xs font-bold text-slate-800 truncate">${escapeHtml(session.task || 'Deep Work Focus')}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">${durSubtitle} • ${timeStr}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              ${durationBadge}
            </span>
            <button type="button" class="btn-delete-single-session text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors" data-id="${session.id}" title="Delete this session">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTaskDisplay() {
    const taskName = activeState.currentTask || (activeState.mode === 'work' ? 'Deep Work Focus' : (activeState.mode === 'shortBreak' ? 'Short Break' : 'Long Break'));

    if (dom.activeTaskDisplay && dom.activeTaskText) {
      if (activeState.currentTask) {
        dom.activeTaskText.textContent = activeState.currentTask;
        dom.activeTaskDisplay.classList.remove('hidden');
      } else {
        dom.activeTaskDisplay.classList.add('hidden');
      }
    }

    if (dom.focusModeTaskText) {
      dom.focusModeTaskText.textContent = taskName;
    }
  }

  function startTimer() {
    if (activeState.isRunning) return;

    if (dom.taskInput && dom.taskInput.value.trim()) {
      activeState.currentTask = dom.taskInput.value.trim();
    }

    if (typeof window.GlobalTimer !== 'undefined') {
      activeState = window.GlobalTimer.start(activeState.currentTask);
    } else {
      activeState.isRunning = true;
      activeState.isPaused = false;
      activeState.isFloatingHidden = false;
      activeState.startTimestamp = Date.now();
      activeState.endTimestamp = Date.now() + (activeState.remainingSeconds * 1000);
      saveActiveState();
      startTicking();
    }

    renderControls();
    renderTaskDisplay();
    renderTimerDisplay();

    let label = 'Deep Work Focus';
    if (activeState.mode === 'shortBreak') label = 'Short Break';
    if (activeState.mode === 'longBreak') label = 'Long Break';
    showToast(`${label} started!`, 'info');
  }

  function pauseTimer() {
    if (!activeState.isRunning) return;

    if (typeof window.GlobalTimer !== 'undefined') {
      activeState = window.GlobalTimer.pause();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      activeState.isRunning = false;
      activeState.isPaused = true;
      activeState.remainingSeconds = TimerData.calculateRemaining(activeState.endTimestamp);
      activeState.endTimestamp = null;
      saveActiveState();
    }

    renderControls();
    renderTimerDisplay();
    renderTaskDisplay();

    showToast('Timer paused', 'info');
  }

  function resetTimer() {
    if (typeof window.GlobalTimer !== 'undefined') {
      activeState = window.GlobalTimer.reset();
    } else {
      if (activeState.isRunning) pauseTimer();
      activeState.isRunning = false;
      activeState.isPaused = false;
      activeState.endTimestamp = null;
      activeState.remainingSeconds = activeState.durationSeconds;
      saveActiveState();
    }

    renderAll();
    showToast('Timer reset', 'info');
  }

  function skipTimer() {
    if (activeState.isRunning) pauseTimer();

    const maxCycles = settings.sessionsBeforeLongBreak || 4;
    const current = activeState.cyclePosition || 1;
    activeState.cyclePosition = current < maxCycles ? current + 1 : 1;
    activeState.mode = 'work';
    activeState.durationSeconds = (settings.focusDuration || 25) * 60;
    activeState.remainingSeconds = activeState.durationSeconds;
    activeState.isRunning = false;
    activeState.isPaused = false;
    activeState.endTimestamp = null;

    saveActiveState();
    renderAll();
    showToast(`Skipped to Focus ${activeState.cyclePosition} of ${maxCycles}`, 'info');
  }

  function setTimerMode(newMode, notify = true) {
    if (activeState.isRunning && notify) {
      if (!confirm('A session is actively running. Switch mode and reset?')) return;
    }

    if (typeof window.GlobalTimer !== 'undefined') {
      activeState = window.GlobalTimer.setMode(newMode);
    } else {
      let minutes = settings.focusDuration;
      if (newMode === 'shortBreak') minutes = settings.shortBreakDuration;
      if (newMode === 'longBreak') minutes = settings.longBreakDuration;

      activeState.mode = newMode;
      activeState.durationSeconds = minutes * 60;
      activeState.remainingSeconds = activeState.durationSeconds;
      activeState.isRunning = false;
      activeState.isPaused = false;
      activeState.endTimestamp = null;
      saveActiveState();
    }

    renderAll();
  }

  function startTicking() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      const remaining = TimerData.calculateRemaining(activeState.endTimestamp);
      activeState.remainingSeconds = remaining;
      renderTimerDisplay();

      if (remaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        activeState.remainingSeconds = 0;
        activeState.isRunning = false;
        activeState.isPaused = false;
        activeState.endTimestamp = null;
        saveActiveState();
        handleTimerCompletion();
      }
    }, 250);
  }

  function setupVisibilityListeners() {

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && activeState.isRunning && activeState.endTimestamp) {
        const remaining = TimerData.calculateRemaining(activeState.endTimestamp);
        activeState.remainingSeconds = remaining;
        renderTimerDisplay();
        if (remaining <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          activeState.remainingSeconds = 0;
          activeState.isRunning = false;
          activeState.isPaused = false;
          activeState.endTimestamp = null;
          saveActiveState();
          handleTimerCompletion();
        }
      }
    });

    window.addEventListener('focus', () => {
      if (activeState.isRunning && activeState.endTimestamp) {
        const remaining = TimerData.calculateRemaining(activeState.endTimestamp);
        activeState.remainingSeconds = remaining;
        renderTimerDisplay();
      }
    });
  }

  function handleTimerCompletion(customTaskName = null) {
    playChime();

    const wasWorkSession = activeState.mode === 'work';
    const taskName = customTaskName ||
                     (dom.taskInput && dom.taskInput.value.trim()) ||
                     activeState.currentTask ||
                     'Deep Work Focus';

    if (wasWorkSession) {
      const completedSession = {
        id: `ts_${Date.now()}`,
        task: taskName,
        mode: 'work',
        durationSeconds: activeState.durationSeconds,
        completedAt: new Date().toISOString()
      };

      sessions.unshift(completedSession);
      saveSessions();
    }

    const transition = TimerData.getNextSessionTransition(
      activeState.mode,
      activeState.cyclePosition,
      settings.sessionsBeforeLongBreak
    );

    activeState.cyclePosition = transition.nextCycle;
    nextPendingTransition = transition;

    triggerBrowserNotification(
      wasWorkSession ? 'Focus Session Complete! 🎉' : 'Break Finished! ☕',
      transition.message
    );

    renderAll();

    if (settings.autoStart) {
      showToast(transition.message, 'success');
      setTimeout(() => {
        setTimerMode(transition.nextMode, false);
        startTimer();
      }, 1500);
    } else {
      showCompletionModal(transition, wasWorkSession);
    }
  }

  function completeSessionManually() {

    if (activeState.mode !== 'work') {
      showToast('Break finished! Switched to Deep Work focus mode.', 'info');
      setTimerMode('work', false);
      resetTimer();
      return;
    }

    const targetMinutes = settings.focusDuration || 25;
    const targetSeconds = targetMinutes * 60;

    let currentRemaining = activeState.remainingSeconds;
    if (activeState.isRunning && activeState.endTimestamp) {
      currentRemaining = TimerData.calculateRemaining(activeState.endTimestamp);
    }

    if (currentRemaining > 0) {
      if (!activeState.isRunning && currentRemaining >= targetSeconds) {
        showToast(`Focus session has not started yet. Complete the full ${targetMinutes}-minute session before completing!`, 'warning');
      } else {
        const remainingStr = TimerData.formatTime(currentRemaining);
        showToast(`Focus session is not complete yet (${remainingStr} remaining)! Complete the full ${targetMinutes} minutes to mark it complete.`, 'warning');
      }
      return;
    }

    const typedTask = (dom.taskInput && dom.taskInput.value.trim()) ||
                      activeState.currentTask ||
                      'Deep Work Focus';

    activeState.currentTask = typedTask;

    if (activeState.isRunning) {
      clearInterval(timerInterval);
      timerInterval = null;
      activeState.isRunning = false;
      activeState.isPaused = false;
      activeState.endTimestamp = null;
    }

    activeState.remainingSeconds = 0;
    saveActiveState();

    handleTimerCompletion(typedTask);
  }

  function showCompletionModal(transition, wasWork) {
    if (dom.completedModalTitle) {
      dom.completedModalTitle.textContent = wasWork
        ? '🎉 Focus Session Complete!'
        : '☕ Break Complete!';
    }
    if (dom.completedModalMsg) {
      dom.completedModalMsg.textContent = transition.message;
    }
    if (dom.btnModalStartNextText) {
      dom.btnModalStartNextText.textContent = `Start ${transition.label}`;
    }

    if (dom.modalSessionCompleted) {
      dom.modalSessionCompleted.classList.add('active');
    }
  }

  function closeCompletionModal() {
    if (dom.modalSessionCompleted) {
      dom.modalSessionCompleted.classList.remove('active');
    }
  }

  function playChime() {
    if (!settings.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const notes = [523.25, 659.25, 783.99];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.9);
      });
    } catch (e) {
      console.warn('AudioContext chime error:', e);
    }
  }

  function triggerBrowserNotification(title, body) {
    if (!settings.notificationsEnabled) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '../favicon.ico'
        });
      } catch (e) {}
    }
  }

  function toggleFocusMode() {
    const isActive = document.body.classList.toggle('focus-mode-active');
    renderTaskDisplay();
    if (isActive) {
      showToast('Focus Mode activated (Press Esc to exit)', 'info');
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Fullscreen request rejected or unavailable:', err);
          });
        }
      } catch (e) {}
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
    if (typeof window.GlobalTimer !== 'undefined') {
      window.GlobalTimer.render();
    }
  }

  function exitFocusMode() {
    if (!document.body.classList.contains('focus-mode-active')) return;
    document.body.classList.remove('focus-mode-active');
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
    if (typeof window.GlobalTimer !== 'undefined') {
      window.GlobalTimer.render();
    }
    showToast('Exited Focus Mode', 'info');
  }

  function handleKeyboardShortcuts(e) {

    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (activeState.isRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      resetTimer();
    } else if (e.code === 'KeyS') {
      e.preventDefault();
      skipTimer();
    } else if (e.code === 'Digit1') {
      e.preventDefault();
      setTimerMode('work');
    } else if (e.code === 'Digit2') {
      e.preventDefault();
      setTimerMode('shortBreak');
    } else if (e.code === 'Digit3') {
      e.preventDefault();
      setTimerMode('longBreak');
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      toggleFocusMode();
    } else if (e.code === 'Escape') {
      if (document.body.classList.contains('focus-mode-active')) {
        exitFocusMode();
      }
      closeSettingsModal();
      closeCompletionModal();
      closeShortcutsModal();
    }
  }

  function bindEvents() {

    if (dom.modeBtns) {
      dom.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          if (mode) setTimerMode(mode);
        });
      });
    }

    if (dom.btnTimerStart) {
      dom.btnTimerStart.addEventListener('click', () => {
        if (activeState.isRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
      });
    }

    if (dom.btnTimerReset) dom.btnTimerReset.addEventListener('click', resetTimer);
    if (dom.btnTimerSkip) dom.btnTimerSkip.addEventListener('click', skipTimer);

    if (dom.btnFocusMode) dom.btnFocusMode.addEventListener('click', toggleFocusMode);
    if (dom.btnExitFocusMode) dom.btnExitFocusMode.addEventListener('click', exitFocusMode);
    if (dom.btnExitFocusTop) dom.btnExitFocusTop.addEventListener('click', exitFocusMode);
    if (dom.btnExitFocusCenter) dom.btnExitFocusCenter.addEventListener('click', exitFocusMode);

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && document.body.classList.contains('focus-mode-active')) {
        document.body.classList.remove('focus-mode-active');
        if (typeof window.GlobalTimer !== 'undefined') {
          window.GlobalTimer.render();
        }
      }
    });

    if (dom.btnTimerComplete) {
      dom.btnTimerComplete.addEventListener('click', completeSessionManually);
    }

    if (dom.roundsIndicators) {
      dom.roundsIndicators.addEventListener('click', (e) => {
        const pill = e.target.closest('.cycle-step-pill');
        if (!pill) return;
        const step = pill.getAttribute('data-cycle-step');
        if (step) {
          const stepNum = parseInt(step, 10);
          activeState.cyclePosition = stepNum;
          setTimerMode('work', false);
          resetTimer();
          showToast(`Switched to Focus ${stepNum} of ${settings.sessionsBeforeLongBreak || 4}`, 'info');
        } else if (pill.getAttribute('data-cycle-mode') === 'longBreak') {
          setTimerMode('longBreak', false);
        }
      });
    }

    if (dom.taskInput) {
      dom.taskInput.addEventListener('input', (e) => {
        const val = e.target.value;
        activeState.currentTask = val.trim();
        saveActiveState();
      });
    }

    if (dom.taskSuggestionsRow) {
      dom.taskSuggestionsRow.querySelectorAll('.task-suggestion-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const task = btn.getAttribute('data-task');
          if (task) {
            if (dom.taskInput) dom.taskInput.value = task;
            activeState.currentTask = task;
            saveActiveState();
            showToast(`Task set: "${task}"`, 'info');
          }
        });
      });
    }

    if (dom.btnClearHistory) {
      dom.btnClearHistory.addEventListener('click', () => {
        if (confirm('Clear today\'s completed focus sessions history?')) {
          const todayStr = TimerData.formatDate(new Date());
          sessions = sessions.filter(s => TimerData.formatDate(s.completedAt) !== todayStr);
          saveSessions();
          renderTodayStats();
          renderSessionsHistory();
          showToast('Today\'s session history cleared', 'info');
        }
      });
    }

    if (dom.sessionsHistoryList) {
      dom.sessionsHistoryList.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-single-session');
        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          if (id) {
            sessions = sessions.filter(s => s.id !== id);
            saveSessions();
            showToast('Session removed', 'info');
          }
        }
      });
    }

    if (dom.btnTimerSettings) dom.btnTimerSettings.addEventListener('click', openSettingsModal);
    if (dom.btnCloseSettings) dom.btnCloseSettings.addEventListener('click', closeSettingsModal);
    if (dom.btnCancelSettings) dom.btnCancelSettings.addEventListener('click', closeSettingsModal);

    if (dom.formTimerSettings) {
      dom.formTimerSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTimerSettingsFromForm();
      });
    }

    if (dom.btnModalStartNext) {
      dom.btnModalStartNext.addEventListener('click', () => {
        closeCompletionModal();
        if (nextPendingTransition) {
          setTimerMode(nextPendingTransition.nextMode, false);
          startTimer();
          nextPendingTransition = null;
        }
      });
    }

    if (dom.btnModalSkipNext) {
      dom.btnModalSkipNext.addEventListener('click', () => {
        closeCompletionModal();
        if (nextPendingTransition) {
          setTimerMode(nextPendingTransition.nextMode, false);
          nextPendingTransition = null;
        }
      });
    }

    if (dom.btnShortcuts) dom.btnShortcuts.addEventListener('click', openShortcutsModal);
    if (dom.btnCloseShortcuts) dom.btnCloseShortcuts.addEventListener('click', closeShortcutsModal);

    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  function openSettingsModal() {
    if (dom.settingFocusDur) dom.settingFocusDur.value = settings.focusDuration;
    if (dom.settingShortDur) dom.settingShortDur.value = settings.shortBreakDuration;
    if (dom.settingLongDur) dom.settingLongDur.value = settings.longBreakDuration;
    if (dom.settingCycles) dom.settingCycles.value = settings.sessionsBeforeLongBreak;
    if (dom.settingSound) dom.settingSound.checked = settings.soundEnabled;
    if (dom.settingNotifications) dom.settingNotifications.checked = settings.notificationsEnabled;
    if (dom.settingAutostart) dom.settingAutostart.checked = settings.autoStart;

    if (dom.modalTimerSettings) dom.modalTimerSettings.classList.add('active');
  }

  function closeSettingsModal() {
    if (dom.modalTimerSettings) dom.modalTimerSettings.classList.remove('active');
  }

  function saveTimerSettingsFromForm() {
    const focusDur = TimerData.validateDuration(dom.settingFocusDur.value, 1, 90, 25);
    const shortDur = TimerData.validateDuration(dom.settingShortDur.value, 1, 30, 5);
    const longDur = TimerData.validateDuration(dom.settingLongDur.value, 1, 60, 15);
    const cycles = parseInt(dom.settingCycles.value, 10) || 4;

    const sound = dom.settingSound ? dom.settingSound.checked : true;
    const autoStart = dom.settingAutostart ? dom.settingAutostart.checked : false;
    let notifications = dom.settingNotifications ? dom.settingNotifications.checked : false;

    if (notifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        if (perm !== 'granted') {
          showToast('Notification permission not granted', 'warning');
        }
      });
    }

    settings.focusDuration = focusDur;
    settings.shortBreakDuration = shortDur;
    settings.longBreakDuration = longDur;
    settings.sessionsBeforeLongBreak = cycles;
    settings.soundEnabled = sound;
    settings.notificationsEnabled = notifications;
    settings.autoStart = autoStart;

    saveSettings();
    closeSettingsModal();

    if (!activeState.isRunning) {
      let currentMinutes = settings.focusDuration;
      if (activeState.mode === 'shortBreak') currentMinutes = settings.shortBreakDuration;
      if (activeState.mode === 'longBreak') currentMinutes = settings.longBreakDuration;

      activeState.durationSeconds = currentMinutes * 60;
      activeState.remainingSeconds = activeState.durationSeconds;
      saveActiveState();
      renderAll();
    }

    showToast('Timer preferences saved', 'success');
  }

  function openShortcutsModal() {
    if (dom.modalShortcuts) dom.modalShortcuts.classList.add('active');
  }

  function closeShortcutsModal() {
    if (dom.modalShortcuts) dom.modalShortcuts.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();
