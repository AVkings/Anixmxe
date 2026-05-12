# AniSync Testing Guide

## Server Status
- Running at: http://localhost:8080

## Test Cases

### 1. Homepage (index.html)
- Open http://localhost:8080
- Should load 20+ anime cards from Anikoto API
- Hero section shows 3 featured anime
- Genre filters work
- Search works

### 2. Watch Page (watch.html)
- Click any anime card
- Redirects to watch.html?anime={id}
- Loads series data from Anikoto API
- Shows episode selector
- Embeds MegaPlay iframe

### 3. Known Working Anime IDs
From Anikoto API testing:
- Liar Game: ID 8717 (6 episodes, embed_id: 169846)
- Frieren S2: ID 8384 
- Witch Hat Atelier: ID 8715

### Important Notes

**MegaPlay Status:**
- MegaPlay.buzz returns 410 errors for many streams
- This means videos were deleted or removed due to copyright
- The API integration is CORRECT but the source content may be unavailable

**Solution Options:**
1. Try different episodes (some may still work)
2. Use alternative video sources (Consumet, Gogoanime)
3. Wait for Anikoto to update their embed URLs

## Debugging

Open browser console (F12) and check:
1. Network tab - API responses
2. Console logs - detailed error messages
3. Look for "✅" success messages vs "❌" errors

## Expected Flow

1. Homepage loads → fetches from anikotoapi.site/recent-anime
2. Click anime → watch.html?anime={anikoto_id}
3. Watch page → fetches from anikotoapi.site/series/{id}
4. Gets episodes with embed_url.sub/dub
5. Embeds iframe with megaplay.buzz URL
6. Video should play (or show 410 if removed)
