/**
 * VideoHub - Usage Analytics System
 * Detailed statistics on viewing habits, most watched, time spent
 */

(function() {
    'use strict';

    const ANALYTICS_KEY = 'videohub_analytics';
    const SESSION_KEY = 'videohub_session';

    /**
     * Analytics Manager Class
     */
    class AnalyticsManager {
        constructor() {
            this.db = this.loadAnalytics();
            this.session = this.loadSession();
            this.currentVideo = null;
            this.videoStartTime = null;
        }

        /**
         * Load analytics from localStorage
         */
        loadAnalytics() {
            try {
                const data = localStorage.getItem(ANALYTICS_KEY);
                return data ? JSON.parse(data) : {
                    videosWatched: 0,
                    totalWatchTime: 0,
                    lastWatchDate: null,
                    dailyStats: {},
                    weeklyStats: {},
                    videoStats: {},
                    folderStats: {},
                    sessionCount: 0,
                    totalSessions: 0
                };
            } catch (e) {
                console.error('Error loading analytics:', e);
                return this.getEmptyAnalytics();
            }
        }

        /**
         * Load current session
         */
        loadSession() {
            try {
                const data = localStorage.getItem(SESSION_KEY);
                return data ? JSON.parse(data) : {
                    startTime: Date.now(),
                    videosWatched: 0,
                    watchTime: 0,
                    videos: []
                };
            } catch (e) {
                return { startTime: Date.now(), videosWatched: 0, watchTime: 0, videos: [] };
            }
        }

        /**
         * Save analytics
         */
        saveAnalytics() {
            try {
                localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.db));
            } catch (e) {
                console.error('Error saving analytics:', e);
            }
        }

        /**
         * Save current session
         */
        saveSession() {
            try {
                localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
            } catch (e) {
                console.error('Error saving session:', e);
            }
        }

        /**
         * Get empty analytics object
         */
        getEmptyAnalytics() {
            return {
                videosWatched: 0,
                totalWatchTime: 0,
                lastWatchDate: null,
                dailyStats: {},
                weeklyStats: {},
                videoStats: {},
                folderStats: {},
                sessionCount: 0,
                totalSessions: 0
            };
        }

        /**
         * Track video watch start
         */
        startWatching(videoId, videoTitle, folderName, duration) {
            this.currentVideo = {
                id: videoId,
                title: videoTitle,
                folder: folderName,
                duration: duration,
                startTime: Date.now()
            };
            this.videoStartTime = Date.now();
        }

        /**
         * Track video watch end
         */
        stopWatching(watchPercentage) {
            if (!this.currentVideo) return;

            const watchTime = (Date.now() - this.videoStartTime) / 1000; // seconds
            const today = new Date().toISOString().split('T')[0];
            const week = this.getWeekNumber(new Date());

            // Update video stats
            if (!this.db.videoStats[this.currentVideo.id]) {
                this.db.videoStats[this.currentVideo.id] = {
                    title: this.currentVideo.title,
                    folder: this.currentVideo.folder,
                    watchCount: 0,
                    totalWatchTime: 0,
                    lastWatched: null,
                    avgWatchPercentage: 0
                };
            }

            const videoStat = this.db.videoStats[this.currentVideo.id];
            videoStat.watchCount++;
            videoStat.totalWatchTime += watchTime;
            videoStat.lastWatched = today;
            videoStat.avgWatchPercentage = 
                ((videoStat.avgWatchPercentage * (videoStat.watchCount - 1)) + watchPercentage) / videoStat.watchCount;

            // Update folder stats
            if (!this.db.folderStats[this.currentVideo.folder]) {
                this.db.folderStats[this.currentVideo.folder] = {
                    videoCount: 0,
                    totalWatchTime: 0
                };
            }
            this.db.folderStats[this.currentVideo.folder].videoCount++;
            this.db.folderStats[this.currentVideo.folder].totalWatchTime += watchTime;

            // Update daily stats
            if (!this.db.dailyStats[today]) {
                this.db.dailyStats[today] = {
                    videosWatched: 0,
                    watchTime: 0
                };
            }
            this.db.dailyStats[today].videosWatched++;
            this.db.dailyStats[today].watchTime += watchTime;

            // Update weekly stats
            const weekKey = `${new Date().getFullYear()}-W${week}`;
            if (!this.db.weeklyStats[weekKey]) {
                this.db.weeklyStats[weekKey] = {
                    videosWatched: 0,
                    watchTime: 0
                };
            }
            this.db.weeklyStats[weekKey].videosWatched++;
            this.db.weeklyStats[weekKey].watchTime += watchTime;

            // Update global stats
            this.db.videosWatched++;
            this.db.totalWatchTime += watchTime;
            this.db.lastWatchDate = today;

            // Update session
            this.session.videosWatched++;
            this.session.watchTime += watchTime;
            this.session.videos.push({
                id: this.currentVideo.id,
                title: this.currentVideo.title,
                watchTime: watchTime,
                percentage: watchPercentage,
                timestamp: Date.now()
            });

            // Save all data
            this.saveAnalytics();
            this.saveSession();

            // Clear current video
            this.currentVideo = null;
            this.videoStartTime = null;
        }

        /**
         * Get week number
         */
        getWeekNumber(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }

        /**
         * Get dashboard statistics
         */
        getDashboardStats() {
            const today = new Date().toISOString().split('T')[0];
            const week = this.getWeekNumber(new Date());
            const weekKey = `${new Date().getFullYear()}-W${week}`;

            // Calculate today's stats
            const todayStats = this.db.dailyStats[today] || { videosWatched: 0, watchTime: 0 };
            
            // Calculate this week's stats
            const weekStats = this.db.weeklyStats[weekKey] || { videosWatched: 0, watchTime: 0 };

            // Get top watched videos
            const topVideos = Object.entries(this.db.videoStats)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.watchCount - a.watchCount)
                .slice(0, 5);

            // Get top folders
            const topFolders = Object.entries(this.db.folderStats)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.videoCount - a.videoCount)
                .slice(0, 5);

            // Calculate streak (consecutive days)
            let currentStreak = 0;
            let checkDate = new Date();
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (this.db.dailyStats[dateStr] && this.db.dailyStats[dateStr].videosWatched > 0) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (dateStr === today && currentStreak === 0) {
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
                if (currentStreak > 365) break; // Max 1 year
            }

            return {
                totalVideosWatched: this.db.videosWatched,
                totalWatchTime: this.formatTime(this.db.totalWatchTime),
                totalWatchTimeSeconds: this.db.totalWatchTime,
                todayVideos: todayStats.videosWatched,
                todayWatchTime: this.formatTime(todayStats.watchTime),
                weekVideos: weekStats.videosWatched,
                weekWatchTime: this.formatTime(weekStats.watchTime),
                currentStreak: currentStreak,
                topVideos: topVideos,
                topFolders: topFolders,
                sessionVideos: this.session.videosWatched,
                sessionWatchTime: this.formatTime(this.session.watchTime),
                lastWatchDate: this.db.lastWatchDate
            };
        }

        /**
         * Format time in human readable format
         */
        formatTime(seconds) {
            if (seconds < 60) {
                return `${Math.round(seconds)}s`;
            } else if (seconds < 3600) {
                const mins = Math.floor(seconds / 60);
                const secs = Math.round(seconds % 60);
                return `${mins}m ${secs}s`;
            } else if (seconds < 86400) {
                const hours = Math.floor(seconds / 3600);
                const mins = Math.round((seconds % 3600) / 60);
                return `${hours}h ${mins}m`;
            } else {
                const days = Math.floor(seconds / 86400);
                const hours = Math.round((seconds % 86400) / 3600);
                return `${days}d ${hours}h`;
            }
        }

        /**
         * Get weekly chart data
         */
        getWeeklyChartData() {
            const days = [];
            const today = new Date();
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = this.db.dailyStats[dateStr] || { videosWatched: 0, watchTime: 0 };
                
                days.push({
                    date: dateStr,
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    videos: dayData.videosWatched,
                    watchTime: dayData.watchTime,
                    formattedTime: this.formatTime(dayData.watchTime)
                });
            }
            
            return days;
        }

        /**
         * Export analytics data
         */
        exportData() {
            return {
                exportDate: new Date().toISOString(),
                analytics: this.db,
                session: this.session
            };
        }

        /**
         * Clear all analytics
         */
        clearAll() {
            this.db = this.getEmptyAnalytics();
            this.session = { startTime: Date.now(), videosWatched: 0, watchTime: 0, videos: [] };
            this.saveAnalytics();
            this.saveSession();
        }
    }

    // Create global instance
    window.analyticsManager = new AnalyticsManager();

    /**
     * Initialize analytics on page
     */
    function initAnalytics() {
        // Update stats widget if exists
        updateStatsWidget();
        
        // Track session start
        console.log('📊 Analytics system initialized');
    }

    /**
     * Update stats widget
     */
    function updateStatsWidget() {
        const statsWidget = document.getElementById('analyticsWidget');
        if (!statsWidget) return;

        const stats = window.analyticsManager.getDashboardStats();
        
        statsWidget.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-icon"><i class="fas fa-play-circle"></i></div>
                    <div class="stat-value">${stats.totalVideosWatched}</div>
                    <div class="stat-label">Total Videos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${stats.totalWatchTime}</div>
                    <div class="stat-label">Total Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon"><i class="fas fa-fire"></i></div>
                    <div class="stat-value">${stats.currentStreak}</div>
                    <div class="stat-label">Day Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
                    <div class="stat-value">${stats.todayVideos}</div>
                    <div class="stat-label">Today</div>
                </div>
            </div>
        `;
    }

    /**
     * Start tracking video
     */
    window.startVideoTracking = function(videoId, title, folder, duration) {
        window.analyticsManager.startWatching(videoId, title, folder, duration);
    };

    /**
     * Stop tracking video
     */
    window.stopVideoTracking = function(watchPercentage) {
        window.analyticsManager.stopWatching(watchPercentage);
        updateStatsWidget();
    };

    /**
     * Get analytics dashboard data
     */
    window.getAnalyticsDashboard = function() {
        return window.analyticsManager.getDashboardStats();
    };

    /**
     * Get weekly chart data
     */
    window.getWeeklyChart = function() {
        return window.analyticsManager.getWeeklyChartData();
    };

    /**
     * Export analytics
     */
    window.exportAnalytics = function() {
        const data = window.analyticsManager.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `videohub-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Clear analytics
     */
    window.clearAnalytics = function() {
        if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
            window.analyticsManager.clearAll();
            updateStatsWidget();
            alert('Analytics cleared!');
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }

    // Add styles for analytics widget
    const style = document.createElement('style');
    style.textContent = `
        #analyticsWidget {
            background: var(--card-bg);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border: 1px solid var(--border-color);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
        }
        
        .stat-item {
            text-align: center;
            padding: 1rem;
            background: var(--bg-color);
            border-radius: 8px;
            transition: transform 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateY(-2px);
        }
        
        .stat-icon {
            font-size: 1.5rem;
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--text-primary);
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 0.25rem;
        }
        
        .analytics-chart {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
            padding: 1rem;
            background: var(--bg-color);
            border-radius: 8px;
        }
        
        .chart-day {
            flex: 1;
            text-align: center;
            padding: 0.5rem;
        }
        
        .chart-bar {
            height: 60px;
            background: var(--primary-color);
            border-radius: 4px;
            margin-bottom: 0.5rem;
            transition: height 0.3s ease;
        }
        
        .chart-label {
            font-size: 0.7rem;
            color: var(--text-secondary);
        }
        
        .chart-value {
            font-size: 0.75rem;
            font-weight: bold;
            color: var(--text-primary);
        }
    `;
    document.head.appendChild(style);

})();

