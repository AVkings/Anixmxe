/* ===================================
   ANISYNC - API Integration
   Jikan API (MyAnimeList) + Consumet
   =================================== */

const JIKAN_API = 'https://api.jikan.moe/v4';
const CONSUMET_API = 'https://api.consumet.org';

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
 * Get top anime from Jikan API
 */
async function getTopAnime(page = 1, limit = 50) {
  const url = `${JIKAN_API}/top/anime?limit=${limit}&page=${page}`;
  const data = await fetchWithCache(url, `top_anime_p${page}`);
  return data.data || [];
}

/**
 * Search anime by query
 */
async function searchAnime(query, limit = 20) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const encodedQuery = encodeURIComponent(query.trim());
  const url = `${JIKAN_API}/anime?q=${encodedQuery}&limit=${limit}`;
  const data = await fetchWithCache(url, `search_${encodedQuery}`);
  return data.data || [];
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
 * Get anime details including episodes
 */
async function getAnimeDetails(malId) {
  const url = `${JIKAN_API}/anime/${malId}/full`;
  const data = await fetchWithCache(url, `anime_${malId}`);
  return data.data || null;
}

/**
 * Get anime episodes
 */
async function getAnimeEpisodes(malId, page = 1) {
  const url = `${JIKAN_API}/anime/${malId}/episodes?page=${page}`;
  const data = await fetchWithCache(url, `episodes_${malId}_p${page}`);
  return data.data || [];
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
 * Search anime on Consumet for streaming
 */
async function searchAnimeForStreaming(query) {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `${CONSUMET_API}/anime/gogoanime/${encodedQuery}`;
    const data = await fetchWithCache(url, `consumet_search_${encodedQuery}`);
    return data.results || [];
  } catch (error) {
    console.error('Consumet search error:', error);
    return [];
  }
}

/**
 * Get episode stream URL from Consumet
 */
async function getEpisodeStream(animeId, episodeNum = 1) {
  try {
    // First, search for the anime
    const searchResults = await searchAnimeForStreaming(animeId);
    
    if (searchResults.length === 0) {
      throw new Error('Anime not found on Consumet');
    }
    
    const anime = searchResults[0];
    const episodeId = anime.episodes?.[episodeNum - 1]?.id;
    
    if (!episodeId) {
      throw new Error('Episode not found');
    }
    
    // Get stream URL
    const url = `${CONSUMET_API}/anime/gogoanime/watch/${episodeId}`;
    const data = await fetchWithCache(url, `stream_${episodeId}`);
    
    return {
      sources: data.sources || [],
      subtitles: data.subtitles || []
    };
  } catch (error) {
    console.error('Stream error:', error);
    return null;
  }
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
    id: anime.mal_id,
    title: anime.title_english || anime.title,
    titleJapanese: anime.title,
    image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    coverImage: anime.images?.jpg?.large_image_url,
    episodes: anime.episodes || '?',
    score: anime.score || 0,
    rating: anime.rating || 'N/A',
    genres: anime.genres?.map(g => g.name) || [],
    synopsis: anime.synopsis || 'No description available.',
    status: anime.status || 'Unknown',
    year: anime.year || 'Unknown',
    trailer: anime.trailer?.embed_url
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
  searchAnimeForStreaming,
  getEpisodeStream,
  getRandomAnime,
  formatAnimeData,
  clearCache,
  getCacheStats
};
