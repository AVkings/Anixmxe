# ✨ AniSync - Manga-Styled Anime Streaming Platform

**A fully functional, no-login-required anime streaming platform with watch-together rooms, real-time chat, and a stunning manga/comic aesthetic.**

🔗 **Live Demo**: Open `index.html` in your browser (via local server)

---

## 🚀 Quick Start

### Option 1: Python Server (Recommended)
```bash
cd anisync-manga
python3 -m http.server 8080
```

### Option 2: Node.js Server
```bash
cd anisync-manga
npx serve .
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

**Then visit**: `http://localhost:8080`

> ⚠️ **Important**: Do NOT open HTML files directly (file:// protocol). You must use a web server for the API calls and PWA features to work.

---

## 📺 Video Streaming - How It Works

AniSync uses the **Anikoto API + MegaPlay** for video streaming:

### API Flow:
1. **Browse Anime**: Fetches from Jikan API (MyAnimeList database)
2. **Get Episodes**: Calls `https://anikotoapi.site/series/{id}` to get episode list
3. **Stream Video**: Constructs MegaPlay URL: `https://megaplay.buzz/stream/s-2/{episode_embed_id}/{language}`
4. **Embed Player**: Injects iframe with postMessage event handling for sync

### Supported Languages:
- **Sub** (Japanese with subtitles) - Primary
- **Dub** (English dubbed) - Fallback

### API Endpoints Used:

| Purpose | Endpoint |
|---------|----------|
| Browse Anime | `https://api.jikan.moe/v4/top/anime` |
| Search Anime | `https://api.jikan.moe/v4/anime?q={query}` |
| Get Episodes | `https://anikotoapi.site/series/{id}` |
| Stream Video | `https://megaplay.buzz/stream/s-2/{embed_id}/{sub|dub}` |

---

## 🎯 Features

### ✅ Core Features
- **Anime Library Browser** - 50+ anime with search & genre filters
- **Video Player** - Embedded MegaPlay player with custom controls
- **Episode Selector** - Dropdown to switch episodes
- **Auto-Next Episode** - Toggle for automatic progression
- **Watch-Together Rooms** - Create/join rooms with unique URLs
- **Real-Time Chat** - Cross-tab communication via localStorage
- **Emoji Reactions** - Floating emoji animations
- **Playback Sync** - Host controls sync to all clients
- **Who's Watching Dashboard** - See active rooms

### 🎨 Manga/Comic Aesthetic
- Thick black borders (4px solid #000)
- Hard shadows (8px 8px 0px #000)
- Halftone pattern overlay
- Comic fonts (Bangers, Comic Neue, M PLUS 1p)
- Page turn animations
- Speed lines on hover
- Speech bubble notifications

### 📱 PWA Ready
- Installable on mobile devices
- Offline support for static assets
- Responsive design (mobile-first)

---

## 🗂️ Project Structure

```
anisync-manga/
├── index.html          # Homepage with anime grid
├── watch.html          # Video player page
├── dashboard.html      # Active rooms view
├── manifest.json       # PWA configuration
├── sw.js               # Service worker
├── css/
│   ├── main.css        # Base styles & variables
│   ├── components.css  # Reusable components
│   └── animations.css  # Animations & effects
├── js/
│   ├── api.js          # Jikan + Anikoto API integration
│   ├── app.js          # Homepage logic
│   ├── player.js       # Video player (MegaPlay integration)
│   ├── dashboard.js    # Active rooms logic
│   └── utils.js        # Utility functions
└── README.md           # This file
```

---

## 🔧 Configuration

### Change Accent Color
Edit `css/main.css`:
```css
:root {
  --color-accent: #ff0040; /* Change this */
}
```

### Adjust Cache Duration
Edit `js/player.js`:
```javascript
// Change from 5 minutes to desired duration
if (Date.now() - timestamp < 5 * 60 * 1000) {
```

---

## 🐛 Troubleshooting

### Video Not Playing?

1. **Check Console Logs** - Press F12 → Console tab
   - Look for errors like "API returned 404" or "No episode embed ID"
   
2. **Try Different Episode** - Some episodes may not be available
   
3. **Switch Sub/Dub** - Auto-fallback is built-in
   
4. **Clear Cache** - Run in console:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

5. **Check Internet** - APIs require connection

### CORS Errors?

Make sure you're using a **web server**, not opening files directly:
- ❌ `file:///C:/Users/.../index.html`
- ✅ `http://localhost:8080`

### API Rate Limited?

Anikoto/Jikan have rate limits. Wait a few minutes or:
- Use cached data (automatically cached for 5 min)
- Try a different anime

### Room Sync Not Working?

- Open rooms in **different tabs** of the same browser
- localStorage sync only works within same browser
- For cross-device sync, you'd need a WebSocket server

---

## 🔐 Security Notes

### Current Implementation:
- Basic iframe sandboxing
- Origin verification for postMessage events
- No user authentication (by design)

### For Production:
1. **Backend Proxy** - Route API calls through your server
2. **Rate Limiting** - Prevent abuse
3. **HTTPS** - Required for production
4. **CORS Headers** - Configure properly

Example Cloudflare Worker proxy:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const apiUrl = url.pathname.replace('/api/', 'https://anikotoapi.site/');
  
  const response = await fetch(apiUrl);
  return new Response(response.body, {
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

---

## 📊 API Limits

| API | Limit | Notes |
|-----|-------|-------|
| Jikan | 3 requests/sec | No API key needed |
| Anikoto | Unknown | Free tier |
| MegaPlay | Unknown | Embed-only access |

---

## 🎨 Customization

### Add More Fonts
Edit `watch.html` / `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=YOUR_FONT" rel="stylesheet">
```

### Modify Manga Panel Style
Edit `css/components.css`:
```css
.manga-panel {
  border: 4px solid #000;
  box-shadow: 8px 8px 0px #000;
  /* Adjust values */
}
```

### Add New Genres
Edit `js/app.js`:
```javascript
const GENRES = [
  { id: 1, name: 'Action', icon: '⚔️' },
  { id: 2, name: 'Adventure', icon: '🗡️' },
  // Add more...
];
```

---

## 🚀 Deployment

### Netlify
1. Drag & drop `anisync-manga` folder to netlify.com/drop
2. Done!

### Vercel
```bash
npm i -g vercel
vercel deploy
```

### GitHub Pages
1. Push to GitHub repo
2. Settings → Pages → Select branch
3. Visit `yourusername.github.io/repo-name`

---

## 📝 Legal Disclaimer

This project is for **educational purposes only**. 

- We don't host any video content
- All streams are embedded from third-party sources
- Respect copyright laws in your country
- Remove if requested by rights holders

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- [ ] WebSocket backend for cross-device room sync
- [ ] User preferences (theme, quality)
- [ ] Download for offline viewing
- [ ] Better error handling
- [ ] More video sources

---

## 📞 Support

Found a bug? Have questions?

1. Check console logs (F12)
2. Clear localStorage
3. Try different anime/episode
4. Report issues with details

---

**Made with ❤️ for manga lovers** 📚✨

*AniSync - Read anime like manga!*
