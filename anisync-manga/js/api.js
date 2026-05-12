/* ===================================
   ANISYNC - API Integration
   PRIMARY: Anikoto API (https://anikotoapi.site)
   FALLBACK: Jikan API for metadata
   =================================== */

const ANIKOTO_API = 'https://anikotoapi.site';
const JIKAN_API = 'https://api.jikan.moe/v4';

// Cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with caching and retry logic
 */
async function fetchWithCache(url, cacheKey = null) {
  const key = cacheKey || url;
  const cached = apiCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📖 Using cached data:', key);
    return cached.data;
  }
  
  console.log('🔍 Fetching from API:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    apiCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Try to return cached data even if expired
    if (cached) {
      console.log('⚠️ Returning stale cached data');
      return cached.data;
    }
    
    throw error;
  }
}

/**
 * Fetch recent anime from Anikoto API (PRIMARY)
 */
async function getTopAnime(page = 1, limit = 50) {
  const url = `${ANIKOTO_API}/recent-anime?page=${page}&per_page=${limit}`;
  const data = await fetchWithCache(url, `anikoto_recent_p${page}`);
  return data.data || data.results || [];
}

/**
 * Search anime by query using Anikoto
 */
async function searchAnime(query, limit = 20) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `${ANIKOTO_API}/anime/search?q=${encodedQuery}`;
  const data = await fetchWithCache(url, `anikoto_search_${encodedQuery}`);
  return data.data || data.results || [];
}

/**
 * Get anime by genre
 */
async function getAnimeByGenre(genreId, page = 1, limit = 20) {
  const url = `${JIKAN_API}/anime?genres=${genreId}&limit=${limit}&page=${page}`;
  const data = await fetchWithCache(url, `genre_${genreId}_p${page}`);
  return data.data || [];
}

/**
 * Get anime details from Anikoto API (returns episodes with embed IDs)
 */
async function getAnimeDetails(anikotoId) {
  const url = `${ANIKOTO_API}/series/${anikotoId}`;
  const data = await fetchWithCache(url, `anikoto_series_${anikotoId}`);
  
  if (data.data && data.data.anime) {
    return {
      ...data.data.anime,
      episodes: data.data.episodes || []
    };
  }
  return null;
}

/**
 * Get anime episodes (already included in getAnimeDetails)
 */
async function getAnimeEpisodes(malId, page = 1) {
  console.warn('getAnimeEpisodes is deprecated - use getAnimeDetails instead');
  return [];
}

/**
 * Get available genres
 */
async function getGenres() {
  const url = `${JIKAN_API}/genres/anime`;
  const data = await fetchWithCache(url, 'genres');
  return data.data || [];
}

/**
 * Get seasonal anime
 */
async function getSeasonalAnime() {
  const url = `${JIKAN_API}/seasons/now?limit=50`;
  const data = await fetchWithCache(url, 'seasonal');
  return data.data || [];
}

/**
 * Get random anime for featured section
 */
async function getRandomAnime(count = 3) {
  const topAnime = await getTopAnime(1, 50);
  const shuffled = topAnime.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Format anime data for display
 */
function formatAnimeData(anime) {
  return {
    id: anime.id,
    title: anime.title || 'Unknown',
    image: anime.image || anime.poster,
    episodes: anime.episodes || '?',
    score: anime.score || 0,
    genres: anime.genres || []
  };
}

/**
 * Clear API cache
 */
function clearCache() {
  apiCache.clear();
  console.log('🗑️ Cache cleared');
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return {
    size: apiCache.size,
    entries: Array.from(apiCache.keys())
  };
}

// Export functions
window.AniSyncAPI = {
  getTopAnime,
  searchAnime,
  getAnimeByGenre,
  getAnimeDetails,
  getAnimeEpisodes,
  getGenres,
  getSeasonalAnime,
  getRandomAnime,
  formatAnimeData,
  clearCache,
  getCacheStats
};
