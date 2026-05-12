/* ===================================
   ANISYNC - Player & Watch Page Logic
   Video Player, Chat, Room Management
   =================================== */

// State
let currentAnime = null;
let currentEpisode = 1;
let roomId = null;
let isHost = false;
let playerName = null;

// DOM Elements
const playerContainer = document.getElementById('player-container');
const animeTitleEl = document.getElementById('anime-title');
const animeMetaEl = document.getElementById('anime-meta');
const animeSynopsisEl = document.getElementById('anime-synopsis');
const episodeSelect = document.getElementById('episode-select');
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const emojiBtn = document.getElementById('emoji-btn');

/**
 * Initialize watch page
 */
async function init() {
  console.log('📺 Watch Page Loading...');
  
  // Get anime ID from URL
  const animeId = AniSyncUtils.getUrlParam('anime');
  roomId = AniSyncUtils.getUrlParam('room');
  isHost = AniSyncUtils.getUrlParam('host') === 'true';
  
  // Generate random player name
  playerName = `Reader_${Math.floor(Math.random() * 10000)}`;
  
  if (!animeId) {
    showToast('No anime selected!', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }
  
  try {
    // Load anime details
    await loadAnimeDetails(animeId);
    
    // Setup event listeners
    setupEventListeners();
    
    // Join room if room ID exists
    if (roomId) {
      joinRoom(roomId, isHost);
    }
    
    // Disable dev tools
    AniSyncUtils.disableDevTools();
    
    showToast('Enjoy watching! 📺✨', 'success', 2000);
  } catch (error) {
    console.error('Watch page error:', error);
    showToast('Failed to load anime. Retrying...', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
  }
}

/**
 * Load anime details and display
 */
async function loadAnimeDetails(animeId) {
  showPlayerLoading(true);
  
  try {
    const details = await AniSyncAPI.getAnimeDetails(animeId);
    
    if (!details) {
      throw new Error('Anime not found');
    }
    
    currentAnime = AniSyncAPI.formatAnimeData(details);
    
    // Update UI
    animeTitleEl.textContent = currentAnime.title;
    animeMetaEl.innerHTML = `
      <span>⭐ ${AniSyncUtils.formatScore(currentAnime.score)}</span>
      <span>📖 ${currentAnime.episodes} Episodes</span>
      <span>📅 ${currentAnime.year}</span>
      <span>${currentAnime.status}</span>
    `;
    animeSynopsisEl.textContent = currentAnime.synopsis;
    
    // Populate episode selector
    updateEpisodeSelector(currentAnime.episodes);
    
    // Load video player
    await loadVideoPlayer(currentAnime.title, 1);
    
  } catch (error) {
    console.error('Load details error:', error);
    showToast('Failed to load anime details', 'error');
    
    // Show fallback content
    animeTitleEl.textContent = 'Error Loading Anime';
    animeSynopsisEl.textContent = 'Unable to load this anime. Please try another one.';
    playerContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-family:var(--font-comic);flex-direction:column;gap:20px;">
        <p style="font-size:2rem;">💥 Oops!</p>
        <p>Failed to load this chapter</p>
        <button class="btn-manga" onclick="window.location.href='index.html'">Back to Library</button>
      </div>
    `;
  } finally {
    showPlayerLoading(false);
  }
}

/**
 * Update episode selector dropdown
 */
function updateEpisodeSelector(totalEpisodes) {
  const count = typeof totalEpisodes === 'number' ? totalEpisodes : 1;
  
  episodeSelect.innerHTML = Array.from({ length: Math.min(count, 100) }, (_, i) => 
    `<option value="${i + 1}">Episode ${i + 1}</option>`
  ).join('');
}

/**
 * Load video player with multi-source fallback
 */
async function loadVideoPlayer(animeTitle, episodeNum) {
  console.log('🎬 Loading video player:', { animeTitle, episodeNum });
  
  playerContainer.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-family:var(--font-comic);flex-direction:column;gap:20px;">
      <div class="manga-loader"></div>
      <p>Loading Episode ${episodeNum}...</p>
      <p style="font-size:0.9rem;color:var(--color-gray-pale);">Searching multiple sources</p>
    </div>
  `;
  
  try {
    // Try to get stream from multi-source API
    const streamData = await AniSyncAPI.getEpisodeStream(animeTitle, episodeNum);
    
    console.log('📺 Stream data received:', streamData);
    
    if (!streamData || !streamData.url) {
      throw new Error('No valid stream URL found');
    }
    
    // Handle YouTube redirect
    if (streamData.isRedirect) {
      playerContainer.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-family:var(--font-comic);flex-direction:column;gap:20px;padding:20px;text-align:center;">
          <p style="font-size:2rem;">📺</p>
          <p style="font-size:1.5rem;">${streamData.message || 'Watch on YouTube'}</p>
          <p style="font-size:0.9rem;color:var(--color-gray-pale);max-width:400px;">
            Full episode not available for direct streaming. Click below to watch on official YouTube channels.
          </p>
          <a href="${streamData.url}" target="_blank" class="btn-manga" style="text-decoration:none;display:inline-block;margin-top:10px;">
            🎬 Watch on YouTube →
          </a>
          <p style="font-size:0.8rem;color:var(--color-gray-pale);margin-top:15px;">
            Source: ${streamData.source || 'YouTube'}
          </p>
        </div>
      `;
      return;
    }
    
    // Check if it's a direct HLS/MP4 stream or needs iframe
    const isDirectStream = streamData.type === 'hls' || streamData.type === 'mp4';
    
    if (isDirectStream && streamData.url.includes('.m3u8')) {
      // Use HLS.js for .m3u8 streams
      playerContainer.innerHTML = `
        <video id="anime-video" controls style="width:100%;height:100%;" autoplay></video>
      `;
      
      const video = document.getElementById('anime-video');
      
      // Load HLS.js if needed
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamData.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest loaded');
          video.play().catch(e => console.log('Autoplay prevented:', e));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = streamData.url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.log('Autoplay prevented:', e));
        });
      } else {
        throw new Error('HLS not supported in this browser');
      }
    } else {
      // Use iframe for embed URLs
      playerContainer.innerHTML = `
        <iframe 
          src="${streamData.url}" 
          frameborder="0" 
          allowfullscreen 
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-presentation allow-popups"
          style="width:100%;height:100%;border:none;"
        ></iframe>
      `;
    }
    
    // Show success toast
    showToast(`Playing Episode ${episodeNum} (${streamData.source || 'Stream'})`, 'success', 2000);
    
  } catch (error) {
    console.error('❌ Player load error:', error);
    
    // Try YouTube embed for popular anime
    const youtubeEmbed = AniSyncAPI.getYouTubeEmbed(animeTitle);
    
    if (youtubeEmbed) {
      playerContainer.innerHTML = `
        <iframe 
          src="${youtubeEmbed}" 
          frameborder="0" 
          allowfullscreen
          allow="autoplay; encrypted-media"
          style="width:100%;height:100%;border:none;"
        ></iframe>
      `;
      showToast('Playing trailer (full episode unavailable)', 'info', 3000);
      return;
    }
    
    // Final fallback - detailed error message
    playerContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-family:var(--font-comic);flex-direction:column;gap:20px;padding:20px;text-align:center;">
        <p style="font-size:2rem;">💥</p>
        <p style="font-size:1.5rem;">Video Unavailable</p>
        <p style="font-size:0.9rem;color:var(--color-gray-pale);max-width:400px;">
          We couldn't find a working stream for this episode. This might be due to:<br><br>
          • Geo-blocking in your region<br>
          • Temporary server issues<br>
          • Anime licensing restrictions<br><br>
          <strong>Error:</strong> ${error.message}
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:15px;">
          <button class="btn-manga" onclick="retryVideo()">🔄 Retry</button>
          <button class="btn-secondary" onclick="tryDifferentEpisode()">Try Different Episode</button>
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(animeTitle + ' episode ' + episodeNum)}" target="_blank" class="btn-manga" style="background:var(--color-accent-red);">
            ▶ Watch on YouTube
          </a>
        </div>
        <p style="font-size:0.8rem;color:var(--color-gray-pale);margin-top:15px;">
          Tip: Try searching for "${animeTitle}" on the homepage for alternative sources
        </p>
      </div>
    `;
  }
}

/**
 * Retry loading video
 */
function retryVideo() {
  if (currentAnime) {
    loadVideoPlayer(currentAnime.title, currentEpisode);
  }
}

/**
 * Try different episode
 */
function tryDifferentEpisode() {
  const newEp = Math.max(1, currentEpisode - 1);
  episodeSelect.value = newEp;
  currentEpisode = newEp;
  loadVideoPlayer(currentAnime.title, currentEpisode);
}

/**
 * Show player loading state
 */
function showPlayerLoading(show) {
  // Handled in loadVideoPlayer
}

/**
 * Join or create room
 */
function joinRoom(roomId, host = false) {
  console.log('Joining room:', roomId, 'as host:', host);
  
  // Store room info in localStorage for cross-tab communication
  const roomKey = `anisync_room_${roomId}`;
  
  if (host) {
    // Create room
    const roomData = {
      id: roomId,
      host: playerName,
      hostName: playerName,
      anime: currentAnime,
      episode: currentEpisode,
      playing: false,
      currentTime: 0,
      users: [playerName],
      createdAt: Date.now()
    };
    
    AniSyncUtils.storage.set(roomKey, roomData);
    AniSyncUtils.storage.set(`${roomKey}_messages`, []);
    
    addSystemMessage(`Room created! Share the link to invite friends.`);
    showToast('Room created! Copy the URL to share.', 'success');
  } else {
    // Join existing room
    const roomData = AniSyncUtils.storage.get(roomKey);
    
    if (roomData) {
      roomData.users.push(playerName);
      AniSyncUtils.storage.set(roomKey, roomData);
      
      addSystemMessage(`Joined room hosted by ${roomData.hostName}`);
      showToast('Joined room!', 'success');
      
      // Listen for host updates
      setupRoomListener(roomId);
    } else {
      showToast('Room not found', 'error');
    }
  }
}

/**
 * Setup room listener for cross-tab sync
 */
function setupRoomListener(roomId) {
  const roomKey = `anisync_room_${roomId}`;
  
  // Listen for storage events (cross-tab communication)
  window.addEventListener('storage', (e) => {
    if (e.key === roomKey) {
      const roomData = JSON.parse(e.newValue);
      
      if (roomData && !isHost) {
        // Sync with host
        if (roomData.playing !== undefined) {
          console.log('Sync: play state changed', roomData.playing);
        }
        if (roomData.currentTime !== undefined) {
          console.log('Sync: time changed', roomData.currentTime);
        }
      }
    }
    
    // Check for new messages
    if (e.key === `${roomKey}_messages`) {
      loadChatMessages(roomId);
    }
  });
  
  // Poll for updates
  setInterval(() => {
    loadChatMessages(roomId);
  }, 1000);
}

/**
 * Send chat message
 */
function sendMessage() {
  const text = chatInput.value.trim();
  
  if (!text) return;
  
  const message = {
    id: Date.now(),
    sender: playerName,
    text,
    timestamp: Date.now()
  };
  
  if (roomId) {
    const roomKey = `anisync_room_${roomId}_messages`;
    const messages = AniSyncUtils.storage.get(roomKey, []);
    messages.push(message);
    AniSyncUtils.storage.set(roomKey, messages);
  }
  
  // Display locally
  displayMessage(message);
  chatInput.value = '';
}

/**
 * Display chat message
 */
function displayMessage(message) {
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.innerHTML = `
    <div class="sender">${escapeHtml(message.sender)}</div>
    <div class="text">${escapeHtml(message.text)}</div>
  `;
  
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Add system message
 */
function addSystemMessage(text) {
  displayMessage({
    sender: 'System',
    text,
    timestamp: Date.now()
  });
}

/**
 * Load chat messages from storage
 */
function loadChatMessages(roomId) {
  const roomKey = `anisync_room_${roomId}_messages`;
  const messages = AniSyncUtils.storage.get(roomKey, []);
  
  // Clear and reload (simple approach)
  chatMessages.innerHTML = '';
  messages.forEach(msg => displayMessage(msg));
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Episode selector
  episodeSelect.addEventListener('change', (e) => {
    currentEpisode = parseInt(e.target.value);
    loadVideoPlayer(currentAnime.title, currentEpisode);
    showToast(`Loading Episode ${currentEpisode}...`, 'info', 1500);
  });
  
  // Create room button
  createRoomBtn.addEventListener('click', () => {
    if (!currentAnime) return;
    
    const newRoomId = AniSyncUtils.generateId(6);
    const url = `${window.location.origin}${window.location.pathname}?anime=${currentAnime.id}&room=${newRoomId}&host=true`;
    
    AniSyncUtils.copyToClipboard(url).then(() => {
      window.location.href = url;
    });
  });
  
  // Join room button
  joinRoomBtn.addEventListener('click', () => {
    const inputRoomId = prompt('Enter room ID:');
    if (inputRoomId) {
      const url = `${window.location.origin}${window.location.pathname}?anime=${currentAnime.id}&room=${inputRoomId}`;
      window.location.href = url;
    }
  });
  
  // Chat input
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Emoji button (simple implementation)
  emojiBtn.addEventListener('click', () => {
    const emojis = ['😀', '😂', '😍', '🔥', '❤️', '👍', '🎉', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    chatInput.value += randomEmoji;
    chatInput.focus();
  });
  
  // Add ripple effect to buttons
  document.querySelectorAll('.btn-manga, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', AniSyncUtils.addRipple);
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
