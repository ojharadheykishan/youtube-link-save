ter name="content">/**
 * Progress Tracking & RSS Feed Features
 * Add to telegram-study.js
 */

// Progress Tracking Variables
let watchProgress = {};
let playbackHistory = {};

// Initialize progress tracking
function initProgressTracking() {
    loadProgressFromStorage();
    setupProgressAutoSave();
}

// Load progress from localStorage
function loadProgressFromStorage() {
    try {
        const progress = localStorage.getItem('video_watch_progress');
        watchProgress = progress ? JSON.parse(progress) : {};
        
        const history = localStorage.getItem('video_playback_history');
        playbackHistory = history ? JSON.parse(history) : {};
    } catch (e) {
        console.error('Error loading progress:', e);
        watchProgress = {};
        playbackHistory = {};
    }
}

// Save progress to localStorage
function saveProgressToStorage() {
    try {
        localStorage.setItem('video_watch_progress', JSON.stringify(watchProgress));
        localStorage.setItem('video_playback_history', JSON.stringify(playbackHistory));
    } catch (e) {
        console.error('Error saving progress:', e);
    }
}

// Auto-save progress every 5 seconds
function setupProgressAutoSave() {
    setInterval(() => {
        saveProgressToStorage();
    }, 5000);
}

// Track video playback
function trackPlayback(videoId, currentTime, duration) {
    if (!watchProgress[videoId]) {
        watchProgress[videoId] = {
            currentTime: 0,
            duration: 0,
            lastPosition: 0,
            progress: 0,
            startedAt: null,
            completedAt: null,
            totalWatchTime: 0,
            playCount: 0
        };
    }
    
    const progress = watchProgress[videoId];
    progress.currentTime = currentTime;
    progress.duration = duration;
    progress.lastPosition = currentTime;
    progress.progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    progress.totalWatchTime += 1;
    progress.playCount += 1;
    
    if (!progress.startedAt) {
        progress.startedAt = new Date().toISOString();
    }
    
    // Mark as completed if watched > 90%
    if (progress.progress >= 90 && !progress.completedAt) {
        progress.completedAt = new Date().toISOString();
    }
    
    saveProgressToStorage();
    updateVideoProgressUI(videoId);
}

// Get video progress
function getVideoProgress(videoId) {
    return watchProgress[videoId] || null;
}

// Check if video is completed
function isVideoCompleted(videoId) {
    const progress = watchProgress[videoId];
    return progress && progress.progress >= 90;
}

// Get remaining time
function getRemainingTime(videoId) {
    const progress = watchProgress[videoId];
    if (!progress || !progress.duration) return null;
    return progress.duration - progress.currentTime;
}

