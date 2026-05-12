// ============================================
// AniSync - Main Application Logic
// ============================================

import { 
  generateRoomId, 
  debounce, 
  Cache, 
  showToast, 
  copyToClipboard,
  formatEpisodeNumber
} from './utils.js';

// State management
const state = {
  animeList: [],
  filteredAnime: [],
  currentAnime: null,
  currentEpisode: null,
  searchQuery: '',
  activeFilters: [],
  isDarkMode: true
};

// DOM Elements
const elements = {
  animeGrid: null,
  searchInput: null,
  filterChips: null,
  loadingSpinner: null
};

// Initialize app
export async function init() {
  console.log('🎬 AniSync initializing...');
  
  // Cache DOM elements
  elements.animeGrid = document.getElementById('anime-grid');
  elements.searchInput = document.getElementById('search-input');
  elements.filterChips = document.getElementById('filter-chips');
  elements.loadingSpinner = document.getElementById('loading-spinner');
  
  // Setup event listeners
  setupEventListeners();
  
  // Load anime list
  await loadAnimeList();
  
  // Apply any saved preferences
  applyUserPreferences();
  
  console.log('✅ AniSync ready!');
}

// Setup all event listeners
function setupEventListeners() {
  // Search with debounce
  if (elements.searchInput) {
    const debouncedSearch = debounce(handleSearch, 300);
    elements.searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  }
  
  // Filter chips
  if (elements.filterChips) {
    elements.filterChips.addEventListener('click', handleFilterClick);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Load anime list from API
async function loadAnimeList() {
  showLoading(true);
  
  try {
    // Try to load from cache first
    const cachedData = Cache.get('anime_list_page_1');
    
    if (cachedData) {
      state.animeList = cachedData.results || cachedData;
      state.filteredAnime = [...state.animeList];
      renderAnimeGrid(state.filteredAnime);
      showLoading(false);
      return;
    }
    
    // Fetch from our proxy endpoint (in production, this would be your backend)
    // For MVP, we'll use the direct API but in production this should be proxied
    const response = await fetch('/api/anime/recent?page=1');
    
    if (!response.ok) {
      throw new Error('Failed to fetch anime list');
    }
    
    const data = await response.json();
    state.animeList = data.results || data;
    state.filteredAnime = [...state.animeList];
    
    // Cache the data
    Cache.set('anime_list_page_1', data, 60);
    
    renderAnimeGrid(state.filteredAnime);
  } catch (error) {
    console.error('Error loading anime:', error);
    showError('Failed to load anime list. Please try again.');
    // Load mock data for demo
    loadMockData();
  } finally {
    showLoading(false);
  }
}

// Load mock data for demo purposes
function loadMockData() {
  state.animeList = [
    {
      id: '1',
      title: 'Demon Slayer: Kimetsu no Yaiba',
      poster: 'https://via.placeholder.com/300x450/6366f1/ffffff?text=Demon+Slayer',
      episodeCount: 26,
      rating: 9.2,
      genres: ['Action', 'Fantasy']
    },
    {
      id: '2',
      title: 'Attack on Titan',
      poster: 'https://via.placeholder.com/300x450/ec4899/ffffff?text=Attack+on+Titan',
      episodeCount: 75,
      rating: 9.5,
      genres: ['Action', 'Drama']
    },
    {
      id: '3',
      title: 'Jujutsu Kaisen',
      poster: 'https://via.placeholder.com/300x450/10b981/ffffff?text=Jujutsu+Kaisen',
      episodeCount: 24,
      rating: 9.0,
      genres: ['Action', 'Supernatural']
    },
    {
      id: '4',
      title: 'One Piece',
      poster: 'https://via.placeholder.com/300x450/f59e0b/ffffff?text=One+Piece',
      episodeCount: 1000,
      rating: 9.3,
      genres: ['Adventure', 'Comedy']
    },
    {
      id: '5',
      title: 'My Hero Academia',
      poster: 'https://via.placeholder.com/300x450/ef4444/ffffff?text=My+Hero',
      episodeCount: 113,
      rating: 8.8,
      genres: ['Action', 'Superhero']
    },
    {
      id: '6',
      title: 'Chainsaw Man',
      poster: 'https://via.placeholder.com/300x450/8b5cf6/ffffff?text=Chainsaw+Man',
      episodeCount: 12,
      rating: 8.9,
      genres: ['Action', 'Horror']
    },
    {
      id: '7',
      title: 'Spy x Family',
      poster: 'https://via.placeholder.com/300x450/06b6d4/ffffff?text=Spy+x+Family',
      episodeCount: 25,
      rating: 9.1,
      genres: ['Comedy', 'Slice of Life']
    },
    {
      id: '8',
      title: 'Tokyo Revengers',
      poster: 'https://via.placeholder.com/300x450/84cc16/ffffff?text=Tokyo+Revengers',
      episodeCount: 24,
      rating: 8.5,
      genres: ['Action', 'Drama']
    }
  ];
  
  state.filteredAnime = [...state.animeList];
  renderAnimeGrid(state.filteredAnime);
}

// Render anime grid
function renderAnimeGrid(animeList) {
  if (!elements.animeGrid) return;
  
  if (animeList.length === 0) {
    elements.animeGrid.innerHTML = `
      <div class="text-center" style="grid-column: 1/-1; padding: 4rem;">
        <h3>No anime found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }
  
  elements.animeGrid.innerHTML = animeList.map(anime => `
    <div class="anime-card page-transition" data-id="${anime.id}" data-title="${anime.title}">
      <img 
        class="anime-poster" 
        src="${anime.poster}" 
        alt="${anime.title}"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/300x450/1a1a2e/6366f1?text=No+Image'"
      >
      <div class="anime-info">
        <h3 class="anime-title">${anime.title}</h3>
        <div class="anime-meta">
          <span>${anime.episodeCount} episodes</span>
          <span class="anime-rating">⭐ ${anime.rating}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add click handlers to cards
  document.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', () => {
      const animeId = card.dataset.id;
      const animeTitle = card.dataset.title;
      navigateToAnimeDetail(animeId, animeTitle);
    });
  });
}

