/**
 * MAD DEV - Authentication & User Identity Service
 * 
 * Provides centralized, user-scoped authentication management.
 * Guarantees that every data operation in the application belongs to an
 * authenticated user ID. Supports both Supabase Auth and isolated local multi-user sessions.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AuthService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Default fallback user profile
  const DEFAULT_USER = {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'guest@maddev.io',
    fullName: 'Guest Developer',
    avatar: 'G'
  };

  const SECONDARY_USER = {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'alex.developer@example.com',
    fullName: 'Alex Chen',
    avatar: 'A'
  };

  let currentUser = null;
  let authListeners = [];
  let isInitialized = false;

  const SESSION_KEY = 'devpilot_auth_session';
  const USERS_LIST_KEY = 'devpilot_known_users';

  function getStorageItem(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStorageItem(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  /**
   * Initializes the known accounts list.
   */
  function initKnownUsers() {
    let users = getStorageItem(USERS_LIST_KEY, null);
    if (!users || !Array.isArray(users) || users.length === 0) {
      users = [DEFAULT_USER, SECONDARY_USER];
      setStorageItem(USERS_LIST_KEY, users);
    }
    return users;
  }

  /**
   * Generates a standard v4-like UUID.
   */
  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Resolves the active user session.
   */
  async function init() {
    initKnownUsers();

    // 1. Check if Supabase client is configured
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.auth === 'object') {
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session && session.user) {
          currentUser = {
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            avatar: (session.user.email[0] || 'U').toUpperCase()
          };
          setStorageItem(SESSION_KEY, currentUser);
          isInitialized = true;
          notifyListeners('SIGNED_IN', currentUser);
          return currentUser;
        }
      } catch (err) {
        console.warn('Supabase auth session check failed, using local session', err);
      }
    }

    // 2. Check saved local session
    const saved = getStorageItem(SESSION_KEY);
    if (saved && saved.id && saved.email) {
      currentUser = saved;
    } else {
      currentUser = DEFAULT_USER;
      setStorageItem(SESSION_KEY, currentUser);
    }

    isInitialized = true;
    notifyListeners('INITIALIZED', currentUser);
    return currentUser;
  }

  /**
   * Returns current authenticated user synchronously.
   */
  function getCurrentUser() {
    if (!currentUser) {
      const saved = getStorageItem(SESSION_KEY);
      currentUser = saved && saved.id ? saved : DEFAULT_USER;
    }
    return currentUser;
  }

  /**
   * Returns whether authentication has finished resolving.
   */
  function isReady() {
    return isInitialized;
  }

  /**
   * Registers a listener for auth changes (sign in, switch user, sign out).
   */
  function onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      authListeners.push(callback);
    }
    return () => {
      authListeners = authListeners.filter(cb => cb !== callback);
    };
  }

  function notifyListeners(event, user) {
    authListeners.forEach(cb => {
      try {
        cb(event, user);
      } catch (err) {
        console.error('Error in auth listener callback:', err);
      }
    });

    // Also broadcast auth switch to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('devpilot_auth_sync');
        channel.postMessage({ event, user });
        channel.close();
      } catch (e) {}
    }
  }

  /**
   * Switches to an existing or new user account.
   */
  function switchAccount(userIdOrEmail) {
    const users = initKnownUsers();
    const found = users.find(u => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase());

    if (found) {
      currentUser = found;
      setStorageItem(SESSION_KEY, currentUser);
      notifyListeners('USER_SWITCHED', currentUser);
      return currentUser;
    }

    // If not found, create new user account
    return signUp(userIdOrEmail, 'password123', userIdOrEmail.split('@')[0]);
  }

  /**
   * Signs in user locally or with Supabase.
   */
  async function signIn(email, password, fullName = '') {
    email = email.trim().toLowerCase();

    // Supabase sign-in
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.auth === 'object') {
      try {
        const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data && data.user) {
          currentUser = {
            id: data.user.id,
            email: data.user.email,
            fullName: fullName || data.user.user_metadata?.full_name || email.split('@')[0],
            avatar: email.charAt(0).toUpperCase()
          };
          setStorageItem(SESSION_KEY, currentUser);
          notifyListeners('SIGNED_IN', currentUser);
          return { success: true, user: currentUser };
        }
      } catch (e) {}
    }

    // Local authentication
    const users = initKnownUsers();
    let found = users.find(u => u.email.toLowerCase() === email);

    if (!found) {
      return { success: false, error: 'Account not found. Please Sign Up first to create your account!' };
    }

    if (found.password && found.password !== password) {
      return { success: false, error: 'Invalid password. Please check your password and try again.' };
    }

    if (fullName && fullName.trim()) {
      found.fullName = fullName.trim();
      found.avatar = fullName.trim().charAt(0).toUpperCase();
      setStorageItem(USERS_LIST_KEY, users);
    }

    currentUser = found;
    setStorageItem(SESSION_KEY, currentUser);
    notifyListeners('SIGNED_IN', currentUser);
    return { success: true, user: currentUser };
  }

  /**
   * Connect LeetCode account for active user.
   */
  async function connectLeetCode(inputHandle = '') {
    const handle = (inputHandle || '').trim().replace(/^@/, '');
    if (!handle) return { success: false, error: 'Please enter a valid LeetCode handle' };

    saveUserSettings({ leetcodeHandle: handle });

    if (typeof window !== 'undefined' && window.DatabaseService) {
      window.DatabaseService.syncUserDataOnLogin(getCurrentUser());
    }

    notifyListeners('LEETCODE_CONNECTED', getCurrentUser());
    return { success: true, handle };
  }

  /**
   * Sign in with GitHub account (OAuth or GitHub username profile fetch)
   */
  async function signInWithGitHub(inputUsername = '') {
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.auth === 'object') {
      try {
        await window.supabase.auth.signInWithOAuth({ provider: 'github' });
        return { success: true };
      } catch (e) {}
    }

    let ghUser = (inputUsername || '').trim().replace(/^@/, '');
    if (!ghUser) ghUser = localStorage.getItem('maddev_github_user') || 'torvalds';

    let fullName = ghUser;
    let email = `${ghUser.toLowerCase()}@github.com`;

    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(ghUser)}`);
      if (res.ok) {
        const info = await res.json();
        fullName = info.name || info.login || ghUser;
        email = info.email || `${info.login.toLowerCase()}@github.com`;
      }
    } catch (e) {}

    const authRes = await signUp(email, 'github_oauth_pass', fullName, ghUser);
    saveUserSettings({ githubUsername: ghUser, fullName, email });
    return authRes;
  }

  /**
   * Registers a new user account with genuine isolation.
   */
  async function signUp(email, password, fullName = '', githubUser = '', leetcodeHandle = '') {
    email = email.trim().toLowerCase();
    const displayName = fullName.trim() || email.split('@')[0];

    // Supabase sign-up
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.auth === 'object') {
      try {
        const { data, error } = await window.supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName } }
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data && data.user) {
          currentUser = {
            id: data.user.id,
            email: data.user.email,
            fullName: displayName,
            avatar: displayName.charAt(0).toUpperCase()
          };
          setStorageItem(SESSION_KEY, currentUser);
          notifyListeners('SIGNED_IN', currentUser);
          return { success: true, user: currentUser };
        }
      } catch (e) {}
    }

    // Local registration
    const users = initKnownUsers();
    let existing = users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      currentUser = existing;
      setStorageItem(SESSION_KEY, currentUser);
      notifyListeners('SIGNED_IN', currentUser);
      return { success: true, user: currentUser, isExisting: true };
    }

    const newUser = {
      id: generateUuid(),
      email,
      password: password || 'password123',
      fullName: displayName,
      avatar: displayName.charAt(0).toUpperCase(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    setStorageItem(USERS_LIST_KEY, users);
    currentUser = newUser;
    setStorageItem(SESSION_KEY, currentUser);

    saveUserSettings({
      fullName: displayName,
      email: email,
      githubUsername: githubUser || displayName,
      leetcodeHandle: leetcodeHandle || displayName
    });

    notifyListeners('SIGNED_IN', currentUser);
    return { success: true, user: currentUser };
  }

  /**
   * Signs out current user and switches to a guest / new session.
   */
  async function signOut() {
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.auth === 'object') {
      try {
        await window.supabase.auth.signOut();
      } catch (e) {}
    }

    // Clear session
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;

    notifyListeners('SIGNED_OUT', null);

    // Auto re-init to default or guest
    return init();
  }

  /**
   * Returns list of all known accounts on this device.
   */
  function listKnownUsers() {
    return initKnownUsers();
  }

  /**
   * Get user-scoped settings (GitHub, LeetCode, Private AI API, UI settings).
   */
  function getUserSettings() {
    const user = getCurrentUser();
    const userSettingsKey = `maddev_settings_${user.id}`;
    const defaults = {
      fullName: user.fullName || 'MAD DEV User',
      email: user.email || 'developer@maddev.io',
      githubUsername: localStorage.getItem('maddev_github_user') || 'torvalds',
      githubToken: localStorage.getItem('maddev_github_token') || '',
      leetcodeHandle: localStorage.getItem('maddev_leetcode_user') || 'tourist',
      privateAiEndpoint: localStorage.getItem('maddev_private_ai_endpoint') || 'https://api.openai.com/v1',
      privateAiKey: localStorage.getItem('maddev_private_ai_key') || '',
      privateAiModel: localStorage.getItem('maddev_private_ai_model') || 'gpt-4o',
      compactMode: localStorage.getItem('maddev_compact_mode') === 'true',
      focusAlerts: localStorage.getItem('maddev_focus_alerts') !== 'false'
    };
    return getStorageItem(userSettingsKey, defaults);
  }

  /**
   * Save user-scoped settings.
   */
  function saveUserSettings(settings) {
    const user = getCurrentUser();
    const userSettingsKey = `maddev_settings_${user.id}`;
    const updated = { ...getUserSettings(), ...settings };
    setStorageItem(userSettingsKey, updated);

    // Sync global shortcuts for backward compatibility
    if (updated.githubUsername) localStorage.setItem('maddev_github_user', updated.githubUsername);
    if (updated.githubToken) localStorage.setItem('maddev_github_token', updated.githubToken);
    if (updated.leetcodeHandle) localStorage.setItem('maddev_leetcode_user', updated.leetcodeHandle);
    if (updated.privateAiEndpoint) localStorage.setItem('maddev_private_ai_endpoint', updated.privateAiEndpoint);
    if (updated.privateAiKey) localStorage.setItem('maddev_private_ai_key', updated.privateAiKey);
    if (updated.privateAiModel) localStorage.setItem('maddev_private_ai_model', updated.privateAiModel);
    if (typeof updated.compactMode === 'boolean') localStorage.setItem('maddev_compact_mode', updated.compactMode);

    // Update currentUser name if changed
    if (updated.fullName && updated.fullName !== user.fullName) {
      user.fullName = updated.fullName;
      user.avatar = updated.fullName.charAt(0).toUpperCase();
      setStorageItem(SESSION_KEY, user);
      notifyListeners('PROFILE_UPDATED', user);
    }
    return updated;
  }

  /**
   * Update user profile.
   */
  function updateUserProfile(updates) {
    return saveUserSettings(updates);
  }

  // Cross-tab sync for auth changes
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    try {
      const authChannel = new BroadcastChannel('maddev_auth_sync');
      authChannel.onmessage = (event) => {
        if (event.data && event.data.user) {
          currentUser = event.data.user;
          setStorageItem(SESSION_KEY, currentUser);
          authListeners.forEach(cb => {
            try { cb(event.data.event || 'USER_CHANGED', currentUser); } catch (e) {}
          });
        }
      };
    } catch (e) {}
  }

  return {
    init,
    isReady,
    getCurrentUser,
    getUserSettings,
    saveUserSettings,
    updateUserProfile,
    onAuthStateChange,
    switchAccount,
    signIn,
    signInWithGitHub,
    connectLeetCode,
    signUp,
    signOut,
    listKnownUsers,
    DEFAULT_USER,
    SECONDARY_USER
  };
});
