/**
 * AniSync Video Player Module
 * Handles video playback with Anikoto/MegaPlay integration
 * 
 * API Flow:
 * 1. Fetch anime series from Anikoto API (https://anikotoapi.site/series/{id})
 * 2. Get episode_embed_id from episode data
 * 3. Construct MegaPlay URL: https://megaplay.buzz/stream/s-2/{episode_embed_id}/{language}
 * 4. Embed iframe with postMessage event handling
 */

class AnimePlayer {
  constructor() {
    this.player = null;
    this.hls = null;
    this.currentEpisode = null;
    this.autoNext = true;
    this.isHost = false;
    this.roomId = null;
    this.init();
  }

  init() {
    // Check if we're in a room
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room');
    this.isHost = urlParams.get('host') === 'true';
    
    this.setupEventListeners();
    this.loadAnimeFromURL();
  }

  setupEventListeners() {
    // Auto-hide controls
    let controlsTimeout;
    const playerContainer = document.getElementById('player-container');
    
    if (playerContainer) {
      playerContainer.addEventListener('mousemove', () => {
        playerContainer.classList.remove('controls-hidden');
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
          if (this.player && !this.player.paused) {
            playerContainer.classList.add('controls-hidden');
          }
        }, 3000);
      });
    }

    // Listen for MegaPlay postMessage events
    window.addEventListener('message', (event) => {
      this.handlePlayerMessage(event);
    });
  }

  handlePlayerMessage(event) {
    // Verify origin for security
    if (!event.origin.includes('megaplay.buzz')) {
      return;
    }

    let data = event.data;
    
    // Parse string data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
    }

    console.log('📺 Player Event:', data);

    // Handle different event types
    if (data.channel === 'megacloud' || data.type === 'watching-log') {
      if (data.event === 'complete' || data.type === 'watching-log') {
        // Episode completed or progress update
        if (data.event === 'complete' && this.autoNext) {
          this.playNextEpisode();
        }
        
        // Sync with room if host
        if (this.isHost && this.roomId) {
          this.syncPlayback(data.currentTime, data.duration);
        }
      }
    }
  }

  async loadAnimeFromURL() {
    const pathParts = window.location.pathname.split('/');
    const animeId = pathParts[pathParts.indexOf('watch') + 1];
    const episodeNum = parseInt(pathParts[pathParts.indexOf('watch') + 2]) || 1;

    if (!animeId) {
      this.showError('No anime selected', 'Please select an anime from the library');
      return;
    }

    await this.loadVideo(animeId, episodeNum);
  }

  /**
   * Load video using Anikoto API + MegaPlay
   * Multi-tier fallback system
   */
  async loadVideo(animeId, episodeNum = 1) {
    const debugInfo = document.getElementById('debug-info');
    const playerWrapper = document.getElementById('player-wrapper');
    
    this.showLoading(debugInfo);

    try {
      // Step 1: Get anime details and episode list from Anikoto API
      debugInfo.innerHTML = '🔄 Fetching anime details from Anikoto...';
      
      const seriesData = await this.fetchAnikotoSeries(animeId);
      
      if (!seriesData || !seriesData.episodes) {
        throw new Error('Anime not found or no episodes available');
      }

      // Find the requested episode
      const episode = seriesData.episodes.find(ep => ep.number === episodeNum) || 
                      seriesData.episodes[episodeNum - 1];
      
      if (!episode) {
        throw new Error(`Episode ${episodeNum} not found`);
      }

      this.currentEpisode = episode;
      debugInfo.innerHTML = `📺 Loading Episode ${episode.number}: ${episode.title || 'Episode ' + episode.number}...`;

      // Step 2: Get embed URL from MegaPlay
      const streamUrl = await this.getMegaPlayStream(episode, 'sub');
      
      if (!streamUrl) {
        // Try dub version
        debugInfo.innerHTML = '⚠️ Sub not available, trying dub...';
        const dubStream = await this.getMegaPlayStream(episode, 'dub');
        if (dubStream) {
          streamUrl = dubStream;
        } else {
          throw new Error('No video source available for this episode');
        }
      }

      debugInfo.innerHTML = `✅ Stream loaded! Playing Episode ${episode.number}`;
      
      // Step 3: Embed the player
      this.embedPlayer(playerWrapper, streamUrl);
      
      // Update UI
      this.updateEpisodeSelector(seriesData.episodes, episodeNum);
      this.updateAnimeInfo(seriesData);
      
      // Hide debug info after successful load
      setTimeout(() => {
        debugInfo.style.display = 'none';
      }, 3000);

    } catch (error) {
      console.error('❌ Video load error:', error);
      this.showVideoError(debugInfo, error.message, animeId, episodeNum);
    }
  }

  /**
   * Fetch anime series data from Anikoto API
   */
  async fetchAnikotoSeries(animeId) {
    const cacheKey = `anisync_series_${animeId}`;
    const cached = localStorage.getItem(cacheKey);
    
    // Return cached data if less than 5 minutes old
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        console.log('📦 Using cached series data');
        return data;
      }
    }

    try {
      // Try fetching from Anikoto API
      const response = await fetch(`https://anikotoapi.site/series/${animeId}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      console.log('✅ Fetched series from Anikoto:', data.title);
      return data;
      
    } catch (error) {
      console.warn('⚠️ Anikoto API failed, trying fallback...');
      
      // Fallback: Use MAL ID if animeId is numeric
      if (/^\d+$/.test(animeId)) {
        return this.fetchByMALId(animeId);
      }
      
      throw error;
    }
  }

  /**
   * Fetch by MAL ID using Anikoto API
   */
  async fetchByMALId(malId) {
    try {
      // Search for anime with this MAL ID
      const response = await fetch(`https://anikotoapi.site/recent-anime?page=1&per_page=100`);
      const data = await response.json();
      
      const anime = data.results?.find(a => a.mal_id === parseInt(malId));
      
      if (anime) {
        return this.fetchAnikotoSeries(anime.id);
      }
      
      throw new Error('Anime not found with MAL ID');
    } catch (error) {
      throw new Error('Could not find anime with provided ID');
    }
  }

  /**
   * Get MegaPlay stream URL
   * Uses the episode_embed_id from Anikoto
   */
  async getMegaPlayStream(episode, language = 'sub') {
    const embedId = episode.episode_embed_id || episode.id;
    
    if (!embedId) {
      throw new Error('No episode embed ID available');
    }

    // Construct MegaPlay URL
    // Format: https://megaplay.buzz/stream/s-2/{episode_embed_id}/{language}
    const streamUrl = `https://megaplay.buzz/stream/s-2/${embedId}/${language}`;
    
    console.log('🎬 MegaPlay Stream URL:', streamUrl);
    
    // Verify the URL is accessible (optional check)
    try {
      // We can't directly fetch due to CORS, but we can check if the format is valid
      if (!streamUrl.includes('megaplay.buzz')) {
        throw new Error('Invalid stream URL format');
      }
      return streamUrl;
    } catch (error) {
      console.error('❌ Stream URL validation failed:', error);
      return null;
    }
  }

  /**
   * Embed MegaPlay iframe player
   */
  embedPlayer(container, streamUrl) {
    if (!container) return;

    // Clear previous player
    container.innerHTML = '';

    // Create iframe with proper attributes for security and functionality
    const iframe = document.createElement('iframe');
    iframe.src = streamUrl;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.allowFullscreen = true;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.referrerPolicy = 'no-referrer';
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    // Add sandbox attributes for security (but allow necessary features)
    iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation-by-user-activation';

    container.appendChild(iframe);
    
    console.log('✅ Player embedded successfully');
    
    // Store reference for controls
    this.player = iframe;
  }

  /**
   * Update episode selector dropdown
   */
  updateEpisodeSelector(episodes, currentEpisodeNum) {
    const selector = document.getElementById('episode-selector');
    if (!selector || !episodes) return;

    selector.innerHTML = '';
    
    episodes.forEach((ep, index) => {
      const option = document.createElement('option');
      option.value = ep.number || index + 1;
      option.textContent = `Episode ${ep.number || index + 1}${ep.title ? ': ' + ep.title : ''}`;
      
      if ((ep.number || index + 1) === currentEpisodeNum) {
        option.selected = true;
      }
      
      selector.appendChild(option);
    });

    // Add change listener
    selector.addEventListener('change', (e) => {
      const newEpNum = parseInt(e.target.value);
      this.loadVideo(this.getCurrentAnimeId(), newEpNum);
      
      // Notify room members if in a room
      if (this.roomId && this.isHost) {
        this.notifyRoomEpisodeChange(newEpNum);
      }
    });
  }

  /**
   * Update anime info display
   */
  updateAnimeInfo(seriesData) {
    const titleEl = document.getElementById('anime-title');
    const posterEl = document.getElementById('anime-poster');
    
    if (titleEl) {
      titleEl.textContent = seriesData.title || seriesData.name || 'Unknown Anime';
    }
    
    if (posterEl && seriesData.poster) {
      posterEl.src = seriesData.poster;
      posterEl.alt = seriesData.title;
    }
  }

  /**
   * Show loading state
   */
  showLoading(element) {
    if (!element) return;
    
    element.style.display = 'block';
    element.innerHTML = `
      <div class="loading-spinner">
        <div class="manga-panel-loading">
          <div class="speed-lines"></div>
          <span>📖 Loading Episode...</span>
        </div>
      </div>
    `;
  }

  /**
   * Show video error with troubleshooting
   */
  showVideoError(element, errorMessage, animeId, episodeNum) {
    if (!element) return;
    
    element.style.display = 'block';
    element.innerHTML = `
      <div class="error-container manga-panel">
        <h3>⚠️ Video Unavailable</h3>
        <p><strong>Error:</strong> ${errorMessage}</p>
        
        <div class="troubleshooting">
          <h4>💡 Troubleshooting Steps:</h4>
          <ol>
            <li>Try a different episode</li>
            <li>Switch between Sub/Dub</li>
            <li>Check your internet connection</li>
            <li>Disable ad blocker</li>
            <li>Try a different anime</li>
          </ol>
        </div>
        
        <div class="error-actions">
          <button onclick="player.retryVideo()" class="btn-manga btn-retry">
            🔄 Retry
          </button>
          <button onclick="player.tryPreviousEpisode()" class="btn-manga">
            ⏮ Previous Episode
          </button>
          <button onclick="player.tryNextEpisode()" class="btn-manga">
            Next Episode ⏭
          </button>
        </div>
        
        <div class="fallback-link">
          <p>Or search on YouTube:</p>
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(animeId + ' episode ' + episodeNum)}" 
             target="_blank" 
             class="btn-manga btn-youtube">
            📺 Search YouTube
          </a>
        </div>
      </div>
    `;
  }

  showError(title, message) {
    const playerWrapper = document.getElementById('player-wrapper');
    if (playerWrapper) {
      playerWrapper.innerHTML = `
        <div class="error-container manga-panel">
          <h3>⚠️ ${title}</h3>
          <p>${message}</p>
          <a href="/" class="btn-manga">🏠 Back to Home</a>
        </div>
      `;
    }
  }

  retryVideo() {
    if (this.currentEpisode) {
      this.loadVideo(this.getCurrentAnimeId(), this.currentEpisode.number);
    }
  }

  tryPreviousEpisode() {
    if (this.currentEpisode && this.currentEpisode.number > 1) {
      this.loadVideo(this.getCurrentAnimeId(), this.currentEpisode.number - 1);
    }
  }

  tryNextEpisode() {
    if (this.currentEpisode) {
      this.loadVideo(this.getCurrentAnimeId(), this.currentEpisode.number + 1);
    }
  }

  playNextEpisode() {
    this.tryNextEpisode();
  }

  getCurrentAnimeId() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.indexOf('watch') + 1];
  }

  syncPlayback(currentTime, duration) {
    // Send sync event to room members (implemented in room.js)
    if (window.roomManager && this.roomId) {
      window.roomManager.syncPlayback(currentTime, duration);
    }
  }

  notifyRoomEpisodeChange(episodeNum) {
    // Notify room members of episode change
    if (window.roomManager && this.roomId) {
      window.roomManager.changeEpisode(episodeNum);
    }
  }
}

// Initialize player when DOM is ready
let player;
document.addEventListener('DOMContentLoaded', () => {
  player = new AnimePlayer();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimePlayer;
}
