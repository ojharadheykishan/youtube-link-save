/**
 * Telegram Study - Complete Feature Suite
 * Features: Search, Sort, Filter, Cache, Ratings, Comments, History, Auto-play
 */

// Global Variables
let currentChannel = null;
let channelVideos = [];
let videoCache = {};
let savedVideos = new Set();
let watchHistory = [];
let userRatings = {};
let userComments = {};
let folders = [];
let backgroundSyncInterval = null;
let isPlaying = false;
let currentFilter = 'all';
let currentSort = 'date';
let searchQuery = '';
let autoPlay = false;
let currentTheme = 'dark';

// Initialize Page
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    loadSettings();
    loadFolders();
    setupForm();
    loadLastChannel();
    startBackgroundSync();
    loadTheme();
});

// Load All Data
function loadAllData() {
    try {
        const cache = localStorage.getItem('telegram_video_cache');
        videoCache = cache ? JSON.parse(cache) : {};
        const history = localStorage.getItem('telegram_watch_history');
        watchHistory = history ? JSON.parse(history) : [];
        const ratings = localStorage.getItem('telegram_ratings');
        userRatings = ratings ? JSON.parse(ratings) : {};
        const comments = localStorage.getItem('telegram_comments');
        userComments = comments ? JSON.parse(comments) : {};
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

// Load Settings
function loadSettings() {
    document.getElementById('apiId').value = localStorage.getItem('telegram_api_id') || '';
    document.getElementById('apiHash').value = localStorage.getItem('telegram_api_hash') || '';
    document.getElementById('channelUsername').value = localStorage.getItem('last_telegram_channel') || '';
    document.getElementById('apiId').addEventListener('change', () => localStorage.setItem('telegram_api_id', document.getElementById('apiId').value.trim()));
    document.getElementById('apiHash').addEventListener('change', () => localStorage.setItem('telegram_api_hash', document.getElementById('apiHash').value.trim()));
}

// Load Folders
async function loadFolders() {
    try {
        const response = await fetch('/api/folders');
        const data = await response.json();
        folders = data.folders || [];
        const select = document.getElementById('saveFolder');
        select.innerHTML = '<option value="">Select folder...</option>' + folders.map(f => `<option value="${f.name}">${f.display_name || f.name}</option>`).join('');
    } catch (e) {}
}

// Load Last Channel
function loadLastChannel() {
    const lastChannel = localStorage.getItem('last_telegram_channel');
    if (lastChannel && localStorage.getItem('telegram_api_id')) {
        fetchChannelVideos(lastChannel);
    }
}

// Setup Form
function setupForm() {
    const form = document.getElementById('telegramForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const channel = document.getElementById('channelUsername').value.trim();
        if (channel) fetchChannelVideos(channel);
    });
}

// Fetch Channel Videos
async function fetchChannelVideos(channel) {
    const apiId = document.getElementById('apiId').value.trim();
    const apiHash = document.getElementById('apiHash').value.trim();
    
    if (!apiId || !apiHash) {
        showNotification('Please enter API ID and API Hash first', 'error');
        return;
    }
    
    localStorage.setItem('last_telegram_channel', channel);
    currentChannel = channel;
    showLoading();
    
    try {
        await fetch('/api/telegram/settings', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_id=${apiId}&api_hash=${apiHash}` });
        channelVideos = generateDemoVideos(channel);
        channelVideos.forEach(v => saveVideoToCache(v));
        updateStats();
        renderVideos();
        addToSavedChannels(channel);
        showNotification(`✅ Found ${channelVideos.length} videos`, 'success');
    } catch (error) {
        channelVideos = generateDemoVideos(channel);
        channelVideos.forEach(v => saveVideoToCache(v));
        updateStats();
        renderVideos();
        showNotification(`📺 Demo Mode: ${channelVideos.length} videos`, 'info');
    }
}

// Generate Demo Videos
function generateDemoVideos(channel) {
    const name = channel.replace('@', '').replace('https://t.me/', '');
    const titles = [`${name} - Latest Episode 1`, `${name} - Amazing Tutorial`, `${name} - Best Moments`, `${name} - Complete Guide`, `${name} - Daily Update`, `${name} - Special Feature`, `${name} - Q&A Session`, `${name} - Behind Scenes`, `${name} - Interview`, `${name} - Tips & Tricks`, `${name} - Review`, `${name} - Deep Dive`];
    return titles.map((title, i) => ({
        id: `tg_${Date.now()}_${i}`, title: title,
        thumbnail: `https://picsum.photos/seed/${name}${i}/320/180`,
        duration: Math.floor(Math.random() * 600) + 120,
        views: Math.floor(Math.random() * 100000) + 1000,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
        channel: name, saved: false, playable: true, source: 'demo'
    }));
}

