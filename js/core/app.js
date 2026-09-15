/**
 * MAD DEV - Main Application Controller
 */

// Strictly enforce Light Mode across all sections
(function () {
  document.documentElement.classList.remove('dark');
  try {
    localStorage.removeItem('devpilot-theme');
  } catch (e) {}
})();

document.addEventListener('DOMContentLoaded', async () => {
  initSidebar();
  highlightActiveRoute();
  if (typeof window !== 'undefined' && window.AuthService) {
    await window.AuthService.init();
    initUserWidget();
  }
  if (typeof window !== 'undefined' && window.GlobalTimer) {
    window.GlobalTimer.init();
  }
});

// User Account Widget & Login Modal
function initUserWidget() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const auth = window.AuthService;
  if (!auth) return;

  let user = auth.getCurrentUser();

  // Create or update user card container in sidebar
  let userContainer = document.getElementById('sidebar-user-widget');
  if (!userContainer) {
    userContainer = document.createElement('div');
    userContainer.id = 'sidebar-user-widget';
    userContainer.className = 'mt-auto px-4 pt-3 pb-1 border-t border-slate-100 sidebar-text';
    
    // Find bottom section or append
    const bottomPromo = sidebar.querySelector('.mt-auto');
    if (bottomPromo) {
      bottomPromo.replaceWith(userContainer);
    } else {
      sidebar.appendChild(userContainer);
    }
  }

  function renderCard() {
    user = auth.getCurrentUser();
    const initial = (user.fullName || user.email || 'M').charAt(0).toUpperCase();
    userContainer.innerHTML = `
      <div class="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-3.5 text-white flex items-center justify-between shadow-sm group hover:shadow-md transition-all cursor-pointer" id="btn-open-auth-modal">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-indigo-400/40">
            ${initial}
          </div>
          <div class="overflow-hidden text-left">
            <p class="font-bold text-xs truncate leading-tight">${user.fullName || 'MAD DEV User'}</p>
            <p class="text-[10px] text-indigo-200 truncate leading-tight opacity-90">${user.email}</p>
          </div>
        </div>
        <span class="material-symbols-outlined text-slate-400 group-hover:text-white text-base transition-colors shrink-0">sync_alt</span>
      </div>
    `;

    const btnModal = userContainer.querySelector('#btn-open-auth-modal');
    if (btnModal) {
      btnModal.addEventListener('click', openAuthModal);
    }

    // Dynamic Top Header Bar Profile Button Binding
    const topHeaderBtn = document.getElementById('top-header-user-btn') || document.querySelector('header button:has(img)') || document.querySelector('.top-nav-user-profile');
    if (topHeaderBtn) {
      topHeaderBtn.id = 'top-header-user-btn';
      topHeaderBtn.onclick = openAuthModal;
      topHeaderBtn.className = 'flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-xl transition-all sm:ml-2 border border-slate-200/80 cursor-pointer shadow-sm';
      topHeaderBtn.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-indigo-400/30">
          ${initial}
        </div>
        <div class="text-left hidden lg:block overflow-hidden max-w-[150px]">
          <p class="font-bold text-xs text-slate-800 dark:text-slate-200 leading-none truncate">${user.fullName || 'MAD DEV User'}</p>
          <p class="text-[10px] text-indigo-600 font-semibold truncate mt-0.5">${user.email}</p>
        </div>
        <span class="material-symbols-outlined text-slate-400 text-sm hidden sm:block">expand_more</span>
      `;
    }
  }

  renderCard();
  auth.onAuthStateChange(() => renderCard());
}

// Interactive Authentication & Account Switcher Modal
function openAuthModal() {
  const auth = window.AuthService;
  if (!auth) return;

  let modal = document.getElementById('maddev-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'maddev-auth-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4';
    document.body.appendChild(modal);
  }

  const currentUser = auth.getCurrentUser();
  const knownUsers = auth.listKnownUsers();

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <span class="material-symbols-outlined text-lg">terminal</span>
          </div>
          <div>
            <h3 class="font-extrabold text-slate-900 text-lg leading-none">MAD DEV Account</h3>
            <p class="text-xs text-slate-500 mt-0.5">Switch profile or login to save your workspace entries</p>
          </div>
        </div>
        <button id="btn-close-auth-modal" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <!-- Current Profile Badge -->
      <div class="my-5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
          ${(currentUser.fullName || currentUser.email || 'M').charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 overflow-hidden">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Active Profile</span>
          <p class="font-bold text-slate-900 text-sm truncate mt-0.5">${currentUser.fullName || 'MAD DEV User'}</p>
          <p class="text-xs text-slate-500 truncate">${currentUser.email}</p>
        </div>
      </div>

      <!-- Known Accounts -->
      <div class="space-y-2 mb-5">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Switch Account</p>
        <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          ${knownUsers.map(u => `
            <button class="w-full text-left p-2.5 rounded-xl border ${u.id === currentUser.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'} flex items-center justify-between transition-all btn-switch-user" data-id="${u.id}">
              <div class="flex items-center gap-2.5 overflow-hidden">
                <div class="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  ${(u.fullName || u.email).charAt(0).toUpperCase()}
                </div>
                <div class="truncate">
                  <p class="text-xs font-bold text-slate-800 truncate">${u.fullName}</p>
                  <p class="text-[10px] text-slate-500 truncate">${u.email}</p>
                </div>
              </div>
              ${u.id === currentUser.id ? '<span class="material-symbols-outlined text-indigo-600 text-sm font-bold">check_circle</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- GitHub Auth Section -->
      <button type="button" id="btn-modal-github-login" class="w-full mb-3 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
        <span>Sign in with GitHub</span>
      </button>

      <!-- Quick Sign In / Register Form -->
      <form id="form-auth-login" class="space-y-3 pt-3 border-t border-slate-100">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Login / Register Account</p>
        <input type="text" id="auth-fullname-input" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Full Name (e.g. Abhinav)"/>
        <input type="email" id="auth-email-input" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter your email address" required/>
        <input type="password" id="auth-password-input" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter password" value="password123" required/>
        <div class="flex gap-2">
          <button type="submit" class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm">
            Sign In / Register
          </button>
          <button type="button" id="btn-auth-signout" class="py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-lg transition-colors">
            Sign Out
          </button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove('hidden');

  // Event handlers
  const btnClose = modal.querySelector('#btn-close-auth-modal');
  if (btnClose) btnClose.onclick = () => modal.classList.add('hidden');

  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  };

  const btnModalGithub = modal.querySelector('#btn-modal-github-login');
  if (btnModalGithub) {
    btnModalGithub.onclick = async () => {
      const ghUser = prompt('Enter your GitHub Username to connect:', localStorage.getItem('maddev_github_user') || 'torvalds');
      if (ghUser) {
        await auth.signInWithGitHub(ghUser);
        modal.classList.add('hidden');
        window.location.reload();
      }
    };
  }

  modal.querySelectorAll('.btn-switch-user').forEach(btn => {
    btn.onclick = () => {
      const uid = btn.getAttribute('data-id');
      auth.switchAccount(uid);
      modal.classList.add('hidden');
      window.location.reload();
    };
  });

  const formLogin = modal.querySelector('#form-auth-login');
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const fullName = modal.querySelector('#auth-fullname-input').value.trim();
      const email = modal.querySelector('#auth-email-input').value.trim();
      const pass = modal.querySelector('#auth-password-input').value;
      await auth.signIn(email, pass, fullName);
      modal.classList.add('hidden');
      window.location.reload();
    };
  }

  const btnSignOut = modal.querySelector('#btn-auth-signout');
  if (btnSignOut) {
    btnSignOut.onclick = async () => {
      await auth.signOut();
      modal.classList.add('hidden');
      const isPagesDir = window.location.pathname.includes('/pages/');
      window.location.href = isPagesDir ? 'login.html' : 'pages/login.html';
    };
  }
}

