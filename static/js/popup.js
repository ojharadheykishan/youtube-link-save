// Random popup by Radhey Kishan Ojha
document.addEventListener('DOMContentLoaded', function() {
    // Popup configuration
    const popupConfig = {
        title: "Made by Radhey Kishan Ojha",
        message: "This amazing YouTube-style video management system was created by Radhey Kishan Ojha. Enjoy the seamless video experience!",
        icon: "fa-heart",
        color: "linear-gradient(135deg, #ff6b6b, #ee5a24)",
        delay: Math.random() * 30000 + 10000, // Random delay between 10-40 seconds
        duration: 5000, // Show for 5 seconds
        sound: true
    };

    // Create popup element
    function createPopup() {
        const popup = document.createElement('div');
        popup.className = 'radhey-popup';
        popup.innerHTML = `
            <div class="radhey-popup-content">
                <div class="radhey-popup-header">
                    <i class="fas ${popupConfig.icon}"></i>
                    <h3>${popupConfig.title}</h3>
                    <button class="radhey-popup-close" onclick="closePopup()">×</button>
                </div>
                <div class="radhey-popup-body">
                    <p>${popupConfig.message}</p>
                </div>
                <div class="radhey-popup-footer">
                    <button class="radhey-popup-btn" onclick="closePopup()">Thank you!</button>
                </div>
            </div>
        `;
        
        // Add styles
        const styles = `
            .radhey-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(5px);
            }
            
            .radhey-popup.show {
                opacity: 1;
                pointer-events: all;
            }
            
            .radhey-popup-content {
                background: #212121;
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transform: scale(0.8);
                transition: transform 0.3s ease;
            }
            
            .radhey-popup.show .radhey-popup-content {
                transform: scale(1);
            }
            
            .radhey-popup-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .radhey-popup-header i {
                font-size: 2rem;
                background: ${popupConfig.color};
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-right: 0.5rem;
            }
            
            .radhey-popup-header h3 {
                margin: 0;
                font-size: 1.5rem;
                background: ${popupConfig.color};
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                flex: 1;
            }
            
            .radhey-popup-close {
                background: none;
                border: none;
                color: #aaa;
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            }
            
            .radhey-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .radhey-popup-body {
                margin-bottom: 1.5rem;
            }
            
            .radhey-popup-body p {
                margin: 0;
                color: #ccc;
                line-height: 1.6;
                font-size: 1rem;
            }
            
            .radhey-popup-footer {
                display: flex;
                justify-content: flex-end;
            }
            
            .radhey-popup-btn {
                background: ${popupConfig.color};
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
            }
            
            .radhey-popup-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
            }
            
            /* Animation */
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            .radhey-popup.show .radhey-popup-content {
                animation: pulse 2s infinite;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .radhey-popup-content {
                    padding: 1.5rem;
                    width: 95%;
                }
                
                .radhey-popup-header h3 {
                    font-size: 1.2rem;
                }
                
                .radhey-popup-body p {
                    font-size: 0.9rem;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        
        document.body.appendChild(popup);
        return popup;
    }

    // Show popup
    function showPopup() {
        const popup = document.querySelector('.radhey-popup') || createPopup();
        
        // Add show class
        popup.classList.add('show');
        
        // Auto hide after duration
        setTimeout(() => {
            if (popup.classList.contains('show')) {
                closePopup();
            }
        }, popupConfig.duration);
        
        // Play sound if enabled
        if (popupConfig.sound) {
            playNotificationSound();
        }
    }

    // Close popup
    window.closePopup = function() {
        const popup = document.querySelector('.radhey-popup');
        if (popup) {
            popup.classList.remove('show');
            // Remove from DOM after animation
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }
    };

    // Play notification sound
    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio playback not supported');
        }
    }

    // Attach click outside to close
    document.addEventListener('click', function(event) {
        const popup = document.querySelector('.radhey-popup');
        const content = document.querySelector('.radhey-popup-content');
        
        if (popup && popup.classList.contains('show') && 
            event.target === popup && !content.contains(event.target)) {
            closePopup();
        }
    });

    // Show popup after random delay
    setTimeout(showPopup, popupConfig.delay);

    // Also show on certain events (like page idle)
    let idleTime = 0;
    const idleInterval = setInterval(() => {
        idleTime++;
        if (idleTime > 30) { // 30 seconds idle
            const popup = document.querySelector('.radhey-popup');
            if (!popup || !popup.classList.contains('show')) {
                showPopup();
            }
            idleTime = 0;
        }
    }, 1000);

    // Reset idle time on activity
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, () => idleTime = 0);
    });
});