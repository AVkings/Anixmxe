/* ===================================
   ANISYNC - Main Application
   Homepage Logic & UI Rendering
   =================================== */

// State
let currentPage = 1;
let currentGenre = null;
let isLoading = false;
let hasMore = true;
let searchQuery = '';

// DOM Elements
const animeGrid = document.getElementById('anime-grid');
const heroPanels = document.getElementById('hero-panels');
const genreFilters = document.getElementById('genre-filters');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const createRoomBtn = document.getElementById('create-room-btn');

/**
 * Initialize the application
 */
async function init() {
  console.log('📚 AniSync Loading...');
  
  // Show loading state
  showLoading(true);
  
  try {
    // Load featured anime in hero section
    await loadHeroSection();
    
    // Load genres for filters
    await loadGenres();
    
    // Load initial anime list
    await loadAnimeList(1);
    
    // Setup event listeners
    setupEventListeners();
    
    // Disable dev tools (basic obfuscation)
    AniSyncUtils.disableDevTools();
    
    showToast('Welcome to AniSync! 📖✨', 'success', 2000);
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to load anime. Retrying...', 'error');
    setTimeout(init, 2000);
  } finally {
    showLoading(false);
  }
}

/**
 * Load hero section with featured anime
 */
async function loadHeroSection() {
  try {
    const featured = await AniSyncAPI.getRandomAnime(3);
    
    if (featured.length > 0) {
      heroPanels.innerHTML = featured
        .map((anime, index) => AniSyncUtils.createHeroPanel(anime, index))
        .join('');
      
      // Add click handlers to hero panels
      heroPanels.querySelectorAll('.panel').forEach(panel => {
        panel.addEventListener('click', () => {
          const animeId = panel.dataset.animeId;
          window.location.href = `watch.html?anime=${animeId}`;
        });
      });
    }
  } catch (error) {
    console.error('Hero section error:', error);
    heroPanels.innerHTML = `
      <div class="panel" style="display:flex;align-items:center;justify-content:center;">
        <p style="color:white;font-family:var(--font-comic);">Featured Section</p>
      </div>
      <div class="panel" style="display:flex;align-items:center;justify-content:center;">
        <p style="color:white;font-family:var(--font-comic);">Coming Soon</p>
      </div>
      <div class="panel" style="display:flex;align-items:center;justify-content:center;">
        <p style="color:white;font-family:var(--font-comic);">Stay Tuned!</p>
      </div>
    `;
  }
}

/**
 * Load genre filters
 */
async function loadGenres() {
  try {
    const genres = await AniSyncAPI.getGenres();
    
    const popularGenres = genres.slice(0, 12); // Top 12 genres
    
    genreFilters.innerHTML = `
      <button class="genre-pill active" data-genre="">All</button>
      ${popularGenres.map(genre => `
        <button class="genre-pill" data-genre="${genre.mal_id}">${genre.name}</button>
      `).join('')}
    `;
    
    // Add click handlers
    genreFilters.querySelectorAll('.genre-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        // Update active state
        genreFilters.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        // Load anime by genre
        const genreId = pill.dataset.genre;
        if (genreId) {
          currentGenre = parseInt(genreId);
          searchQuery = '';
          searchInput.value = '';
          loadAnimeList(1);
        } else {
          currentGenre = null;
          loadAnimeList(1);
        }
      });
    });
  } catch (error) {
    console.error('Genre load error:', error);
    genreFilters.innerHTML = '<p style="color:var(--color-gray-light)">Genres unavailable</p>';
  }
}

/**
 * Load anime list
 */
async function loadAnimeList(page = 1, append = false) {
  if (isLoading) return;
  
  isLoading = true;
  showLoading(true);
  
  try {
    let anime;
    
    if (searchQuery) {
      anime = await AniSyncAPI.searchAnime(searchQuery, 20);
      hasMore = false; // Search doesn't paginate well
    } else if (currentGenre) {
      anime = await AniSyncAPI.getAnimeByGenre(currentGenre, page, 20);
      hasMore = anime.length === 20;
    } else {
      anime = await AniSyncAPI.getTopAnime(page, 20);
      hasMore = anime.length === 20;
    }
    
    currentPage = page;
    updatePagination();
    
    if (anime.length === 0) {
      if (!append) {
        animeGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
            <p style="font-family: var(--font-comic); font-size: 2rem; color: var(--color-gray-light);">
              No anime found! Try another search! 🔍
            </p>
          </div>
        `;
      }
      return;
    }
    
    const cards = anime
      .map((anime, index) => AniSyncUtils.createAnimeCard(anime, index))
      .join('');
    
    if (append) {
      animeGrid.insertAdjacentHTML('beforeend', cards);
    } else {
      animeGrid.innerHTML = cards;
    }
    
    // Add click handlers to cards
    animeGrid.querySelectorAll('.anime-card').forEach(card => {
      card.addEventListener('click', () => {
        const animeId = card.dataset.animeId;
        window.location.href = `watch.html?anime=${animeId}`;
      });
    });
    
    // Setup lazy loading
    AniSyncUtils.setupLazyLoading();
    
  } catch (error) {
    console.error('Anime list load error:', error);
    showToast('Failed to load anime. Please retry!', 'error');
    
    if (!append && animeGrid.children.length === 0) {
      animeGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
          <p style="font-family: var(--font-comic); font-size: 1.5rem; color: var(--color-accent);">
            Error loading manga! 📚💥
          </p>
          <button class="btn-manga" onclick="loadAnimeList(${page})" style="margin-top: 20px;">
            RETRY
          </button>
        </div>
      `;
    }
  } finally {
    isLoading = false;
    showLoading(false);
  }
}

/**
 * Search anime
 */
const performSearch = AniSyncUtils.debounce(async (query) => {
  searchQuery = query.trim();
  currentGenre = null;
  
  // Reset genre pills
  genreFilters.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
  
  if (searchQuery) {
    showToast(`Searching for "${searchQuery}"...`, 'info', 1500);
  }
  
  await loadAnimeList(1);
}, 500);

/**
 * Update pagination controls
 */
function updatePagination() {
  pageInfo.textContent = `Page ${currentPage}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = !hasMore;
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.classList.toggle('show', show);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search input
  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
  
  // Search button
  searchBtn.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
  
  // Enter key in search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });
  
  // Pagination
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadAnimeList(currentPage - 1);
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    if (hasMore) {
      loadAnimeList(currentPage + 1, true);
    }
  });
  
  // Create room button
  createRoomBtn.addEventListener('click', () => {
    const roomId = AniSyncUtils.generateId(6);
    window.location.href = `room.html?id=${roomId}&host=true`;
  });
  
  // Add ripple effect to buttons
  document.querySelectorAll('.btn-manga, .btn-primary, .btn-secondary').forEach(btn => {
    btn.addEventListener('click', AniSyncUtils.addRipple);
  });
  
  // Infinite scroll (optional)
  window.addEventListener('scroll', AniSyncUtils.throttle(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (hasMore && !isLoading && !searchQuery && !currentGenre) {
        loadAnimeList(currentPage + 1, true);
      }
    }
  }, 500));
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
