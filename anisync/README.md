# 🎬 AniSync - Watch Anime Together

A next-gen anime streaming platform with real-time watch-together rooms, synchronized playback, chat, and a stunning Gen-Z aesthetic UI.

![AniSync](https://via.placeholder.com/1200x400/6366f1/ffffff?text=AniSync+-+Watch+Anime+Together)

## ✨ Features

### Core Features
- **📺 Anime Library Browser** - Browse recent anime with search and genre filters
- **🎥 Video Player** - Custom controls with glassmorphism design
- **👥 Watch-Together Rooms** - Create or join rooms to watch with friends
- **💬 Real-Time Chat** - WebSocket-based chat in watch rooms
- **🎉 Emoji Reactions** - Send floating emoji reactions during playback
- **🔄 Sync Playback** - Host controls sync across all viewers
- **📱 PWA Ready** - Installable on mobile devices with offline support

### Bonus Features
- **Sync Pulse** - Visual waveform animation when host plays/pauses
- **Reaction Storm** - Floating emoji animations
- **Avatar Parade** - User avatars with status indicators
- **Auto-Advance** - Toggle to automatically play next episode
- **Theme Studio** - Customizable accent colors (saved to localStorage)

## 🚀 Quick Start

### Option 1: Local Server (Recommended)
```bash
# Using Python
cd anisync
python -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

### Option 2: Deploy to Netlify/Vercel
1. Push this code to GitHub
2. Connect your repo to Netlify or Vercel
3. Deploy! (No build step needed)

## 📁 Project Structure

```
anisync/
├── index.html          # Home page / Anime library
├── watch.html          # Video player & watch room
├── dashboard.html      # "Who's Watching" active rooms
├── css/
│   └── main.css        # All styles (glassmorphism, animations)
├── js/
│   ├── app.js          # Main app logic
│   ├── room.js         # Room & WebSocket logic
│   └── utils.js        # Utility functions
├── assets/
│   └── icons/          # PWA icons
├── manifest.json       # PWA configuration
├── sw.js               # Service worker
└── README.md           # This file
```

## 🎨 Design System

### Colors
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#ec4899` (Pink)
- **Background**: `#0f0f13` (Deep Dark)
- **Surface**: `rgba(26, 26, 36, 0.7)` (Glass)

### Typography
- Font: Inter (Google Fonts)
- Weights: 400, 500, 600, 700, 800

### Animations
- Page transitions: Fade + slide-up (300ms)
- Hover effects: Scale + glow
- Emoji reactions: Float-up animation
- Sync pulse: Pulsing ring

## 🔐 API Obfuscation (Production Setup)

**IMPORTANT**: The current MVP uses mock data. For production, implement the proxy backend:

### Backend Proxy (Node.js/Express Example)

```javascript
// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Cache for API responses
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Proxy anime list endpoint
app.get('/api/anime/recent', async (req, res) => {
  const page = req.query.page || 1;
  const cacheKey = `anime_recent_${page}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json(cached.data);
  }
  
  try {
    const response = await fetch(
      `https://anikotoapi.site/recent-anime?page=${page}&per_page=20`
    );
    const data = await response.json();
    
    // Cache response
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anime' });
  }
});

// Proxy stream endpoint (wrapper approach)
app.post('/api/stream/:episodeId', async (req, res) => {
  const { episodeId } = req.params;
  const { sub = 'sub' } = req.body;
  
  try {
    // Fetch real embed URL server-side
    const embedUrl = await getEmbedUrl(episodeId, sub);
    
    // Return wrapper HTML that injects iframe via JS
    res.send(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="player-wrapper"></div>
        <script>
          setTimeout(() => {
            const src = atob('${Buffer.from(embedUrl).toString('base64')}');
            document.getElementById('player-wrapper').innerHTML = 
              '<iframe src="'+src+'" frameborder="0" allowfullscreen></iframe>';
          }, 500);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Stream unavailable');
  }
});

async function getEmbedUrl(episodeId, type) {
  // Implement actual API call to get MegaPlay URL
  // This hides the source from frontend inspection
  const response = await fetch(`https://anikotoapi.site/anime/${episodeId}`);
  const data = await response.json();
  return data.streamUrl; // Extract actual stream URL
}

app.listen(PORT, () => {
  console.log(`🎬 AniSync API running on port ${PORT}`);
});
```

### Cloudflare Worker Alternative

```javascript
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/anime')) {
    // Proxy to Anikoto API
    const apiUrl = url.pathname.replace('/api', 'https://anikotoapi.site');
    const response = await fetch(apiUrl);
    
    // Cache for 1 hour
    const newResponse = new Response(await response.text(), response);
    newResponse.headers.set('Cache-Control', 'public, max-age=3600');
    return newResponse;
  }
  
  // Serve static assets from KV storage or origin
  return fetch(request);
}
```

## 🧪 Testing Watch-Together

The MVP uses **localStorage events** to simulate WebSocket communication between tabs:

1. Open `index.html` in two browser tabs
2. In Tab 1: Click an anime → Create Room
3. Copy the invite link
4. In Tab 2: Paste the link → Join Room
5. Play/Pause in Tab 1 → See sync in Tab 2!

## 📱 PWA Installation

### Chrome/Edge
1. Visit the site
2. Look for install icon in address bar
3. Click "Install"

### Safari (iOS)
1. Tap Share button
2. Scroll to "Add to Home Screen"
3. Tap "Add"

## 🛠️ Development

### Adding New Features

1. **New Pages**: Create `.html` file, import modules
2. **New Styles**: Add to `css/main.css` following BEM-ish naming
3. **New Utils**: Add to `js/utils.js` as exported functions
4. **State Management**: Use the `state` object in `app.js`

### Best Practices

- ✅ Use CSS custom properties for theming
- ✅ Modular ES6 imports/exports
- ✅ Mobile-first responsive design
- ✅ Accessibility (keyboard navigation, ARIA)
- ✅ Performance (lazy loading, caching)

## 🚫 Current Limitations (MVP)

- ❌ No real backend (uses localStorage for rooms)
- ❌ Mock video streams (YouTube placeholder)
- ❌ No user authentication
- ❌ Client-side filtering only
- ❌ No persistent user data

## 📈 Roadmap

- [ ] Real WebSocket server (Socket.io)
- [ ] Backend proxy for API calls
- [ ] User profiles & preferences
- [ ] Room persistence (Redis)
- [ ] Video quality selection
- [ ] Subtitle support
- [ ] Mobile app (React Native)

## 📄 License

MIT License - Feel free to use for personal or commercial projects!

## 🙏 Credits

- Design inspiration: Gen-Z aesthetics, glassmorphism trend
- Fonts: Inter by Rasmus Andersson
- Icons: Material Design Icons

---

Made with ❤️ for anime fans everywhere

**✨ Enjoy watching together!**
