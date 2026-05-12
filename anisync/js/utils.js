// ============================================
// AniSync - Utility Functions
// ============================================

/**
 * Generate a random room ID
 */
export function generateRoomId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get current timestamp formatted
 */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Debounce function for search inputs
 */
export function debounce(func, wait) {
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
 * Throttle function for rate limiting
 */
export function throttle(func, limit) {
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
 * Cache utility with localStorage
 */
export class Cache {
  static get(key) {
    const item = localStorage.getItem(`anisync_cache_${key}`);
    if (!item) return null;
    
    const { value, expiry } = JSON.parse(item);
    if (expiry && Date.now() > expiry) {
      this.remove(key);
      return null;
    }
    
    return value;
  }
  
  static set(key, value, ttlMinutes = 60) {
    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    localStorage.setItem(`anisync_cache_${key}`, JSON.stringify({ value, expiry }));
  }
  
  static remove(key) {
    localStorage.removeItem(`anisync_cache_${key}`);
  }
  
  static clear() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('anisync_cache_'));
    keys.forEach(k => localStorage.removeItem(k));
  }
}

/**
 * Fetch wrapper with caching
 */
export async function fetchWithCache(url, options = {}, ttlMinutes = 60) {
  const cacheKey = btoa(url + JSON.stringify(options));
  const cached = Cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    Cache.set(cacheKey, data, ttlMinutes);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Create avatar initials from name
 */
export function getAvatarInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate random avatar color
 */
export function getRandomAvatarColor() {
  const colors = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Animate emoji reaction
 */
export function createEmojiReaction(emoji, x, y) {
  const element = document.createElement('div');
  element.className = 'emoji-reaction';
  element.textContent = emoji;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  document.body.appendChild(element);
  
  setTimeout(() => {
    element.remove();
  }, 3000);
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Lazy load images
 */
export function setupLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}

/**
 * Format episode number with leading zero
 */
export function formatEpisodeNumber(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Parse time string to seconds
 */
export function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').reverse();
  let seconds = 0;
  let multiplier = 1;
  
  for (const part of parts) {
    seconds += parseInt(part) * multiplier;
    multiplier *= 60;
  }
  
  return seconds;
}

/**
 * Format seconds to time string
 */
export function formatSecondsToTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: var(--surface);
    backdrop-filter: blur(12px);
    border: 1px solid var(--surface-border);
    border-radius: 8px;
    color: var(--text-light);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Disable right-click context menu (basic obfuscation)
 */
export function disableContextMenu() {
  document.addEventListener('contextmenu', event => event.preventDefault());
  document.addEventListener('keydown', event => {
    if (event.key === 'F12' || 
        (event.ctrlKey && event.shiftKey && event.key === 'I') ||
        (event.ctrlKey && event.key === 'U')) {
      event.preventDefault();
    }
  });
}

/**
 * Theme customization
 */
export class ThemeManager {
  static setPrimaryColor(color) {
    document.documentElement.style.setProperty('--primary', color);
    localStorage.setItem('anisync_theme_primary', color);
  }
  
  static getPrimaryColor() {
    return localStorage.getItem('anisync_theme_primary') || '#6366f1';
  }
  
  static reset() {
    document.documentElement.style.removeProperty('--primary');
    localStorage.removeItem('anisync_theme_primary');
  }
}
