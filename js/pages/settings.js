/**
 * MAD DEV - Workspace Settings Module
 */

const defaultSettings = {
  profile: {
    fullName: 'Guest Developer',
    title: 'Senior Engineer',
    email: 'developer@maddev.io',
    githubUsername: 'torvalds',
    bio: 'Building next-gen developer tools and high-scale applications.'
  },
  apiKeys: {
    githubToken: '',
    openAiKey: '',
    geminiKey: '',
    claudeKey: ''
  },
  ui: {
    themeAccent: '#4F46E5',
    compactMode: false,
    autoSaveInterval: '30'
  },
  notifications: {
    focusTimerAlerts: true,
    dailyStreakReminders: true,
    soundEffects: true
  }
};

let settings = Storage.get('user_settings', defaultSettings);
const savedGithub = Storage.get('github_settings', null);
if (savedGithub && savedGithub.username) {
  if (!settings.profile) settings.profile = {};
  settings.profile.githubUsername = savedGithub.username;
}

document.addEventListener('DOMContentLoaded', () => {
  initSettingsTabs();
  populateSettingsForm();
  initPasswordToggles();
  initSettingsSave();
  initGithubLinkUpdater();
  initLeetCodeLinkUpdater();
});

function initGithubLinkUpdater() {
  const ghInput = document.getElementById('set-github-username');
  const ghLink = document.getElementById('link-github-profile');
  if (ghInput && ghLink) {
    const updateLink = () => {
      const user = ghInput.value.trim() || 'torvalds';
      ghLink.href = `https://github.com/${user}`;
    };
    ghInput.addEventListener('input', updateLink);
    updateLink();
  }
}

function initLeetCodeLinkUpdater() {
  const lcInput = document.getElementById('set-leetcode-handle');
  const lcLink = document.getElementById('link-leetcode-profile');
  if (lcInput && lcLink) {
    const updateLink = () => {
      const user = lcInput.value.trim() || 'tourist';
      lcLink.href = `https://leetcode.com/u/${user}`;
    };
    lcInput.addEventListener('input', updateLink);
    updateLink();
  }
}

function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab-btn');
  const sections = document.querySelectorAll('.settings-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });
}

function populateSettingsForm() {
  const authSettings = window.AuthService ? window.AuthService.getUserSettings() : {};

  // Profile
  setVal('set-fullname', authSettings.fullName || settings.profile.fullName);
  setVal('set-title', settings.profile.title);
  setVal('set-email', authSettings.email || settings.profile.email);
  setVal('set-github-username', authSettings.githubUsername || settings.profile.githubUsername || 'torvalds');
  setVal('set-leetcode-handle', authSettings.leetcodeHandle || 'tourist');
  setVal('set-bio', settings.profile.bio);

  // Private AI API Setup
  setVal('set-private-ai-endpoint', authSettings.privateAiEndpoint || 'https://api.openai.com/v1');
  setVal('set-private-ai-key', authSettings.privateAiKey || '');
  setVal('set-private-ai-model', authSettings.privateAiModel || 'gpt-4o');

  // API Keys
  setVal('set-github-token', settings.apiKeys.githubToken || authSettings.githubToken);
  setVal('set-openai-key', settings.apiKeys.openAiKey || authSettings.privateAiKey);
  setVal('set-gemini-key', settings.apiKeys.geminiKey);
  setVal('set-claude-key', settings.apiKeys.claudeKey);

  // UI
  const compactCheck = document.getElementById('set-compact-mode');
  if (compactCheck) compactCheck.checked = !!settings.ui.compactMode;

  setVal('set-autosave-interval', settings.ui.autoSaveInterval);

  // Notifications
  const focusAlertCheck = document.getElementById('set-focus-alerts');
  if (focusAlertCheck) focusAlertCheck.checked = !!settings.notifications.focusTimerAlerts;

  const streakAlertCheck = document.getElementById('set-streak-alerts');
  if (streakAlertCheck) streakAlertCheck.checked = !!settings.notifications.dailyStreakReminders;

  const soundCheck = document.getElementById('set-sound-effects');
  if (soundCheck) soundCheck.checked = !!settings.notifications.soundEffects;
}

function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.btn-toggle-key');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.textContent = 'visibility_off';
        } else {
          input.type = 'password';
          if (icon) icon.textContent = 'visibility';
        }
      }
    });
  });
}

function initSettingsSave() {
  const saveButtons = document.querySelectorAll('.btn-save-settings');
  saveButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Collect Profile
      settings.profile.fullName = getVal('set-fullname');
      settings.profile.title = getVal('set-title');
      settings.profile.email = getVal('set-email');
      const ghUsername = getVal('set-github-username') || 'torvalds';
      const lcHandle = getVal('set-leetcode-handle') || 'tourist';
      settings.profile.githubUsername = ghUsername;
      settings.profile.bio = getVal('set-bio');

      // Private AI Gateway
      const privateAiEndpoint = getVal('set-private-ai-endpoint') || 'https://api.openai.com/v1';
      const privateAiKey = getVal('set-private-ai-key');
      const privateAiModel = getVal('set-private-ai-model') || 'gpt-4o';

      // Sync github_settings for Dashboard and Analyzer
      Storage.set('github_settings', {
        username: ghUsername,
        updatedAt: new Date().toISOString()
      });

      // Sync leetcode_settings
      Storage.set('leetcode_settings', {
        handle: lcHandle,
        updatedAt: new Date().toISOString()
      });

      // Collect API Keys
      settings.apiKeys.githubToken = getVal('set-github-token');
      settings.apiKeys.openAiKey = getVal('set-openai-key') || privateAiKey;
      settings.apiKeys.geminiKey = getVal('set-gemini-key');
      settings.apiKeys.claudeKey = getVal('set-claude-key');

      // UI
      const compactCheck = document.getElementById('set-compact-mode');
      if (compactCheck) settings.ui.compactMode = compactCheck.checked;
      settings.ui.autoSaveInterval = getVal('set-autosave-interval') || '30';

      // Notifications
      const focusAlertCheck = document.getElementById('set-focus-alerts');
      if (focusAlertCheck) settings.notifications.focusTimerAlerts = focusAlertCheck.checked;

      const streakAlertCheck = document.getElementById('set-streak-alerts');
      if (streakAlertCheck) settings.notifications.dailyStreakReminders = streakAlertCheck.checked;

      const soundCheck = document.getElementById('set-sound-effects');
      if (soundCheck) settings.notifications.soundEffects = soundCheck.checked;

      Storage.set('user_settings', settings);

      if (window.AuthService) {
        window.AuthService.saveUserSettings({
          fullName: settings.profile.fullName,
          email: settings.profile.email,
          githubUsername: ghUsername,
          githubToken: settings.apiKeys.githubToken,
          leetcodeHandle: lcHandle,
          privateAiEndpoint,
          privateAiKey,
          privateAiModel,
          compactMode: settings.ui.compactMode
        });
      }

      showToast('MAD DEV Settings & Private AI API saved successfully!', 'success');
    });
  });
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

