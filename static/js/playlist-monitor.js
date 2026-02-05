// Playlist Monitor & Notifications JavaScript
// Handles playlist monitoring and real-time notifications

// Global state
let monitoredPlaylists = [];
let notifications = [];
let unreadCount = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadNotifications();
    loadPlaylists();
    setupAutoRefresh();
});

// Load notifications
async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        notifications = data.notifications || [];
        unreadCount = data.unread_count || 0;
        updateNotificationBadge();
        renderNotifications();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Load monitored playlists
async function loadPlaylists() {
    try {
        const response = await fetch('/api/playlists');
        const data = await response.json();
        monitoredPlaylists = data.playlists || {};
        renderPlaylistMonitor();
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

// Render playlist monitor
function renderPlaylistMonitor() {
    const container = document.getElementById('monitoredPlaylists');
    if (!container) return;
    
    const playlists = Object.values(monitoredPlaylists);
    
    if (playlists.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No monitored playlists</p>';
        return;
    }
    
    container.innerHTML = playlists.map(playlist => `
        <div class="playlist-item" data-id="${playlist.id}">
            <div class="playlist-info">
                <h4>${playlist.title || 'Unknown Playlist'}</h4>
                <p>${playlist.video_count || 0} videos • Last checked: ${formatDate(playlist.last_checked)}</p>
            </div>
            <div class="playlist-actions">
                <button class="btn-icon" onclick="checkNow('${playlist.id}')" title="Check Now">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="btn-icon" onclick="removePlaylist('${playlist.id}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
    `).join('');
}

// Render notifications
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No notifications</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="markAsRead('${notif.id}')">
            <img src="${notif.thumbnail || '/static/images/avatar.svg'}" alt="Thumbnail" class="notif-thumb">
            <div class="notif-content">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                <span class="notif-time">${formatDate(notif.created_at)}</span>
            </div>
            ${!notif.read ? '<span class="unread-badge"></span>' : ''}
        </div>
    `).join('');
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Mark notification as read
async function markAsRead(notifId) {
    try {
        await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
        
        const notif = notifications.find(n => n.id === notifId);
        if (notif && !notif.read) {
            notif.read = true;
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationBadge();
            renderNotifications();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all as read
async function markAllAsRead() {
    try {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        
        notifications.forEach(n => n.read = true);
        unreadCount = 0;
        updateNotificationBadge();
        renderNotifications();
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Check playlist now
async function checkNow(playlistId) {
    try {
        const response = await fetch(`/api/playlists/${playlistId}/check`, { method: 'POST' });
        const data = await response.json();
        
        if (data.new_videos > 0) {
            showNotification(`${data.new_videos} new videos found!`, 'success');
            loadNotifications();
            loadPlaylists();
        } else {
            showNotification('No new videos found', 'info');
        }
    } catch (error) {
        console.error('Error checking playlist:', error);
        showNotification('Error checking playlist', 'error');
    }
}

// Remove playlist from monitor
async function removePlaylist(playlistId) {
    if (!confirm('Stop monitoring this playlist?')) return;
    
    try {
        await fetch(`/api/playlists/${playlistId}/monitor`, { method: 'DELETE' });
        loadPlaylists();
        showNotification('Playlist removed from monitoring', 'info');
    } catch (error) {
        console.error('Error removing playlist:', error);
        showNotification('Error removing playlist', 'error');
    }
}

// Setup auto-refresh
function setupAutoRefresh() {
    // Refresh notifications every 30 seconds
    setInterval(loadNotifications, 30000);
    
    // Refresh playlists every 5 minutes
    setInterval(loadPlaylists, 300000);
}

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
}

// Show browser notification
function showBrowserNotification(title, options) {
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, options);
            }
        });
    }
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}
