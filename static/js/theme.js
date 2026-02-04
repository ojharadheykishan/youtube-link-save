/**
 * VideoHub - Dark/Light Theme Toggle System
 * User-controllable theme switching with localStorage persistence
 */

(function() {
    'use strict';

    // Theme configuration
    const THEME_KEY = 'videohub_theme';
    const DEFAULT_THEME = 'dark'; // Default to dark mode
    
    // CSS variables for themes
    const themes = {
        dark: {
            '--bg-color': '#0f0f0f',
            '--card-bg': '#1e1e1e',
            '--text-primary': '#ffffff',
            '--text-secondary': '#aaaaaa',
            '--border-color': '#333333',
            '--primary-color': '#ff0000',
            '--accent-color': '#ff6b6b',
            '--hover-bg': '#2a2a2a',
            '--shadow-color': 'rgba(0, 0, 0, 0.3)',
            '--header-bg': '#1a1a1a',
            '--sidebar-bg': '#1a1a1a',
            '--modal-bg': '#2a2a2a',
            '--input-bg': '#333333',
            '--scrollbar-bg': '#444444'
        },
        light: {
            '--bg-color': '#f8f9fa',
            '--card-bg': '#ffffff',
            '--text-primary': '#212529',
            '--text-secondary': '#6c757d',
            '--border-color': '#dee2e6',
            '--primary-color': '#dc3545',
            '--accent-color': '#e74c3c',
            '--hover-bg': '#f1f3f5',
            '--shadow-color': 'rgba(0, 0, 0, 0.1)',
            '--header-bg': '#ffffff',
            '--sidebar-bg': '#ffffff',
            '--modal-bg': '#ffffff',
            '--input-bg': '#f8f9fa',
            '--scrollbar-bg': '#c1c1c1'
        }
    };

    /**
     * Apply theme to document
     */
    function applyTheme(theme) {
        const root = document.documentElement;
        const themeData = themes[theme];
        
        if (!themeData) {
            console.warn(`Theme '${theme}' not found, using dark mode`);
            themeData = themes.dark;
        }
        
        // Apply CSS variables
        Object.keys(themeData).forEach(key => {
            root.style.setProperty(key, themeData[key]);
        });
        
        // Add theme class to body
        document.body.classList.remove('dark-theme', 'light-theme');
        document.body.classList.add(`${theme}-theme`);
        
        // Save to localStorage
        localStorage.setItem(THEME_KEY, theme);
        
        // Update toggle button icon
        updateToggleIcon(theme);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
    }

    /**
     * Get current theme
     */
    function getCurrentTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved && themes[saved]) {
            return saved;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        
        return DEFAULT_THEME;
    }

    /**
     * Toggle between themes
     */
    function toggleTheme() {
        const current = getCurrentTheme();
        const newTheme = current === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    /**
     * Update toggle button icon
     */
    function updateToggleIcon(theme) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'fas fa-sun';
                    toggleBtn.title = 'Switch to Light Mode';
                } else {
                    icon.className = 'fas fa-moon';
                    toggleBtn.title = 'Switch to Dark Mode';
                }
            }
        }
    }

    /**
     * Initialize theme toggle button
     */
    function initThemeToggle() {
        // Create toggle button if not exists
        let toggleBtn = document.getElementById('themeToggle');
        
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'themeToggle';
            toggleBtn.className = 'btn-icon theme-toggle';
            toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            
            // Add to header actions
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(toggleBtn, headerActions.firstChild);
            }
        }
        
        // Add click event
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleTheme();
            
            // Show notification
            const currentTheme = getCurrentTheme();
            showNotification(`Switched to ${currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode`);
        });
        
        // Add tooltip
        toggleBtn.title = 'Toggle Dark/Light Mode';
        
        // Apply saved theme
        applyTheme(getCurrentTheme());
    }

    /**
     * Show notification
     */
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--card-bg);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 20px var(--shadow-color);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            border: 1px solid var(--border-color);
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * Add smooth transition for theme change
     */
    function addThemeTransitionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .dark-theme, .light-theme {
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            
            .dark-theme *,
            .light-theme * {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }
            
            .video-card,
            .folder-card,
            .add-video-section,
            .modal-content,
            .notification {
                transition: all 0.3s ease;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Theme toggle button styles */
            .theme-toggle {
                position: relative;
            }
            
            .theme-toggle:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            
            .light-theme .theme-toggle:hover {
                background: rgba(0, 0, 0, 0.05) !important;
            }
            
            /* Dark mode specific styles */
            .dark-theme ::-webkit-scrollbar {
                width: 8px;
            }
            
            .dark-theme ::-webkit-scrollbar-track {
                background: #1a1a1a;
            }
            
            .dark-theme ::-webkit-scrollbar-thumb {
                background: #444444;
                border-radius: 4px;
            }
            
            .dark-theme ::-webkit-scrollbar-thumb:hover {
                background: #555555;
            }
            
            /* Light mode specific styles */
            .light-theme ::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            
            .light-theme ::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            
            .light-theme ::-webkit-scrollbar-thumb:hover {
                background: #a1a1a1;
            }
            
            /* Enhanced video cards for dark mode */
            .dark-theme .video-card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
            }
            
            .dark-theme .video-card:hover {
                border-color: var(--primary-color);
                box-shadow: 0 8px 30px rgba(255, 0, 0, 0.15);
            }
            
            /* Enhanced video cards for light mode */
            .light-theme .video-card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }
            
            .light-theme .video-card:hover {
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                transform: translateY(-4px);
            }
            
            /* Folder cards */
            .dark-theme .folder-card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
            }
            
            .light-theme .folder-card {
                background: var(--card-bg);
                border: 1px solid var(--border-color);
            }
            
            /* Header styles */
            .dark-theme header {
                background: var(--header-bg);
                border-bottom: 1px solid var(--border-color);
            }
            
            .light-theme header {
                background: var(--header-bg);
                border-bottom: 1px solid var(--border-color);
            }
            
            /* Sidebar styles */
            .dark-theme .sidebar {
                background: var(--sidebar-bg);
                border-right: 1px solid var(--border-color);
            }
            
            .light-theme .sidebar {
                background: var(--sidebar-bg);
                border-right: 1px solid var(--border-color);
            }
            
            /* Form elements */
            .dark-theme input,
            .dark-theme select,
            .dark-theme textarea {
                background: var(--input-bg);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
            }
            
            .light-theme input,
            .light-theme select,
            .light-theme textarea {
                background: var(--input-bg);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
            }
            
            /* Modal styles */
            .dark-theme .modal-content {
                background: var(--modal-bg);
                border: 1px solid var(--border-color);
            }
            
            .light-theme .modal-content {
                background: var(--modal-bg);
                border: 1px solid var(--border-color);
            }
            
            /* Button styles */
            .dark-theme .btn-primary {
                background: linear-gradient(45deg, #ff0000, #cc0000);
            }
            
            .light-theme .btn-primary {
                background: linear-gradient(45deg, #dc3545, #c82333);
            }
            
            /* Search bar */
            .dark-theme .search-bar input {
                background: #2a2a2a;
                border: 1px solid #333;
            }
            
            .light-theme .search-bar input {
                background: #f1f3f5;
                border: 1px solid #dee2e6;
            }
            
            /* Hero section adjustments */
            .dark-theme .hero-section {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            }
            
            .light-theme .hero-section {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            
            /* Add video section */
            .dark-theme .add-video-section {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
            }
            
            .light-theme .add-video-section {
                background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(238, 90, 36, 0.1));
                border: 1px solid var(--border-color);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Watch page specific theme adjustments
     */
    function adjustWatchPageTheme() {
        const watchContainer = document.querySelector('.watch-container');
        if (watchContainer) {
            watchContainer.style.background = 'var(--bg-color)';
        }
        
        const videoInfoBox = document.querySelector('.video-info-box');
        if (videoInfoBox) {
            videoInfoBox.style.background = 'rgba(30, 30, 30, 0.8)';
            videoInfoBox.style.border = '1px solid var(--border-color)';
        }
        
        const videoDetails = document.querySelector('.video-details');
        if (videoDetails) {
            videoDetails.style.background = 'rgba(30, 30, 30, 0.8)';
            videoDetails.style.border = '1px solid var(--border-color)';
        }
    }

    /**
     * Initialize on DOM ready
     */
    function init() {
        addThemeTransitionStyles();
        initThemeToggle();
        
        // Adjust watch page if on watch page
        if (window.location.pathname.includes('/watch/')) {
            adjustWatchPageTheme();
        }
        
        console.log('🎨 Theme system initialized');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for external use
    window.VideoHubTheme = {
        getCurrentTheme,
        toggleTheme,
        applyTheme,
        themes: Object.keys(themes)
    };

})();

