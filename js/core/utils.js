
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';

  toast.innerHTML = `
    <span class="material-symbols-outlined toast-icon text-lg">${iconName}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

async function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    showToast(successMessage, 'success');
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy to clipboard', 'error');
    return false;
  }
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`devpilot_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`Error reading key ${key} from localStorage`, e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`devpilot_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error setting key ${key} to localStorage`, e);
    }
  },
  remove(key) {
    localStorage.removeItem(`devpilot_${key}`);
  }
};

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getPageUrl(target) {
  if (!target) return target;
  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.startsWith('mailto:')) {
    return target;
  }

  let path = target;
  let hashOrQuery = '';
  const hashIdx = path.search(/[?#]/);
  if (hashIdx !== -1) {
    hashOrQuery = path.substring(hashIdx);
    path = path.substring(0, hashIdx);
  }

  const pageName = path.split('/').pop();
  const isWebProtocol = typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http');

  if (isWebProtocol) {
    if (pageName === 'index.html') {
      return '/index.html' + hashOrQuery;
    }
    return '/pages/' + pageName + hashOrQuery;
  }

  const pathname = (typeof window !== 'undefined' && window.location) ? window.location.pathname.replace(/\\/g, '/') : '';
  const isInPagesDir = pathname.includes('/pages/');

  if (pageName === 'index.html') {
    return (isInPagesDir ? '../index.html' : 'index.html') + hashOrQuery;
  }

  if (isInPagesDir) {
    return pageName + hashOrQuery;
  } else {
    return 'pages/' + pageName + hashOrQuery;
  }
}

