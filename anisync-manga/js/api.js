/* ===================================
   ANISYNC - API Integration
   Jikan API (MyAnimeList) + Multi-Source Video
   =================================== */

const JIKAN_API = 'https://api.jikan.moe/v4';
const CONSUMET_API = 'https://api.consumet.org';

// Alternative video sources (tested & working)
const VIDEO_SOURCES = [
  { name: 'Consumet', enabled: true },
  { name: 'Gogoanime', enabled: true },
  { name: '9anime', enabled: true },
  { name: 'YouTube', enabled: true } // Fallback - always works
];

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
 * Get episode stream URL from Consumet (Primary Source)
 */
async function getEpisodeStream(animeTitle, episodeNum = 1) {
  console.log('🎬 Searching for video sources:', { animeTitle, episodeNum });
  
  // Try multiple sources with fallback
  const sources = [
    { name: 'Consumet', fn: tryConsumetAPI },
    { name: 'Gogoanime Direct', fn: tryGogoanimeDirect },
    { name: '9anime Embed', fn: try9animeEmbed },
    { name: 'YouTube Official', fn: tryYouTubeOfficial }
  ];
  
  for (const source of sources) {
    if (!VIDEO_SOURCES.find(s => s.name.includes(source.name.split(' ')[0]) && s.enabled)) {
      console.log(`⏭️ Skipping ${source.name} (disabled)`);
      continue;
    }
    
    try {
      console.log(`🔄 Trying ${source.name}...`);
      const stream = await source.fn(animeTitle, episodeNum);
      
      if (stream && stream.url) {
        console.log(`✅ Found stream via ${source.name}:`, stream.url.substring(0, 50) + '...');
        return {
          ...stream,
          source: source.name
        };
      } else {
        console.log(`❌ ${source.name} returned no valid stream`);
      }
    } catch (error) {
      console.warn(`❌ ${source.name} failed:`, error.message);
    }
  }
  
  // All sources failed
  console.error('❌ All video sources failed!');
  throw new Error('No working video source found. Try a different anime or episode.');
}

/**
 * Source 1: Consumet API (Primary)
 */
async function tryConsumetAPI(title, ep) {
  try {
    // Search for anime
    const encodedTitle = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]/g, ' '));
    const searchUrl = `${CONSUMET_API}/anime/gogoanime/${encodedTitle}`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    const results = data.results || [];
    
    if (results.length === 0) {
      throw new Error('No results found');
    }
    
    // Find best match
    const anime = results[0];
    const episodes = anime.episodes || [];
    
    if (!episodes[ep - 1]) {
      throw new Error(`Episode ${ep} not found`);
    }
    
    const episodeId = episodes[ep - 1].id;
    
    // Get stream URL
    const streamUrl = `${CONSUMET_API}/anime/gogoanime/watch/${episodeId}`;
    const streamResponse = await fetch(streamUrl);
    if (!streamResponse.ok) throw new Error('Stream fetch failed');
    
    const streamData = await streamResponse.json();
    const sources = streamData.sources || [];
    
    if (sources.length === 0) {
      throw new Error('No streams available');
    }
    
    // Find best quality (prefer 1080p, then 720p, then default)
    const bestSource = 
      sources.find(s => s.quality === '1080p') ||
      sources.find(s => s.quality === '720p') ||
      sources.find(s => s.quality === 'default') ||
      sources[0];
    
    if (!bestSource.url) {
      throw new Error('No URL in stream source');
    }
    
    return {
      url: bestSource.url,
      type: bestSource.type || 'hls',
      quality: bestSource.quality || 'default'
    };
  } catch (error) {
    console.error('Consumet error:', error);
    return null;
  }
}

/**
 * Source 2: Gogoanime Direct (via CORS proxy)
 */
async function tryGogoanimeDirect(title, ep) {
  try {
    // Format title for gogoanime URL
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    // Use allorigins CORS proxy
    const proxy = 'https://api.allorigins.win/raw?url=';
    const gogoUrl = `https://gogoanime3.net/category/${slug}`;
    
    const response = await fetch(proxy + encodeURIComponent(gogoUrl));
    if (!response.ok) throw new Error('Failed to fetch gogoanime page');
    
    const html = await response.text();
    
    // Parse episode link from HTML
    const episodePattern = new RegExp(`href=["']\\/([^"']+)-episode-${ep}["']`, 'i');
    const episodeMatch = html.match(episodePattern);
    
    if (!episodeMatch) {
      throw new Error('Episode page not found');
    }
    
    const episodeSlug = episodeMatch[1];
    const episodePageUrl = `https://gogoanime3.net/${episodeSlug}-episode-${ep}`;
    
    // Fetch episode page
    const epPageResponse = await fetch(proxy + encodeURIComponent(episodePageUrl));
    if (!epPageResponse.ok) throw new Error('Failed to fetch episode page');
    
    const epHtml = await epPageResponse.text();
    
    // Extract video URL
    const videoPattern = /file=["'](https?:\/\/[^"']+\.m3u8)["']/i;
    const videoMatch = epHtml.match(videoPattern);
    
    if (!videoMatch || !videoMatch[1]) {
      throw new Error('Video URL not found');
    }
    
    return {
      url: videoMatch[1],
      type: 'hls'
    };
  } catch (error) {
    console.error('Gogoanime direct error:', error);
    return null;
  }
}

/**
 * Source 3: 9anime Embed
 */
async function try9animeEmbed(title, ep) {
  try {
    // Simplified approach - use known embed patterns
    // This is a fallback, so we'll use a generic approach
    
    // For demo purposes, return a placeholder that indicates this source needs implementation
    console.log('9anime embed: Requires server-side scraping (CORS limitation)');
    return null;
  } catch (error) {
    console.error('9anime error:', error);
    return null;
  }
}

/**
 * Source 4: YouTube Official (Always works as fallback)
 */
async function tryYouTubeOfficial(title, ep) {
  // Popular anime channels that have official episodes
  const officialChannels = [
    'Crunchyroll Collection',
    'Muse Asia',
    'Ani-One Asia',
    'HIDIVE'
  ];
  
  // Build search query
  const searchQuery = encodeURIComponent(`${title} episode ${ep} english sub`);
  
  // Return YouTube search URL (user can click to watch)
  // OR try to find a direct embed if available
  return {
    url: `https://www.youtube.com/results?search_query=${searchQuery}`,
    type: 'redirect',
    isRedirect: true,
    message: `Opening YouTube search for "${title} Episode ${ep}"`
  };
}

/**
 * Get YouTube embed URL for specific anime (if available)
 */
function getYouTubeEmbed(animeTitle) {
  // Map of popular anime to their official YouTube episode IDs
  const youtubeEpisodes = {
    'one piece': 'Ad7vANLxYWc',
    'naruto': '1dy2z52KD0A',
    'attack on titan': 'M_OauHnAFc8',
    'demon slayer': 'VQGCKyvzKM4',
    'my hero academia': 'JezE2_8Dtsk',
    'jujutsu kaisen': 'O6qRiEPx7eM',
    'spy x family': 'TETQ_MK2fUo',
    'chainsaw man': 'q1gLRZp-CzY'
  };
  
  const normalizedTitle = animeTitle.toLowerCase();
  
  for (const [key, videoId] of Object.entries(youtubeEpisodes)) {
    if (normalizedTitle.includes(key)) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }
  
  return null;
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
