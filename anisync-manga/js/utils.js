/* ===================================
   ANISYNC - Utility Functions
   Helpers, Toast, Storage, etc.
   =================================== */

/**
 * Show toast notification (speech bubble style)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format score to display
 */
function formatScore(score) {
  if (!score || score === 0) return 'N/A';
  return score.toFixed(1);
}

/**
 * Generate random ID
 */
function generateId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get URL parameter
 */
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Set URL parameter (for room sharing)
 */
function setUrlParam(param, value) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.pushState({}, '', url);
}

/**
 * Local storage helpers
 */
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },
  
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  }
};

/**
 * Create anime card HTML
 */
function createAnimeCard(anime, index = 0) {
  const formatted = AniSyncAPI.formatAnimeData(anime);
  const stars = Math.round(formatted.score / 2);
  
  return `
    <div class="anime-card panel-enter" style="animation-delay: ${index * 0.05}s" data-anime-id="${formatted.id}">
      <div class="card-image">
        <img src="${formatted.image}" alt="${formatted.title}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23333%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        ${index < 3 ? '<span class="ribbon badge-hot">HOT</span>' : ''}
      </div>
      <div class="card-content">
        <h3 class="card-title">${formatted.title}</h3>
        <div class="card-meta">
          <span class="card-episodes">📖 Ch. ${formatted.episodes}</span>
          <span class="card-rating">
            <span class="star">★</span>
            ${formatScore(formatted.score)}
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create skeleton card for loading state
 */
function createSkeletonCard() {
  return `
    <div class="anime-card skeleton">
      <div class="card-image skeleton-loading"></div>
      <div class="card-content">
        <div class="card-title skeleton-loading" style="height: 20px; margin-bottom: 10px;"></div>
        <div class="card-meta skeleton-loading" style="height: 15px;"></div>
      </div>
    </div>
  `;
}

/**
 * Create hero panel HTML
 */
function createHeroPanel(anime, index) {
  const formatted = AniSyncAPI.formatAnimeData(anime);
  
  return `
    <div class="panel panel-enter" style="animation-delay: ${index * 0.1}s" data-anime-id="${formatted.id}">
      <img src="${formatted.coverImage}" alt="${formatted.title}" loading="lazy">
      <div class="panel-overlay">
        <h3>${formatted.title}</h3>
        <p>⭐ ${formatScore(formatted.score)} • 📖 ${formatted.episodes} Episodes</p>
      </div>
      ${index === 0 ? '<span class="ribbon badge-new">#1 RANKED</span>' : ''}
    </div>
  `;
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied!', 'success');
    return true;
  }
}

/**
 * Add ripple effect to button click
 */
function addRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Lazy load images
 */
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Disable right-click and dev tools shortcuts (basic obfuscation)
 */
function disableDevTools() {
  // Disable right-click
  document.addEventListener('contextmenu', event => event.preventDefault());
  
  // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', event => {
    if (
      event.key === 'F12' ||
      (event.ctrlKey && event.shiftKey && ['I', 'J'].includes(event.key.toUpperCase())) ||
      (event.ctrlKey && event.key === 'U')
    ) {
      event.preventDefault();
      showToast('Nice try! But this is a manga site, not a dev tool! 😄', 'info', 2000);
    }
  });
}

/**
 * Check if user is on mobile
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Format time in seconds to MM:SS
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time from MM:SS format
 */
function parseTime(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
}

/**
 * Get random avatar color
 */
function getRandomAvatarColor() {
  const colors = ['#ff0040', '#00d4ff', '#ffd700', '#00c853', '#ff6d00', '#2979ff'];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Create emoji reaction element
 */
function createEmojiReaction(emoji, x, y, container) {
  const emojiEl = document.createElement('div');
  emojiEl.className = 'emoji-reaction';
  emojiEl.textContent = emoji;
  emojiEl.style.left = x + 'px';
  emojiEl.style.top = y + 'px';
  container.appendChild(emojiEl);
  
  setTimeout(() => emojiEl.remove(), 2000);
}

// Export utilities
window.AniSyncUtils = {
  showToast,
  debounce,
  throttle,
  formatNumber,
  formatScore,
  generateId,
  getUrlParam,
  setUrlParam,
  storage,
  createAnimeCard,
  createSkeletonCard,
  createHeroPanel,
  copyToClipboard,
  addRipple,
  setupLazyLoading,
  disableDevTools,
  isMobile,
  formatTime,
  parseTime,
  getRandomAvatarColor,
  createEmojiReaction
};