// Highlight Current Navigation Item based on URL
function highlightActiveRoute() {
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('#sidebar nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    // Normalize href and current path
    const pageName = href.split('/').pop().toLowerCase();
    const currentFile = currentPath.split('/').pop() || 'index.html';

    const isActive = (currentFile === pageName) || 
                     (currentFile === '' && pageName === 'index.html') ||
                     (currentPath.endsWith('/') && pageName === 'index.html');

    if (isActive) {
      // Apply active style
      link.className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container border-l-[3px] border-primary transition-transform hover:scale-[0.98] duration-200 tooltip relative group';
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.classList.add('text-primary');
        icon.style.fontVariationSettings = '"FILL" 1';
      }
    } else {
      // Apply inactive style
      link.className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors duration-200 border-l-[3px] border-transparent tooltip relative group';
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.classList.remove('text-primary');
        icon.style.fontVariationSettings = '';
      }
    }
  });
}

// Prevent blinking caret or text selection focus on non-editable elements
document.addEventListener('mousedown', (e) => {
  const isEditable = e.target.closest('input, textarea, [contenteditable="true"], select');
  if (!isEditable) {
    if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('input, textarea, [contenteditable="true"], select')) {
      document.activeElement.blur();
    }
  }
});


// Sidebar Collapsing and Mobile Drawer
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
  const mobileMenuTriggers = document.querySelectorAll('#mobile-menu-trigger, .mobile-nav-toggle');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const htmlDoc = document.documentElement;

  // Restore collapsed state
  const isCollapsed = localStorage.getItem('devpilot-sidebar-collapsed') === 'true';
  if (isCollapsed) {
    htmlDoc.classList.add('sidebar-collapsed');
    if (sidebarToggleIcon) sidebarToggleIcon.textContent = 'chevron_right';
  }

  function toggleSidebar() {
    htmlDoc.classList.toggle('sidebar-collapsed');
    const collapsed = htmlDoc.classList.contains('sidebar-collapsed');
    localStorage.setItem('devpilot-sidebar-collapsed', collapsed);

    if (sidebarToggleIcon) {
      sidebarToggleIcon.textContent = collapsed ? 'chevron_right' : 'chevron_left';
    }

    document.querySelectorAll('.sidebar-collapsed-only').forEach(el => {
      if (collapsed) {
        el.classList.remove('hidden');
        el.classList.add('flex');
      } else {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    });
  }

  function toggleMobileMenu() {
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
      sidebar.classList.remove('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.add('hidden');
    } else {
      sidebar.classList.add('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.remove('hidden');
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  mobileMenuTriggers.forEach(btn => {
    btn.addEventListener('click', toggleMobileMenu);
  });

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.add('hidden');
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      if (sidebar) sidebar.classList.remove('mobile-open');
      if (mobileOverlay) mobileOverlay.classList.add('hidden');
    }
  });
}

// Highlight Current Navigation Item based on URL
function highlightActiveRoute() {
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('#sidebar nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    // Normalize href and current path
    const pageName = href.split('/').pop().toLowerCase();
    const currentFile = currentPath.split('/').pop() || 'index.html';

    const isActive = (currentFile === pageName) || 
                     (currentFile === '' && pageName === 'index.html') ||
                     (currentPath.endsWith('/') && pageName === 'index.html');

    if (isActive) {
      // Apply active style
      link.className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container border-l-[3px] border-primary transition-transform hover:scale-[0.98] duration-200 tooltip relative group';
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.classList.add('text-primary');
        icon.style.fontVariationSettings = '"FILL" 1';
      }
    } else {
      // Apply inactive style
      link.className = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors duration-200 border-l-[3px] border-transparent tooltip relative group';
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.classList.remove('text-primary');
        icon.style.fontVariationSettings = '';
      }
    }
  });
}

// Prevent blinking caret or text selection focus on non-editable elements
document.addEventListener('mousedown', (e) => {
  const isEditable = e.target.closest('input, textarea, [contenteditable="true"], select');
  if (!isEditable) {
    if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('input, textarea, [contenteditable="true"], select')) {
      document.activeElement.blur();
    }
  }
});