// Handle search
function handleSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  applyFilters();
}

// Handle filter chip clicks
function handleFilterClick(e) {
  if (!e.target.classList.contains('filter-chip')) return;
  
  const genre = e.target.dataset.genre;
  
  if (state.activeFilters.includes(genre)) {
    state.activeFilters = state.activeFilters.filter(f => f !== genre);
    e.target.classList.remove('active');
  } else {
    state.activeFilters.push(genre);
    e.target.classList.add('active');
  }
  
  applyFilters();
}

// Apply search and filters
function applyFilters() {
  let filtered = [...state.animeList];
  
  // Apply search filter
  if (state.searchQuery) {
    filtered = filtered.filter(anime => 
      anime.title.toLowerCase().includes(state.searchQuery)
    );
  }
  
  // Apply genre filters
  if (state.activeFilters.length > 0) {
    filtered = filtered.filter(anime => 
      anime.genres && anime.genres.some(g => state.activeFilters.includes(g))
    );
  }
  
  state.filteredAnime = filtered;
  renderAnimeGrid(state.filteredAnime);
}

// Navigate to anime detail page
function navigateToAnimeDetail(animeId, title) {
  // In a real app, this would navigate to a detail page
  // For MVP, we'll store in sessionStorage and redirect
  sessionStorage.setItem('selectedAnime', JSON.stringify({ id: animeId, title }));
  window.location.href = 'watch.html?id=' + animeId;
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Focus search on '/' key
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    elements.searchInput?.focus();
  }
}

// Show/hide loading spinner
function showLoading(isLoading) {
  if (!elements.loadingSpinner) return;
  
  if (isLoading) {
    elements.loadingSpinner.classList.remove('hidden');
  } else {
    elements.loadingSpinner.classList.add('hidden');
  }
}

// Show error message
function showError(message) {
  showToast(message, 'error');
}

// Apply user preferences from localStorage
function applyUserPreferences() {
  const savedTheme = localStorage.getItem('anisync_theme_primary');
  if (savedTheme) {
    document.documentElement.style.setProperty('--primary', savedTheme);
  }
}

// Create watch-together room
export function createRoom(animeId, episodeId) {
  const roomId = generateRoomId();
  const roomData = {
    id: roomId,
    animeId,
    episodeId,
    host: 'You',
    createdAt: Date.now(),
    viewers: 1,
    isActive: true
  };
  
  // Store room info
  localStorage.setItem(`room_${roomId}`, JSON.stringify(roomData));
  
  // Add to active rooms list
  const activeRooms = JSON.parse(localStorage.getItem('active_rooms') || '[]');
  activeRooms.push(roomData);
  localStorage.setItem('active_rooms', JSON.stringify(activeRooms));
  
  return roomId;
}

// Get all active rooms
export function getActiveRooms() {
  const rooms = JSON.parse(localStorage.getItem('active_rooms') || '[]');
  // Filter out old rooms (older than 2 hours)
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  const activeRooms = rooms.filter(r => r.createdAt > twoHoursAgo && r.isActive);
  return activeRooms;
}

// Join a room
export function joinRoom(roomId) {
  const roomData = localStorage.getItem(`room_${roomId}`);
  if (!roomData) {
    showToast('Room not found', 'error');
    return null;
  }
  
  const room = JSON.parse(roomData);
  room.viewers = (room.viewers || 0) + 1;
  localStorage.setItem(`room_${roomId}`, JSON.stringify(room));
  
  // Update active rooms list
  const activeRooms = getActiveRooms();
  const roomIndex = activeRooms.findIndex(r => r.id === roomId);
  if (roomIndex !== -1) {
    activeRooms[roomIndex] = room;
    localStorage.setItem('active_rooms', JSON.stringify(activeRooms));
  }
  
  return room;
}

export default {
  init,
  createRoom,
  getActiveRooms,
  joinRoom
};
