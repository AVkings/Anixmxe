// ============================================
// AniSync - Room & WebSocket Logic
// Mock WebSocket implementation using localStorage events
// ============================================

import { 
  formatTime, 
  getAvatarInitials, 
  getRandomAvatarColor,
  createEmojiReaction,
  throttle
} from './utils.js';

// Mock WebSocket using localStorage events for cross-tab communication
class MockWebSocket {
  constructor(roomId) {
    this.roomId = roomId;
    this.channel = `anisync_room_${roomId}`;
    this.listeners = new Map();
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
    this.userName = 'Viewer_' + Math.floor(Math.random() * 1000);
    
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    
    // Announce presence
    this.broadcast('user-joined', {
      userId: this.userId,
      userName: this.userName,
      timestamp: Date.now()
    });
  }
  
  handleStorageEvent(e) {
    if (e.key !== this.channel) return;
    
    try {
      const event = JSON.parse(e.newValue);
      if (event && event.type) {
        this.emit(event.type, event.data);
      }
    } catch (err) {
      console.error('Error parsing storage event:', err);
    }
  }
  
  broadcast(type, data) {
    const event = {
      type,
      data: {
        ...data,
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now()
      }
    };
    
    localStorage.setItem(this.channel, JSON.stringify(event));
    // Clear immediately to allow duplicate events
    setTimeout(() => localStorage.removeItem(this.channel), 100);
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
  
  disconnect() {
    this.broadcast('user-left', {
      userId: this.userId,
      userName: this.userName
    });
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
  }
}

// Room Manager
export class RoomManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.socket = new MockWebSocket(roomId);
    this.users = new Map();
    this.isHost = false;
    this.videoElement = null;
    this.syncEnabled = true;
    
    this.setupListeners();
    this.updateUserList();
  }
  
  setupListeners() {
    // User management
    this.socket.on('user-joined', (data) => {
      console.log('User joined:', data.userName);
      this.users.set(data.userId, data);
      this.updateUserList();
      this.addSystemMessage(`${data.userName} joined the room`);
    });
    
    this.socket.on('user-left', (data) => {
      console.log('User left:', data.userName);
      this.users.delete(data.userId);
      this.updateUserList();
      this.addSystemMessage(`${data.userName} left the room`);
    });
    
    // Video sync actions
    this.socket.on('sync-action', (data) => {
      if (data.userId === this.socket.userId) return; // Ignore own actions
      
      console.log('Sync action:', data.action);
      this.handleSyncAction(data);
    });
    
    // Chat messages
    this.socket.on('chat-message', (data) => {
      if (data.userId === this.socket.userId) return; // Ignore own messages
      this.appendChatMessage(data);
    });
    
    // Emoji reactions
    this.socket.on('emoji-reaction', (data) => {
      if (data.userId === this.socket.userId) return;
      this.showEmojiReaction(data.emoji);
    });
  }
  
  handleSyncAction(data) {
    if (!this.videoElement || !this.syncEnabled) return;
    
    switch (data.action) {
      case 'play':
        this.videoElement.play();
        this.showSyncPulse();
        break;
      case 'pause':
        this.videoElement.pause();
        this.showSyncPulse();
        break;
      case 'seek':
        this.videoElement.currentTime = data.timestamp;
        this.showSyncPulse();
        break;
    }
  }
  
  showSyncPulse() {
    const pulse = document.querySelector('.sync-pulse');
    if (pulse) {
      pulse.classList.add('active');
      setTimeout(() => pulse.classList.remove('active'), 1500);
    }
  }
  
  broadcastSync(action, timestamp = 0) {
    if (!this.isHost) return;
    
    this.socket.broadcast('sync-action', {
      action,
      timestamp
    });
  }
  
  updateUserList() {
    const userListEl = document.getElementById('user-list');
    if (!userListEl) return;
    
    const usersArray = Array.from(this.users.values());
    
    userListEl.innerHTML = `
      <div class="user-list-header">
        👥 Watching (${usersArray.length})
      </div>
      ${usersArray.map(user => `
        <div class="user-item">
          <div class="user-status"></div>
          <div class="chat-avatar" style="background: ${getRandomAvatarColor()}">
            ${getAvatarInitials(user.userName)}
          </div>
          <span class="user-name">${user.userName}</span>
          ${user.userId === this.socket.userId ? '<span class="user-role">YOU</span>' : ''}
        </div>
      `).join('')}
    `;
  }
  
  sendChatMessage(text) {
    if (!text.trim()) return;
    
    const message = {
      text: text.trim(),
      timestamp: Date.now()
    };
    
    this.socket.broadcast('chat-message', message);
    this.appendChatMessage(message);
  }
  
  appendChatMessage(data) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
      <div class="chat-avatar" style="background: ${getRandomAvatarColor()}">
        ${getAvatarInitials(data.userName || 'User')}
      </div>
      <div class="chat-content">
        <div class="chat-author">${data.userName || 'Anonymous'}</div>
        <div class="chat-text">${this.escapeHtml(data.text)}</div>
        <div class="chat-timestamp">${formatTime(new Date(data.timestamp))}</div>
      </div>
    `;
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  addSystemMessage(text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageEl = document.createElement('div');
    messageEl.style.cssText = 'text-align: center; color: var(--text-secondary); font-size: 0.75rem; padding: 0.5rem;';
    messageEl.textContent = text;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  sendEmojiReaction(emoji) {
    this.socket.broadcast('emoji-reaction', { emoji });
    this.showEmojiReaction(emoji);
  }
  
  showEmojiReaction(emoji) {
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight - 100;
    createEmojiReaction(emoji, x, y);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  setVideoElement(video) {
    this.videoElement = video;
  }
  
  setHost(isHost) {
    this.isHost = isHost;
  }
  
  setSyncEnabled(enabled) {
    this.syncEnabled = enabled;
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Initialize room page
export function initRoomPage(roomId) {
  console.log('🎬 Initializing room:', roomId);
  
  const roomManager = new RoomManager(roomId);
  
  // Setup chat input
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  
  if (chatInput && chatSendBtn) {
    const sendMessage = () => {
      roomManager.sendChatMessage(chatInput.value);
      chatInput.value = '';
    };
    
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }
  
  // Setup emoji picker
  const emojiBtn = document.getElementById('emoji-btn');
  const emojiPicker = document.getElementById('emoji-picker');
  
  if (emojiBtn && emojiPicker) {
    emojiBtn.addEventListener('click', () => {
      emojiPicker.classList.toggle('active');
    });
    
    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
      if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.remove('active');
      }
    });
    
    // Emoji button handlers
    emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.textContent;
        roomManager.sendEmojiReaction(emoji);
        emojiPicker.classList.remove('active');
      });
    });
  }
  
  // Setup copy invite link
  const copyLinkBtn = document.getElementById('copy-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const url = window.location.href;
      const success = await navigator.clipboard.writeText(url);
      if (success) {
        // Show toast
        const toast = document.createElement('div');
        toast.textContent = 'Link copied!';
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 24px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      }
    });
  }
  
  return roomManager;
}

export default { RoomManager, initRoomPage };
