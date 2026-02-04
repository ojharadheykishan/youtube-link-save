/**
 * VideoHub - PWA (Progressive Web App) System
 * Handles PWA functionality including install prompt, offline support
 */

(function() {
    'use strict';

    /**
     * PWA Manager Class
     */
    class PWAManager {
        constructor() {
            this.deferredPrompt = null;
            this.isInstalled = this.checkIsInstalled();
            this.init();
        }

        /**
         * Initialize PWA features
         */
        init() {
            // Register service worker
            this.registerServiceWorker();
            
            // Listen for install prompt
            this.listenInstallPrompt();
            
            // Listen for app installed event
            this.listenAppInstalled();
            
            // Check online/offline status
            this.listenNetworkStatus();
        }

        /**
         * Register service worker
         */
        async registerServiceWorker() {
            if (!('serviceWorker' in navigator)) {
                console.log('[PWA] Service Worker not supported');
                return;
            }

            try {
                const registration = await navigator.serviceWorker.register('/static/js/sw.js');
                console.log('[PWA] Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }

        /**
         * Listen for install prompt
         */
        listenInstallPrompt() {
            window.addEventListener('beforeinstallprompt', event => {
                console.log('[PWA] Install prompt triggered');
                
                // Prevent default prompt
                event.preventDefault();
                
                // Store for later use
                this.deferredPrompt = event;
                
                // Show install button
                this.showInstallButton();
            });
        }

        /**
         * Listen for app installed event
         */
        listenAppInstalled() {
            window.addEventListener('appinstalled', event => {
                console.log('[PWA] App installed');
                
                // Hide install button
                this.hideInstallButton();
                
                // Show success notification
                this.showInstalledNotification();
                
                // Reset deferred prompt
                this.deferredPrompt = null;
            });
        }

        /**
         * Listen for network status changes
         */
        listenNetworkStatus() {
            window.addEventListener('online', () => {
                console.log('[PWA] Network online');
                this.showNotification('You are back online!', 'success');
            });

            window.addEventListener('offline', () => {
                console.log('[PWA] Network offline');
                this.showNotification('You are offline. Some features may be limited.', 'warning');
            });
        }

        /**
         * Check if app is installed
         */
        checkIsInstalled() {
            return window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone === true ||
                   document.referrer.includes('android-app://');
        }

        /**
         * Show install button
         */
        showInstallButton() {
            // Check if already installed or prompted
            if (this.isInstalled || document.getElementById('pwaInstallButton')) {
                return;
            }

            // Create install button
            const button = document.createElement('div');
            button.id = 'pwaInstallButton';
            button.innerHTML = `
                <div class="pwa-install-content">
                    <i class="fas fa-download"></i>
                    <span>Install VideoHub App</span>
                </div>
                <button class="pwa-close" onclick="pwaManager.dismissInstall()">×</button>
            `;

            // Add styles
            button.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #ff0000, #cc0000);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                box-shadow: 0 8px 30px rgba(255, 0, 0, 0.4);
                z-index: 9998;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                animation: pwaSlideUp 0.3s ease-out;
            `;

            // Add animation styles
            if (!document.getElementById('pwaStyles')) {
                const style = document.createElement('style');
                style.id = 'pwaStyles';
                style.textContent = `
                    @keyframes pwaSlideUp {
                        from {
                            opacity: 0;
                            transform: translateX(-50%) translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                    }
                    .pwa-install-content {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 600;
                    }
                    .pwa-install-content i {
                        font-size: 1.2rem;
                    }
                    .pwa-close {
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 1.2rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-left: 10px;
                        transition: background 0.2s;
                    }
                    .pwa-close:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                `;
                document.head.appendChild(style);
            }

            button.onclick = () => this.promptInstall();

            document.body.appendChild(button);
        }

        /**
         * Hide install button
         */
        hideInstallButton() {
            const button = document.getElementById('pwaInstallButton');
            if (button) {
                button.style.animation = 'pwaSlideDown 0.3s ease-in forwards';
                setTimeout(() => button.remove(), 300);
            }
        }

        /**
         * Dismiss install prompt
         */
        dismissInstall() {
            this.hideInstallButton();
            // Store that user dismissed to not show again for a while
            localStorage.setItem('pwa_install_dismissed', Date.now().toString());
        }

        /**
         * Prompt user to install
         */
        async promptInstall() {
            if (!this.deferredPrompt) {
                console.log('[PWA] No install prompt available');
                return false;
            }

            // Show prompt
            this.deferredPrompt.prompt();

            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log('[PWA] User choice:', outcome);

            // Clear stored prompt
            this.deferredPrompt = null;
            this.hideInstallButton();

            if (outcome === 'accepted') {
                console.log('[PWA] User accepted install');
                return true;
            } else {
                console.log('[PWA] User dismissed install');
                return false;
            }
        }

        /**
         * Show update notification
         */
        showUpdateNotification() {
            const notification = document.createElement('div');
            notification.id = 'pwaUpdateNotification';
            notification.innerHTML = `
                <div>
                    <strong>New version available!</strong>
                    <p>Refresh to get the latest features.</p>
                </div>
                <button onclick="location.reload()">Refresh</button>
            `;

            notification.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: #1a1a1a;
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 16px;
                animation: pwaSlideUp 0.3s ease-out;
            `;

            document.body.appendChild(notification);

            // Auto-hide after 10 seconds
            setTimeout(() => {
                notification.style.animation = 'pwaSlideDown 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }, 10000);
        }

        /**
         * Show installed notification
         */
        showInstalledNotification() {
            this.showNotification('App installed successfully!', 'success');
        }

        /**
         * Show in-app notification
         */
        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `pwa-notification ${type}`;
            notification.textContent = message;
            
            const colors = {
                'success': '#28a745',
                'warning': '#ffc107',
                'error': '#dc3545',
                'info': '#17a2b8'
            };

            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: ${colors[type] || colors['info']};
                color: ${type === 'warning' ? '#000' : '#fff'};
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
                font-weight: 500;
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        /**
         * Check if app can be installed
         */
        canInstall() {
            return !!this.deferredPrompt && !this.isInstalled;
        }

        /**
         * Get installation status
         */
        getStatus() {
            return {
                supported: 'serviceWorker' in navigator,
                installed: this.isInstalled,
                canInstall: this.canInstall(),
                online: navigator.onLine
            };
        }
    }

    // Create global instance
    window.pwaManager = new PWAManager();

    /**
     * Initialize PWA
     */
    function initPWA() {
        console.log('[PWA] PWA System initialized');
        console.log('[PWA] Status:', window.pwaManager.getStatus());
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPWA);
    } else {
        initPWA();
    }

    // Export functions for external use
    window.installPWA = function() {
        return window.pwaManager.promptInstall();
    };

    window.getPWAStatus = function() {
        return window.pwaManager.getStatus();
    };

})();
