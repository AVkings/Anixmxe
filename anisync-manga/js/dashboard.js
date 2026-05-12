/* ===================================
   ANISYNC - Dashboard Logic
   Active Rooms Display & Management
   =================================== */

// State
let activeRooms = [];
const REFRESH_INTERVAL = 5000; // Refresh every 5 seconds

// DOM Elements
const roomsGrid = document.getElementById('rooms-grid');
const refreshBtn = document.getElementById('refresh-btn');

/**
 * Initialize dashboard
 */
function init() {
  console.log('👥 Dashboard Loading...');
  
  // Load initial rooms
  loadActiveRooms();
  
  // Setup event listeners
  setupEventListeners();
  
  // Auto-refresh rooms
  setInterval(loadActiveRooms, REFRESH_INTERVAL);
  
  // Disable dev tools
  AniSyncUtils.disableDevTools();
}

/**
 * Load active rooms from localStorage
 */
function loadActiveRooms() {
  // Scan localStorage for room keys
  const rooms = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (key && key.startsWith('anisync_room_') && !key.endsWith('_messages')) {
      try {
        const roomData = JSON.parse(localStorage.getItem(key));
        
        if (roomData && roomData.anime) {
          rooms.push({
            id: roomData.id,
            key,
            hostName: roomData.hostName || 'Unknown',
            anime: roomData.anime,
            episode: roomData.episode || 1,
            users: roomData.users || [],
            playing: roomData.playing || false,
            createdAt: roomData.createdAt || Date.now()
          });
        }
      } catch (e) {
        console.error('Error parsing room data:', e);
      }
    }
  }
  
  // Sort by most recent
  rooms.sort((a, b) => b.createdAt - a.createdAt);
  
  activeRooms = rooms;
  renderRooms();
}

/**
 * Render rooms grid
 */
function renderRooms() {
  if (activeRooms.length === 0) {
    roomsGrid.innerHTML = `
      <div class="no-rooms">
        <div class="no-rooms-icon">📭</div>
        <h2>No Active Rooms!</h2>
        <p>Be the first to create a watch party!</p>
        <button class="create-first-room" onclick="window.location.href='index.html'">
          🎬 Create Room
        </button>
      </div>
    `;
    return;
  }
  
  roomsGrid.innerHTML = activeRooms.map((room, index) => `
    <div class="room-card panel-enter" style="animation-delay: ${index * 0.1}s" data-room-id="${room.id}">
      <div class="room-cover">
        <img src="${room.anime.image || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22%3E%3Crect fill=%22%23333%22 width=%22320%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-family=%22sans-serif%22 font-size=%2224%22%3ENo Image%3C/text%3E%3C/svg%3E'}" 
             alt="${room.anime.title}" 
             loading="lazy">
        <div class="room-status">
          <span class="status-dot"></span>
          <span>LIVE</span>
        </div>
      </div>
      <div class="room-info">
        <h3 class="room-title">${escapeHtml(room.anime.title)}</h3>
        <div class="room-meta">
          <div class="room-host">
            <div class="host-avatar">${getInitials(room.hostName)}</div>
            <span>Host: ${escapeHtml(room.hostName)}</span>
          </div>
          <div class="viewers-count">
            <span>👁️</span>
            <span>${room.users.length} Reading</span>
          </div>
        </div>
        <div class="room-meta" style="margin-bottom: 15px;">
          <span>📖 Episode ${room.episode}</span>
          <span>⭐ ${AniSyncUtils.formatScore(room.anime.score)}</span>
        </div>
        <button class="join-btn" data-room-id="${room.id}">
          👉 Join Room
        </button>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  roomsGrid.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const roomId = btn.dataset.roomId;
      joinRoom(roomId);
    });
  });
  
  roomsGrid.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('click', () => {
      const roomId = card.dataset.roomId;
      joinRoom(roomId);
    });
  });
}

/**
 * Join a room
 */
function joinRoom(roomId) {
  const room = activeRooms.find(r => r.id === roomId);
  
  if (!room) {
    showToast('Room not found!', 'error');
    return;
  }
  
  // Navigate to watch page with room ID
  const animeId = room.anime.id;
  window.location.href = `watch.html?anime=${animeId}&room=${roomId}`;
}

/**
 * Get initials from name
 */
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Refresh button
  refreshBtn.addEventListener('click', () => {
    refreshBtn.style.animation = 'none';
    refreshBtn.offsetHeight; // Trigger reflow
    refreshBtn.style.animation = null;
    
    loadActiveRooms();
    showToast('Rooms refreshed! 🔄', 'success', 1500);
  });
  
  // Add ripple effect
  refreshBtn.addEventListener('click', AniSyncUtils.addRipple);
  
  // Visibility change - refresh when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadActiveRooms();
    }
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
