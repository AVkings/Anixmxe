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
    // Support both query parameter and path-based URLs
    const urlParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.split('/');
    
    // Try query parameter first: watch.html?anime={id}
    let animeId = urlParams.get('anime');
    let episodeNum = parseInt(urlParams.get('episode')) || 1;
    
    // Fallback to path-based: watch.html/{id}/{episode}
    if (!animeId) {
      const watchIndex = pathParts.indexOf('watch.html');
      if (watchIndex !== -1 && pathParts[watchIndex + 1]) {
        animeId = pathParts[watchIndex + 1];
        episodeNum = parseInt(pathParts[watchIndex + 2]) || 1;
      }
    }

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
    const playerWrapper = document.getElementById('player-wrapper');
    const playerLoading = document.getElementById('player-loading');
    
    console.log('🎬 Loading video:', { animeId, episodeNum });
    
    // Show loading state
    if (playerLoading) playerLoading.style.display = 'flex';

    try {
      // Step 1: Get anime details and episode list from Anikoto API
      console.log('📡 Fetching from Anikoto API:', `https://anikotoapi.site/series/${animeId}`);
      
      const seriesData = await this.fetchAnikotoSeries(animeId);
      
      console.log('✅ Received series data:', seriesData);
      
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
      console.log('📺 Selected episode:', episode);

      // Step 2: Get embed URL from MegaPlay
      const streamUrl = await this.getMegaPlayStream(episode, 'sub');
      
      let finalStreamUrl = streamUrl;
      if (!streamUrl) {
        // Try dub version
        console.log('⚠️ Sub not available, trying dub...');
        const dubStream = await this.getMegaPlayStream(episode, 'dub');
        if (dubStream) {
          finalStreamUrl = dubStream;
          console.log('✅ Using DUB version');
        } else {
          throw new Error('No video source available for this episode');
        }
      }

      console.log('✅ Stream URL:', finalStreamUrl);
      
      // Hide loading spinner
      if (playerLoading) playerLoading.style.display = 'none';
      
      // Step 3: Embed the player
      this.embedPlayer(playerWrapper, finalStreamUrl);
      
      // Update UI
      this.updateEpisodeSelector(seriesData.episodes, episodeNum);
      this.updateAnimeInfo(seriesData);

    } catch (error) {
      console.error('❌ Video load error:', error);
      if (playerLoading) playerLoading.style.display = 'none';
      this.showVideoError(error.message, animeId, episodeNum);
    }
  }

  /**
   * Fetch anime series data from Anikoto API
   * Handles both Anikoto IDs and MAL IDs
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
      console.log('🔍 Trying to fetch from Anikoto with ID:', animeId);
      
      // First check if animeId is numeric (could be Anikoto ID or MAL ID)
      if (/^\d+$/.test(animeId)) {
        const numId = parseInt(animeId);
        
        // Try as Anikoto series ID first (using /series/{id})
        console.log('ℹ️ Numeric ID detected, trying as Anikoto series ID:', numId);
        const seriesUrl = `https://anikotoapi.site/series/${numId}`;
        
        try {
          return await this.fetchSeriesFromUrl(seriesUrl, cacheKey);
        } catch (seriesError) {
          console.log('⚠️ Not found as series ID, trying as MAL ID...');
          
          // Not found as series ID - search recent anime to find match by MAL ID
          const recentResponse = await fetch('https://anikotoapi.site/recent-anime?page=1&per_page=100');
          const recentData = await recentResponse.json();
          
          const found = recentData.data?.find(a => a.mal_id === numId);
          if (found) {
            console.log('✅ Found match by MAL ID:', found.title, 'Anikoto ID:', found.id);
            const newSeriesUrl = `https://anikotoapi.site/series/${found.id}`;
            return await this.fetchSeriesFromUrl(newSeriesUrl, cacheKey);
          }
          
          throw new Error(`Anime with ID ${animeId} not found`);
        }
      }
      
      // Assume it's an Anikoto series ID (slug format like "liar-game-kcq5v")
      const seriesUrl = `https://anikotoapi.site/series/${animeId}`;
      return await this.fetchSeriesFromUrl(seriesUrl, cacheKey);
      
    } catch (error) {
      console.warn('⚠️ Anikoto API failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Helper to fetch series from URL and cache
   */
  async fetchSeriesFromUrl(seriesUrl, cacheKey) {
    const response = await fetch(seriesUrl);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}. The anime may not be available yet.`);
    }
    
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(result.error || 'Series not found in Anikoto catalog');
    }
    
    const data = result.data.anime || result.data;
    const episodes = result.data.episodes || [];
    
    if (!episodes || episodes.length === 0) {
      throw new Error('No episodes available for this series yet');
    }
    
    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
      data: { ...data, episodes },
      timestamp: Date.now()
    }));
    
    console.log('✅ Fetched series from Anikoto:', data.title, `(${episodes.length} episodes)`);
    return { ...data, episodes };
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

    // Check if embed_url is already provided by Anikoto
    if (episode.embed_url && episode.embed_url[language]) {
      console.log('✅ Using pre-built embed URL from Anikoto');
      return episode.embed_url[language];
    }
    
    // Construct MegaPlay URL manually
    // Format: https://megaplay.buzz/stream/s-2/{episode_embed_id}/{language}
    const streamUrl = `https://megaplay.buzz/stream/s-2/${embedId}/${language}`;
    
    console.log('🎬 MegaPlay Stream URL:', streamUrl);
    
    return streamUrl;
  }

  /**
   * Embed MegaPlay iframe player
   */
  embedPlayer(container, streamUrl) {
    if (!container) return;

    // Clear previous player
    container.innerHTML = '';

    // Create wrapper div for obfuscation
    const wrapper = document.createElement('div');
    wrapper.id = 'secure-player-wrapper';
    wrapper.style.cssText = 'width:100%;height:100%;';
    
    container.appendChild(wrapper);
    
    // Use setTimeout to obfuscate URL setting
    setTimeout(() => {
      // Create iframe with proper attributes
      const iframe = document.createElement('iframe');
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.frameBorder = '0';
      iframe.scrolling = 'no';
      iframe.allowFullscreen = true;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.referrerPolicy = 'no-referrer';
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation-by-user-activation';
      
      // Set src dynamically (obfuscation technique)
      iframe.src = streamUrl;
      
      wrapper.appendChild(iframe);
      this.player = iframe;
      
      console.log('✅ Player embedded successfully');
    }, 100);
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
  showVideoError(errorMessage, animeId, episodeNum) {
    const playerWrapper = document.getElementById('player-wrapper');
    if (!playerWrapper) return;
    
    playerWrapper.innerHTML = `
      <div class="error-container manga-panel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;background:#000;color:#fff;">
        <h3 style="font-family:var(--font-comic);font-size:2rem;margin-bottom:20px;color:var(--color-accent);">⚠️ Video Unavailable</h3>
        <p style="font-family:var(--font-body);margin-bottom:30px;max-width:600px;"><strong>Error:</strong> ${errorMessage}</p>
        
        <div class="troubleshooting" style="background:rgba(255,255,255,0.1);padding:20px;border-radius:8px;margin-bottom:30px;text-align:left;">
          <h4 style="font-family:var(--font-comic);margin-bottom:10px;">💡 Troubleshooting Steps:</h4>
          <ol style="font-family:var(--font-body);line-height:1.8;">
            <li>Try a different episode</li>
            <li>Switch between Sub/Dub using the dropdown</li>
            <li>Check your internet connection</li>
            <li>Disable ad blocker</li>
            <li>Try a different anime</li>
          </ol>
        </div>
        
        <div class="error-actions" style="display:flex;gap:15px;flex-wrap:wrap;justify-content:center;">
          <button onclick="player.retryVideo()" class="btn-manga btn-retry" style="background:var(--color-accent);color:#fff;border:2px solid #000;padding:12px 24px;font-family:var(--font-comic);cursor:pointer;font-size:1rem;">
            🔄 Retry
          </button>
          <button onclick="player.tryPreviousEpisode()" class="btn-manga" style="background:var(--color-white);color:#000;border:2px solid #000;padding:12px 24px;font-family:var(--font-comic);cursor:pointer;font-size:1rem;">
            ⏮ Previous
          </button>
          <button onclick="player.tryNextEpisode()" class="btn-manga" style="background:var(--color-white);color:#000;border:2px solid #000;padding:12px 24px;font-family:var(--font-comic);cursor:pointer;font-size:1rem;">
            Next ⏭
          </button>
        </div>
        
        <div class="fallback-link" style="margin-top:30px;">
          <p style="font-family:var(--font-body);margin-bottom:10px;">Or search on YouTube:</p>
          <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(animeId + ' episode ' + episodeNum)}" 
             target="_blank" 
             class="btn-manga btn-youtube"
             style="background:#ff0000;color:#fff;border:2px solid #000;padding:12px 24px;font-family:var(--font-comic);text-decoration:none;display:inline-block;">
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
    const urlParams = new URLSearchParams(window.location.search);
    let animeId = urlParams.get('anime');
    
    if (!animeId) {
      const pathParts = window.location.pathname.split('/');
      const watchIndex = pathParts.indexOf('watch.html');
      if (watchIndex !== -1 && pathParts[watchIndex + 1]) {
        animeId = pathParts[watchIndex + 1];
      }
    }
    
    return animeId;
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
