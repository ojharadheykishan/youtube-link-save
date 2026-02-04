/**
 * VideoHub - Smart Notifications System
 * Get notified when new videos are added to subscribed channels
 */

(function() {
    'use strict';

    const NOTIFICATIONS_KEY = 'videohub_notifications';
    const SUBSCRIPTIONS_KEY = 'videohub_subscriptions';

    /**
     * Notifications Manager Class
     */
    class NotificationsManager {
        constructor() {
            this.notifications = this.loadNotifications();
            this.subscriptions = this.loadSubscriptions();
            this.permission = this.checkPermission();
        }

        loadNotifications() {
            try {
                const data = localStorage.getItem(NOTIFICATIONS_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        }

        loadSubscriptions() {
            try {
                const data = localStorage.getItem(SUBSCRIPTIONS_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        }

        saveNotifications() {
            try {
                localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
            } catch (e) {}
        }

        saveSubscriptions() {
            try {
                localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(this.subscriptions));
            } catch (e) {}
        }

        checkPermission() {
            if ('Notification' in window) {
                return Notification.permission;
            }
            return 'unsupported';
        }

        requestPermission() {
            if ('Notification' in window) {
                return Notification.requestPermission().then(permission => {
                    this.permission = permission;
                    return permission;
                });
            }
            return Promise.resolve('unsupported');
        }

        /**
         * Add notification
         */
        addNotification(title, message, type = 'info', link = null, source = null) {
            const notification = {
                id: 'notif_' + Date.now(),
                title,
                message,
                type,
                link,
                source,
                read: false,
                createdAt: new Date().toISOString()
            };

            this.notifications.unshift(notification);
            
            // Keep only last 100 notifications
            if (this.notifications.length > 100) {
                this.notifications = this.notifications.slice(0, 100);
            }
            
            this.saveNotifications();
            this.showBrowserNotification(title, message, type);
            this.updateBadge();

            return notification;
        }

        /**
         * Show browser notification
         */
        showBrowserNotification(title, message, type = 'info') {
            if (this.permission !== 'granted') return;

            const icon = this.getNotificationIcon(type);
            
            try {
                const notification = new Notification(title, {
                    body: message,
                    icon: icon,
                    tag: 'videohub-notification',
                    requireInteraction: type === 'urgent'
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                // Auto-close after 5 seconds
                setTimeout(() => notification.close(), 5000);
            } catch (e) {
                console.error('Notification error:', e);
            }
        }

        /**
         * Get notification icon based on type
         */
        getNotificationIcon(type) {
            const icons = {
                'video': '/static/images/ai-character.svg',
                'playlist': '/static/images/ai-character.svg',
                'folder': '/static/images/ai-character.svg',
                'info': '/static/images/ai-character.svg',
                'success': '/static/images/ai-character.svg',
                'warning': '/static/images/ai-character.svg',
                'urgent': '/static/images/ai-character.svg'
            };
            return icons[type] || icons['info'];
        }

        /**
         * Mark notification as read
         */
        markAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.saveNotifications();
                this.updateBadge();
            }
        }

        /**
         * Mark all as read
         */
        markAllAsRead() {
            this.notifications.forEach(n => n.read = true);
            this.saveNotifications();
            this.updateBadge();
        }

        /**
         * Delete notification
         */
        deleteNotification(notificationId) {
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.saveNotifications();
            this.updateBadge();
        }

        /**
         * Clear all notifications
         */
        clearAll() {
            this.notifications = [];
            this.saveNotifications();
            this.updateBadge();
        }

        /**
         * Get unread count
         */
        getUnreadCount() {
            return this.notifications.filter(n => !n.read).length;
        }

        /**
         * Get all notifications
         */
        getAll() {
            return this.notifications;
        }

        /**
         * Get recent notifications
         */
        getRecent(limit = 10) {
            return this.notifications.slice(0, limit);
        }

        /**
         * Update badge count
         */
        updateBadge() {
            const count = this.getUnreadCount();
            
            // Update badge in UI
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }

            // Update title if unread
            if (count > 0 && !document.hidden) {
                document.title = `(${count}) VideoHub`;
            } else if (count === 0 && document.title.startsWith('(')) {
                document.title = document.title.replace(/^\(\d+\)\s*/, '');
            }
        }

        /**
         * Subscribe to channel/playlist
         */
        subscribe(channelId, channelName, type = 'youtube') {
            const existing = this.subscriptions.find(s => s.channelId === channelId);
            if (existing) return existing;

            const subscription = {
                id: 'sub_' + Date.now(),
                channelId,
                channelName,
                type,
                enabled: true,
                lastChecked: null,
                videoCount: 0,
                createdAt: new Date().toISOString()
            };

            this.subscriptions.push(subscription);
            this.saveSubscriptions();
            return subscription;
        }

        /**
         * Unsubscribe from channel
         */
        unsubscribe(channelId) {
            this.subscriptions = this.subscriptions.filter(s => s.channelId !== channelId);
            this.saveSubscriptions();
        }

        /**
         * Get all subscriptions
         */
        getSubscriptions() {
            return this.subscriptions;
        }

        /**
         * Check subscriptions for new videos
         */
        async checkSubscriptions() {
            const results = [];
            
            for (const sub of this.subscriptions) {
                if (!sub.enabled) continue;

                try {
                    // Simulate checking (in real app, this would call API)
                    const response = await fetch(`/api/playlist_videos?playlist_id=${sub.channelId}`);
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.videos && data.videos.length > sub.videoCount) {
                            const newVideos = data.videos.length - sub.videoCount;
                            
                            // Add notification
                            this.addNotification(
                                `New videos from ${sub.channelName}`,
                                `${newVideos} new video${newVideos > 1 ? 's' : ''} added!`,
                                'video',
                                '/playlist/' + sub.channelId,
                                sub.channelId
                            );

                            sub.videoCount = data.videos.length;
                            sub.lastChecked = new Date().toISOString();
                        }
                    }
                } catch (e) {
                    console.error('Error checking subscription:', e);
                }
            }

            this.saveSubscriptions();
            return results;
        }
    }

    // Create global instance
    window.notificationsManager = new NotificationsManager();

    /**
     * Initialize notifications UI
     */
    function initNotifications() {
        console.log('Notifications system initialized');
        window.notificationsManager.updateBadge();
        
        // Request notification permission on first visit
        if (window.notificationsManager.permission === 'default') {
            setTimeout(() => {
                window.notificationsManager.requestPermission();
            }, 5000);
        }
    }

    /**
     * Create notifications panel
     */
    window.createNotificationsPanel = function() {
        const panel = document.createElement('div');
        panel.id = 'notificationsPanel';
        panel.className = 'notifications-panel';
        panel.innerHTML = `
            <div class="notifications-header">
                <h3><i class="fas fa-bell"></i> Notifications</h3>
                <div class="notifications-actions">
                    <button class="btn-icon" onclick="markAllAsRead()" title="Mark all as read">
                        <i class="fas fa-check-double"></i>
                    </button>
                    <button class="btn-icon" onclick="clearAllNotifications()" title="Clear all">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-icon" onclick="closeNotificationsPanel()" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="notifications-list" id="notificationsList">
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </div>
            </div>
        `;
        return panel;
    };

    /**
     * Toggle notifications panel
     */
    window.toggleNotificationsPanel = function() {
        const existing = document.getElementById('notificationsPanel');
        if (existing) {
            existing.remove();
            return;
        }

        const panel = window.createNotificationsPanel();
        document.body.appendChild(panel);
        window.refreshNotificationsList();
    };

    /**
     * Close notifications panel
     */
    window.closeNotificationsPanel = function() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.remove();
        }
    };

    /**
     * Refresh notifications list
     */
    window.refreshNotificationsList = function() {
        const list = document.getElementById('notificationsList');
        if (!list) return;

        const notifications = window.notificationsManager.getRecent(20);
        
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                    <small>We'll notify you when new videos are added</small>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                 onclick="handleNotificationClick('${notif.id}', '${notif.link || ''}')">
                <div class="notification-icon ${notif.type}">
                    <i class="fas fa-${window.getNotificationIconClass(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(notif.title)}</div>
                    <div class="notification-message">${escapeHtml(notif.message)}</div>
                    <div class="notification-time">${formatTimeAgo(notif.createdAt)}</div>
                </div>
                <button class="notification-delete" onclick="event.stopPropagation(); deleteNotification('${notif.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    };

    /**
     * Handle notification click
     */
    window.handleNotificationClick = function(notificationId, link) {
        window.notificationsManager.markAsRead(notificationId);
        if (link) {
            window.location.href = link;
        }
        window.refreshNotificationsList();
    };

    /**