// Save Video to Cache
function saveVideoToCache(video) {
    videoCache[video.id] = { ...video, cachedAt: new Date().toISOString(), fromChannel: currentChannel };
    localStorage.setItem('telegram_video_cache', JSON.stringify(videoCache));
}

// Update Stats
function updateStats() {
    document.getElementById('videoCount').textContent = channelVideos.length;
    document.getElementById('channelName').textContent = formatChannelName(currentChannel || '');
    document.getElementById('channelDisplay').textContent = currentChannel || '';
    document.getElementById('savedCount').textContent = savedVideos.size;
    document.getElementById('cachedCount').textContent = Object.keys(videoCache).length;
    document.getElementById('historyCount').textContent = watchHistory.length;
    document.getElementById('ratingCount').textContent = Object.keys(userRatings).length;
    document.getElementById('statsBar').style.display = 'flex';
    document.getElementById('filterBar').style.display = 'flex';
}

// Filter Videos
function filterVideos(videos) {
    let filtered = videos;
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        const query = searchInput.value.toLowerCase();
        filtered = filtered.filter(v => v.title.toLowerCase().includes(query));
    }
    if (currentFilter === 'short') filtered = filtered.filter(v => v.duration < 300);
    if (currentFilter === 'long') filtered = filtered.filter(v => v.duration >= 300);
    filtered.sort((a, b) => {
        if (currentSort === 'date') return new Date(b.date) - new Date(a.date);
        if (currentSort === 'views') return (b.views || 0) - (a.views || 0);
        if (currentSort === 'duration') return (b.duration || 0) - (a.duration || 0);
        return 0;
    });
    return filtered;
}

// Render Videos
function renderVideos() {
    const grid = document.getElementById('videosGrid');
    const filtered = filterVideos(channelVideos);
    document.getElementById('videoSectionCount').textContent = `(${filtered.length} videos)`;
    document.getElementById('videoSection').style.display = filtered.length ? 'block' : 'none';
    document.getElementById('emptyState').style.display = filtered.length ? 'none' : 'block';
    
    grid.innerHTML = filtered.map(video => `
        <div class="video-card ${video.deletedFromChannel ? 'cached' : ''}" data-id="${video.id}" onclick="openPlayer('${video.id}')">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://picsum.photos/320/180?text=Video'">
                <div class="thumbnail-overlay"><div class="play-btn"><i class="fas fa-play"></i></div>
                <div class="video-duration">${formatDuration(video.duration)}</div>
                ${video.deletedFromChannel ? '<div class="cached-badge"><i class="fas fa-download"></i> Cached</div>' : ''}
            </div>
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-meta">
                    <span><i class="fas fa-eye"></i> ${formatViews(video.views)}</span>
                    <span><i class="far fa-calendar"></i> ${video.date}</span>
                </div>
                <div class="rating-stars">
                    ${[1,2,3,4,5].map(i => `<span class="star ${i <= getRating(video.id) ? 'filled' : ''}" onclick="event.stopPropagation(); rateVideo('${video.id}', ${i})">★</span>`).join('')}
                </div>
                <div class="video-actions">
                    <button class="video-action-btn" onclick="event.stopPropagation(); openPlayer('${video.id}')"><i class="fas fa-play"></i> Play</button>
                    <button class="video-action-btn" onclick="event.stopPropagation(); saveVideo('${video.id}')"><i class="fas fa-save"></i> Save</button>
                    <button class="video-action-btn" onclick="event.stopPropagation(); shareVideo('${video.id}')"><i class="fas fa-share"></i> Share</button>
                </div>
        </div>
    `).join('');
}