// Format time for display
function formatTime(seconds) {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format duration
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update video card progress UI
function updateVideoProgressUI(videoId) {
    const card = document.querySelector(`.video-card[data-id="${videoId}"]`);
    if (!card) return;
    
    const progress = watchProgress[videoId];
    if (!progress) return;
    
    // Find or create progress bar
    let progressBar = card.querySelector('.progress-bar-container');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar-container';
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            <div class="progress-text"></div>
        `;
        card.querySelector('.video-thumbnail').appendChild(progressBar);
    }
    
    const fill = progressBar.querySelector('.progress-fill');
    const text = progressBar.querySelector('.progress-text');
    
    fill.style.width = `${Math.min(progress.progress, 100)}%`;
    
    if (progress.progress >= 90) {
        fill.classList.add('completed');
        text.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
        text.classList.add('completed');
    } else if (progress.progress > 0) {
        text.innerHTML = `${formatTime(progress.currentTime)} / ${formatTime(progress.duration)} (${Math.round(progress.progress)}%)`;
    }
}

// Render videos with progress
function renderVideosWithProgress(videos) {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    
    grid.innerHTML = videos.map((video, index) => {
        const progress = watchProgress[video.id] || {};
        const progressPercent = Math.min(progress.progress || 0, 100);
        
        return `
            <div class="video-card" data-id="${video.id}" onclick="openPlayer('${video.id}')">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://picsum.photos/320/180?text=Video'">
                    <div class="thumbnail-overlay">
                        <div class="play-btn"><i class="fas fa-play"></i></div>
                    <div class="video-duration">${formatDuration(video.duration)}</div>
                    ${progressPercent > 0 ? `
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            <div class="progress-text">
                                ${progressPercent >= 90 ? '<i class="fas fa-check-circle"></i> Completed' : 
                                  `${Math.round(progressPercent)}% watched`}
                            </div>
                    ` : ''}
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-meta">
                        <span><i class="fas fa-eye"></i> ${formatViews(video.views)}</span>
                        <span><i class="far fa-calendar"></i> ${video.date || 'Recently'}</span>
                    </div>
                    ${progressPercent > 0 && progressPercent < 90 ? `
                        <div class="continue-badge">
                            <i class="fas fa-play-circle"></i> Continue (${formatTime(progress.currentTime)})
                        </div>
                    ` : ''}
                    <div class="video-actions">
                        <button class="video-action-btn" onclick="event.stopPropagation(); openPlayer('${video.id}')">
                            <i class="fas fa-play"></i> ${progressPercent > 0 && progressPercent < 90 ? 'Continue' : 'Play'}
                        </button>
                        <button class="video-action-btn" onclick="event.stopPropagation(); resetProgress('${video.id}')">
                            <i class="fas fa-redo"></i> Reset
                        </button>
                    </div>
            </div>
        `;
    }).join('');
}

// Reset video progress
function resetProgress(videoId) {
    if (!confirm('Reset watch progress for this video?')) return;
    
    delete watchProgress[videoId];
    saveProgressToStorage();
    
    const card = document.querySelector(`.video-card[data-id="${videoId}"]`);
    const progressBar = card?.querySelector('.progress-bar-container');
    if (progressBar) {
        progressBar.remove();
    }
    
    showNotification('Progress reset', 'info');
}

// Clear all progress
function clearAllProgress() {
    if (!confirm('Reset all watch progress?')) return;
    
    watchProgress = {};
    playbackHistory = {};
    saveProgressToStorage();
    renderVideos();
    showNotification('All progress cleared', 'success');
}

// Show playback statistics
function showPlaybackStats() {
    const stats = calculatePlaybackStats();
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="player-modal-content" style="max-width:600px;max-height:80vh;overflow-y:auto;">
            <div class="player-header">
                <h3><i class="fas fa-chart-line"></i> Playback Statistics</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:1.5rem;">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-play"></i></div>
                        <div class="stat-value">${stats.totalVideosWatched}</div>
                        <div class="stat-label">Videos Watched</div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-value">${stats.completedVideos}</div>
                        <div class="stat-label">Completed</div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-value">${formatTime(stats.totalWatchTime)}</div>
                        <div class="stat-label">Total Watch Time</div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-fire"></i></div>
                        <div class="stat-value">${stats.totalPlayCount}</div>
                        <div class="stat-label">Play Sessions</div>
                </div>
                
                <h4 style="margin-top:1.5rem;margin-bottom:1rem;">Top Watched Videos</h4>
                ${stats.topWatched.length > 0 ? `
                    <div class="top-watched-list">
                        ${stats.topWatched.slice(0, 5).map((video, i) => `
                            <div class="top-watched-item">
                                <span class="rank">#${i + 1}</span>
                                <img src="${video.thumbnail || ''}" alt="">
                                <div class="info">
                                    <h5>${video.title || 'Unknown'}</h5>
                                    <p>${formatTime(video.watchTime)} watched</p>
                                </div>
                        `).join('')}
                    </div>
                ` : '<p style="color:var(--text-secondary);">No videos watched yet</p>'}
                
                <button class="btn btn-secondary" style="width:100%;margin-top:1.5rem;" onclick="clearAllProgress();this.closest('.modal').remove();">
                    <i class="fas fa-trash"></i> Clear All Progress
                </button>
            </div>
    `;
    document.body.appendChild(modal);
}

// Calculate playback statistics
function calculatePlaybackStats() {
    let totalWatchTime = 0;
    let completedVideos = 0;
    let totalPlayCount = 0;
    const topWatched = [];
    
    Object.entries(watchProgress).forEach(([videoId, progress]) => {
        totalWatchTime += progress.totalWatchTime || 0;
        totalPlayCount += progress.playCount || 0;
        
        if (progress.progress >= 90) {
            completedVideos++;
        }
        
        topWatched.push({
            id: videoId,
            title: playbackHistory[videoId]?.title || 'Unknown',
            thumbnail: playbackHistory[videoId]?.thumbnail || '',
            watchTime: progress.totalWatchTime || 0
        });
    });
    
    topWatched.sort((a, b) => b.watchTime - a.watchTime);
    
    return {
        totalVideosWatched: Object.keys(watchProgress).length,
        completedVideos,
        totalWatchTime,
        totalPlayCount,
        topWatched
    };
}

// Player event handlers for progress tracking
function setupPlayerProgressTracking(player, videoId) {
    player.addEventListener('timeupdate', () => {
        trackPlayback(videoId, player.currentTime, player.duration);
    });
    
    player.addEventListener('ended', () => {
        trackPlayback(videoId, player.duration, player.duration);
        showNotification('Video completed! 🎉', 'success');
    });
    
    // Resume from last position
    const progress = watchProgress[videoId];
    if (progress && progress.lastPosition > 0) {
        player.currentTime = Math.min(progress.lastPosition, player.duration - 10);
    }
}

// ===== RSS Feed Generation =====

// Generate RSS feed URL for playlists
function getRSSFeedUrl(playlistId) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/rss/${playlistId}`;
}

// Copy RSS feed URL to clipboard
function copyRSSUrl(playlistId) {
    const url = getRSSFeedUrl(playlistId);
    navigator.clipboard.writeText(url).then(() => {
        showNotification('RSS URL copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy URL', 'error');
    });
}

// Show RSS feed modal
function showRSSModal(playlistId, playlistTitle) {
    const rssUrl = getRSSFeedUrl(playlistId);
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="player-modal-content" style="max-width:550px;">
            <div class="player-header">
                <h3><i class="fas fa-rss"></i> RSS Feed</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:1.5rem;">
                <div style="text-align:center;margin-bottom:1.5rem;">
                    <div class="rss-icon"><i class="fas fa-rss-square"></i></div>
                    <h4 style="margin-top:0.5rem;">${playlistTitle}</h4>
                </div>
                
                <div class="form-group">
                    <label>RSS Feed URL</label>
                    <div class="input-with-btn">
                        <input type="text" id="rssFeedUrl" value="${rssUrl}" readonly>
                        <button class="btn btn-primary" onclick="copyRSSUrl('${playlistId}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                
                <div style="margin-top:1.5rem;">
                    <h4 style="margin-bottom:0.75rem;">How to use:</h4>
                    <ul class="rss-instructions">
                        <li>Copy the RSS URL above</li>
                        <li>Add it to your RSS reader (Feedly, Inoreader, etc.)</li>
                        <li>Get instant updates when new videos are added</li>
                        <li>Or use with IFTTT/Zapier for automations</li>
                    </ul>
                </div>
                
                <div style="margin-top:1.5rem;">
                    <h4 style="margin-bottom:0.75rem;">Subscribe Options:</h4>
                    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                        <a href="https://feedly.com/i/subscription/feed/${encodeURIComponent(rssUrl)}" target="_blank" class="btn btn-secondary" style="flex:1;">
                            <i class="fas fa-external-link-alt"></i> Feedly
                        </a>
                        <a href="https://inoreader.com/?add_feed=${encodeURIComponent(rssUrl)}" target="_blank" class="btn btn-secondary" style="flex:1;">
                            <i class="fas fa-external-link-alt"></i> Inoreader
                        </a>
                    </div>
            </div>
    `;
    document.body.appendChild(modal);
}

// Show playlist RSS options
function showPlaylistRSSOptions(playlistId, playlistTitle) {
    showRSSModal(playlistId, playlistTitle);
}

// Export progress as JSON
function exportProgress() {
    const data = {
        exportDate: new Date().toISOString(),
        progress: watchProgress,
        history: playbackHistory
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watch-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Progress exported!', 'success');
}

// Import progress from JSON
function importProgress(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.progress) {
                watchProgress = { ...watchProgress, ...data.progress };
            }
            if (data.history) {
                playbackHistory = { ...playbackHistory, ...data.history };
            }
            saveProgressToStorage();
            renderVideos();
            showNotification('Progress imported!', 'success');
        } catch (error) {
            showNotification('Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
}
