# 📚 AniSync - Manga-Style Anime Streaming Platform

A beautiful, manga/comic-styled anime streaming platform with watch-together rooms, real-time chat, and stunning UI.

![AniSync Banner](https://img.shields.io/badge/AniSync-Manga%20Streaming-ff0040?style=for-the-badge)

## ✨ Features

### Core Features
- 📖 **Anime Library** - Browse 50+ anime from Jikan API (MyAnimeList)
- 🔍 **Search & Filter** - Real-time search + genre filtering
- 📺 **Video Player** - Stream episodes via Consumet API
- 🎬 **Watch-Together Rooms** - Create rooms, share links, sync playback
- 💬 **Real-Time Chat** - Cross-tab communication with speech bubbles
- 👥 **Dashboard** - See who's watching in active rooms
- 📱 **PWA Ready** - Install on mobile, offline support

### Manga/Comic UI
- 🎨 Thick black borders & comic book styling
- 📰 Halftone patterns & paper texture backgrounds
- ✨ Speed lines, page turn animations
- 💥 Action text effects ("POW!", "BOOM!")
- 📊 Comic font typography (Bangers, Comic Neue)

## 🚀 Quick Start

### Option 1: Python Server
```bash
cd anisync-manga
python -m http.server 8080
# Open http://localhost:8080
```

### Option 2: Node.js Server
```bash
cd anisync-manga
npx serve .
# or
npx http-server -p 8080
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## 📁 Project Structure

```
anisync-manga/
├── index.html          # Home page with anime grid
├── watch.html          # Video player + chat
├── dashboard.html      # Active rooms view
├── manifest.json       # PWA configuration
├── sw.js               # Service worker
├── css/
│   ├── main.css        # Base styles (687 lines)
│   ├── components.css  # Reusable components (424 lines)
│   └── animations.css  # Animations (438 lines)
├── js/
│   ├── api.js          # Jikan + Consumet API integration
│   ├── app.js          # Homepage logic
│   ├── player.js       # Video player + room sync
│   ├── dashboard.js    # Active rooms display
│   └── utils.js        # Utility functions
└── assets/
    ├── icons/          # PWA icons (generate these)
    └── patterns/       # Halftone SVG patterns
```

## 🔧 APIs Used

### Jikan API (Primary - Anime Data)
- **Base URL**: `https://api.jikan.moe/v4`
- **No authentication required**
- **Endpoints**:
  - `/top/anime` - Get top rated anime
  - `/anime?q={query}` - Search anime
  - `/anime/{id}/full` - Get anime details
  - `/genres/anime` - Get available genres

### Consumet API (Streaming)
- **Base URL**: `https://api.consumet.org`
- **Free, open-source streaming API**
- **Endpoints**:
  - `/anime/gogoanime/{query}` - Search for streams
  - `/anime/gogoanime/watch/{episodeId}` - Get stream URL

## 🎨 Design System

### Colors
```css
--color-black: #000000
--color-white: #ffffff
--color-paper: #f5f5f0
--color-accent: #ff0040 (Vibrant Red)
--color-highlight: #ffd700 (Gold)
```

### Fonts
- **Headers**: Bangers (comic book style)
- **Body**: Comic Neue (readable comic font)
- **Japanese**: M PLUS 1p (clean sans-serif)

### Borders & Shadows
- **Thick Border**: 4px solid black
- **Hard Shadow**: 8px 8px 0px black
- **Hover Shadow**: 10px 10px 0px black

## 📱 PWA Installation

### Generate Icons
Use [PWA Icon Generator](https://realfavicongenerator.net/) to create icons:
```
assets/icons/icon-72.png
assets/icons/icon-96.png
assets/icons/icon-128.png
assets/icons/icon-144.png
assets/icons/icon-152.png
assets/icons/icon-192.png
assets/icons/icon-384.png
assets/icons/icon-512.png
```

### Install on Mobile
1. Open site in Chrome/Safari
2. Tap "Add to Home Screen"
3. Launch from home screen!

## 🎯 How to Use

### Browse Anime
1. Open `index.html`
2. Scroll through the manga-style grid
3. Click any card to watch

### Watch Together
1. Click an anime card
2. Click "Create Watch Room"
3. Copy the URL and share with friends
4. Everyone joins → Host controls playback!

### Join Existing Room
1. Go to "Who's Reading" dashboard
2. Click any active room
3. Join and start watching together!

## 🔐 Security Notes

### Current Implementation
- Basic right-click/F12 deterrent
- Sandbox attributes on iframes
- Input sanitization for chat

### Production Recommendations
1. **Backend Proxy**: Set up a server to proxy API requests
2. **Rate Limiting**: Implement request throttling
3. **CORS**: Configure proper CORS headers
4. **HTTPS**: Always use HTTPS in production

### Example Backend Proxy (Node.js)
```javascript
// server.js
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/api/anime/top', async (req, res) => {
  const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=50');
  const data = await response.json();
  res.json(data);
});

app.listen(3000);
```

## 🐛 Troubleshooting

### "Failed to load anime list"
- Check internet connection
- Jikan API may be rate limiting (wait 1 minute)
- API is cached for 5 minutes - clear cache if needed

### "Video unavailable"
- Some anime may not be available on Consumet
- Try a different episode or anime
- Fallback shows YouTube trailer if available

### CORS Errors
- **Must use a web server** (not file:// protocol)
- Use Python: `python -m http.server 8080`
- Or Node.js: `npx serve .`

### PWA Not Installing
- Must be served over HTTPS (or localhost)
- Check manifest.json is valid
- Ensure service worker is registered

## 📊 Performance

### Optimizations Implemented
- ✅ Lazy loading images
- ✅ API response caching (5 min)
- ✅ Debounced search (500ms)
- ✅ Skeleton loading states
- ✅ CSS containment
- ✅ Reduced motion support

### Lighthouse Targets
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: 100

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- [ ] WebSocket backend for real rooms
- [ ] User authentication
- [ ] Custom avatar system
- [ ] Episode bookmarking
- [ ] Watch history
- [ ] More video sources

## 📄 License

MIT License - Feel free to use for personal projects!

## 🙏 Credits

- **Jikan API** - MyAnimeList unofficial API
- **Consumet** - Free streaming API
- **Google Fonts** - Comic fonts
- **You!** - For reading this far! 😄

---

**Made with ❤️ and 📚 for manga lovers everywhere!**

*AniSync - Read Anime Like Manga!* ✨