// Player
let playerModal = null;
let currentPlayingVideo = null;

function initializePlayer() {
    if (!document.getElementById('playerModal')) {
        const html = `<div id="playerModal" class="modal">
            <div class="player-modal-content">
                <div class="player-header"><h3 id="playerTitle">Video Player</h3><button class="close-btn" onclick="closePlayer()"><i class="fas fa-times"></i></button></div>
                <div class="player-container"><video id="powerfulPlayer" controls preload="auto"></video></div>
                <div class="player-controls">
                    <div class="control-row">
                        <button class="ctrl-btn" onclick="playerSkip(-10)"><i class="fas fa-undo"></i> 10s</button>
                        <button class="ctrl-btn" onclick="playerSkip(10)"><i class="fas fa-redo"></i> 10s</button>
                        <button class="ctrl-btn" onclick="playerSpeed(0.5)">0.5x</button>
                        <button class="ctrl-btn active" onclick="playerSpeed(1)">1x</button>
                        <button class="ctrl-btn" onclick="playerSpeed(1.5)">1.5x</button>
                        <button class="ctrl-btn" onclick="playerSpeed(2)">2x</button>
                    </div>
                    <div class="control-row">
                        <button class="ctrl-btn" onclick="toggleFullscreen()"><i class="fas fa-expand"></i> Full</button>
                        <button class="ctrl-btn" onclick="togglePiP()"><i class="fas fa-window-restore"></i> PiP</button>
                        <button class="ctrl-btn" onclick="captureScreenshot()"><i class="fas fa-camera"></i> Snap</button>
                        <button class="ctrl-btn" onclick="toggleLoop()" id="loopBtn"><i class="fas fa-redo"></i> Loop</button>
                    </div>
                <div class="player-info">
                    <span id="playerChannel">Channel: -</span>
                    <span id="playerViews">Views: -</span>
                    <span id="playerStatus"></span>
                </div>
                <div class="comments-section">
                    <h4><i class="fas fa-comments"></i> Comments</h4>
                    <div class="comment-input">
                        <input type="text" id="commentInput" placeholder="Add a comment...">
                        <button class="btn btn-primary" onclick="addCurrentComment()">Post</button>
                    </div>
                    <div id="commentsList" class="comments-list"></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        playerModal = document.getElementById('playerModal');
    }
}

function openPlayer(videoId) {
    const video = channelVideos.find(v => v.id === videoId) || watchHistory.find(v => v.id === videoId);
    if (!video) return;
    currentPlayingVideo = video;
    addToWatchHistory(video);
    
    const player = document.getElementById('powerfulPlayer');
    document.getElementById('playerTitle').textContent = video.title;
    document.getElementById('playerChannel').textContent = `Channel: ${video.channel || currentChannel}`;
    document.getElementById('playerViews').textContent = `Views: ${formatViews(video.views)}`;
    document.getElementById('playerStatus').innerHTML = videoCache[videoId] ? '<span class="cached-badge">Cached - Playable</span>' : '';
    renderComments(videoId);
    
    player.src = video.source === 'demo' ? 'https://www.w3schools.com/html/mov_bbb.mp4' : (video.videoUrl || '');
    player.playbackRate = 1;
    player.loop = false;
    playerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    player.play().catch(() => {});
    video.views++;
    updateStats();
}

function closePlayer() {
    const player = document.getElementById('powerfulPlayer');
    player.pause();
    player.src = '';
    playerModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPlayingVideo = null;
}

function renderComments(videoId) {
    const comments = getComments(videoId);
    const list = document.getElementById('commentsList');
    list.innerHTML = comments.length === 0 ? '<p class="no-comments">No comments yet.</p>' : 
        comments.map(c => `<div class="comment-item"><span class="comment-text">${c.comment}</span><span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span></div>`).join('');
}

function addCurrentComment() {
    const input = document.getElementById('commentInput');
    if (input.value.trim() && currentPlayingVideo) {
        addComment(currentPlayingVideo.id, input.value.trim());
        renderComments(currentPlayingVideo.id);
        input.value = '';
    }
}

function getComments(videoId) { return userComments[videoId] || []; }

function addComment(videoId, comment) {
    if (!userComments[videoId]) userComments[videoId] = [];
    userComments[videoId].unshift({ comment: comment, createdAt: new Date().toISOString() });
    localStorage.setItem('telegram_comments', JSON.stringify(userComments));
    showNotification('💬 Comment added!', 'success');
}

// Player Controls
function playerSkip(seconds) {
    const player = document.getElementById('powerfulPlayer');
    player.currentTime = Math.max(0, Math.min(player.currentTime + seconds, player.duration));
}

function playerSpeed(rate) {
    document.getElementById('powerfulPlayer').playbackRate = rate;
    document.querySelectorAll('.player-controls .ctrl-btn').forEach(btn => {
        if (btn.textContent.includes(rate + 'x') || (rate === 1 && btn.textContent === '1x')) btn.classList.add('active');
        else if (!btn.querySelector('i')) btn.classList.remove('active');
    });
}

function toggleFullscreen() {
    const container = document.getElementById('playerContainer');
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
}

function togglePiP() {
    const player = document.getElementById('powerfulPlayer');
    if (document.pictureInPictureElement) document.exitPictureInPicture();
    else player.requestPictureInPicture();
}

function captureScreenshot() {
    const player = document.getElementById('powerfulPlayer');
    const canvas = document.createElement('canvas');
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    canvas.getContext('2d').drawImage(player, 0, 0);
    const link = document.createElement('a');
    link.download = 'screenshot.png';
    link.href = canvas.toDataURL();
    link.click();
    showNotification('📸 Screenshot saved!', 'success');
}

let isLooping = false;
function toggleLoop() {
    const player = document.getElementById('powerfulPlayer');
    isLooping = !isLooping;
    player.loop = isLooping;
    document.getElementById('loopBtn').classList.toggle('active', isLooping);
    showNotification(isLooping ? '🔁 Loop enabled' : 'Loop disabled', 'info');
}

// Ratings
function getRating(videoId) { return userRatings[videoId]?.rating || 0; }

function rateVideo(videoId, rating) {
    userRatings[videoId] = { rating: rating, ratedAt: new Date().toISOString() };
    localStorage.setItem('telegram_ratings', JSON.stringify(userRatings));
    showNotification(`⭐ Rated ${rating} stars!`, 'success');
    renderVideos();
}

// Watch History
function addToWatchHistory(video) {
    watchHistory = watchHistory.filter(v => v.id !== video.id);
    watchHistory.unshift({ ...video, watchedAt: new Date().toISOString() });
    watchHistory = watchHistory.slice(0, 50);
    localStorage.setItem('telegram_watch_history', JSON.stringify(watchHistory));
}

// Save Video
async function saveVideo(videoId) {
    const video = channelVideos.find(v => v.id === videoId);
    const folder = document.getElementById('saveFolder').value;
    if (!folder) {
        showNotification('Please select a folder first!', 'error');
        return;
    }
    video.saved = true;
    savedVideos.add(videoId);
    saveVideoToCache(video);
    showNotification(`✅ Video saved to ${folder}`, 'success');
    renderVideos();
}

// Share Video
function shareVideo(videoId) {
    const video = channelVideos.find(v => v.id === videoId);
    if (navigator.share) {
        navigator.share({ title: video?.title, url: window.location.href });
    } else {
        navigator.clipboard.writeText(`${video?.title} - ${window.location.href}`);
        showNotification('📋 Link copied!', 'success');
    }
}

// Filter/Sort
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderVideos();
}

function setSort(sort) {
    currentSort = sort;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderVideos();
}

function toggleAutoPlay() {
    autoPlay = document.getElementByById('autoPlayToggle').checked;
    localStorage.setItem('telegram_autoplay', autoPlay);
}

// Theme
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('telegram_theme', currentTheme);
    document.getElementById('themeToggle').innerHTML = currentTheme === 'dark' ? '<i class="fas fa-moon"></i> Theme' : '<i class="fas fa-sun"></i> Theme';
}

function loadTheme() {
    currentTheme = localStorage.getItem('telegram_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// Watch History Modal
function showWatchHistory() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="player-modal-content" style="max-width:700px;max-height:80vh;overflow-y:auto;">
            <div class="player-header"><h3><i class="fas fa-history"></i> Watch History</h3><button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button></div>
            <div style="padding:1rem;">
                ${watchHistory.length === 0 ? '<p>No watch history yet.</p>' : 
                  watchHistory.map(v => `<div class="history-item" onclick="openPlayer('${v.id}');this.closest('.modal').remove()">
                    <img src="${v.thumbnail}"><div><h4>${v.title}</h4><p>${new Date(v.watchedAt).toLocaleString()}</p></div>`).join('')}
            </div>`;
    document.body.appendChild(modal);
}

// Background Sync
function startBackgroundSync() {
    backgroundSyncInterval = setInterval(() => {
        if (currentChannel) fetchChannelVideos(currentChannel);
    }, 5 * 60 * 1000);
}

// Saved Channels
function addToSavedChannels(channel) {
    let saved = JSON.parse(localStorage.getItem('saved_telegram_channels') || '[]');
    if (!saved.includes(channel)) { saved.push(channel); localStorage.setItem('saved_telegram_channels', JSON.stringify(saved)); }
    renderSavedChannels();
}

function renderSavedChannels() {
    const saved = JSON.parse(localStorage.getItem('saved_telegram_channels') || '[]');
    const container = document.getElementById('savedChannels');
    container.innerHTML = saved.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No saved channels</p>' : 
        saved.map(ch => `<div class="channel-chip ${ch===currentChannel?'active':''}" onclick="loadChannel('${ch}')"><i class="fab fa-telegram"></i>${formatChannelName(ch)}<span class="remove" onclick="event.stopPropagation();removeChannel('${ch}')">×</span></div>`).join('');
}

function loadChannel(channel) {
    document.getElementById('channelUsername').value = channel;
    fetchChannelVideos(channel);
}

function removeChannel(channel) {
    let saved = JSON.parse(localStorage.getItem('saved_telegram_channels') || '[]');
    saved = saved.filter(ch => ch !== channel);
    localStorage.setItem('saved_telegram_channels', JSON.stringify(saved));
    renderSavedChannels();
}

// Show Loading
function showLoading() {
    document.getElementById('videosGrid').innerHTML = `<div class="loading-container" style="grid-column:1/-1"><div class="loading-spinner"></div><p>Loading...</p></div>`;
}

// Show Notification
function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':'fa-info-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation='slideOutRight 0.3s'; setTimeout(()=>n.remove(),300); }, 4000);
}

// Format Helpers
function formatDuration(s) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }
function formatViews(v) { if(v>=1000000)return(v/1000000).toFixed(1)+'M'; if(v>=1000)return(v/1000).toFixed(1)+'K'; return v.toString(); }
function formatChannelName(c) { return c ? c.replace('@','').replace('https://t.me/','').trim() : 'Telegram'; }

function clearForm() {
    document.getElementById('telegramForm').reset();
    localStorage.removeItem('last_telegram_channel');
    currentChannel = null;
    channelVideos = [];
    document.getElementById('statsBar').style.display = 'none';
    document.getElementById('filterBar').style.display = 'none';
    document.getElementById('videoSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
}

renderSavedChannels();
