// Random popup by Radhey Kishan Ojha
document.addEventListener('DOMContentLoaded', function() {
    // Popup configuration
    const popupConfig = {
        title: "Made By Radhey Kishan Ojha",
        message: "This amazing YouTube-style video management system was created by Radhey Kishan Ojha. Enjoy the seamless video experience!",
        icon: "fa-code",
        color: "linear-gradient(135deg, #667eea, #764ba2)",
        delay: 5000, // Show 5 seconds after page load (login)
        duration: 6000, // Show for 6 seconds
        sound: true,
        repeatInterval: 30 * 60 * 1000 // 30 minutes in milliseconds
    };

    // Create popup element
    function createPopup() {
        const popup = document.createElement('div');
        popup.className = 'radhey-popup';
        popup.innerHTML = `
            <div class="radhey-popup-content">
                <div class="radhey-popup-header">
                    <div class="radhey-icon-wrapper">
                        <i class="fas ${popupConfig.icon}"></i>
                    </div>
                    <h3>${popupConfig.title}</h3>
                    <button class="radhey-popup-close" onclick="closePopup()">×</button>
                </div>
                <div class="radhey-popup-body">
                    <p>${popupConfig.message}</p>
                </div>
                <div class="radhey-popup-footer">
                    <button class="radhey-popup-btn" onclick="closePopup()">
                        <i class="fas fa-heart"></i> Thank you!
                    </button>
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
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }
            
            .radhey-popup.show {
                opacity: 1;
                pointer-events: all;
            }
            
            .radhey-popup-content {
                background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
                border-radius: 20px;
                padding: 2.5rem;
                max-width: 520px;
                width: 90%;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.08);
                transform: scale(0.8) translateY(20px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
                overflow: hidden;
            }

            .radhey-popup-content::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: ${popupConfig.color};
                border-radius: 20px 20px 0 0;
            }
            
            .radhey-popup.show .radhey-popup-content {
                transform: scale(1);
            }
            
            .radhey-popup-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1.5rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                position: relative;
            }

            .radhey-icon-wrapper {
                width: 50px;
                height: 50px;
                border-radius: 12px;
                background: ${popupConfig.color};
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 1rem;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                position: relative;
                overflow: hidden;
            }

            .radhey-icon-wrapper::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transform: rotate(45deg);
                transition: all 0.6s ease;
            }

            .radhey-icon-wrapper:hover::before {
                transform: rotate(45deg) translateX(100%);
            }

            .radhey-popup-header i {
                font-size: 1.5rem;
                color: white;
                position: relative;
                z-index: 1;
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
                padding: 0.875rem 2rem;
                border-radius: 12px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                position: relative;
                overflow: hidden;
            }

            .radhey-popup-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s ease;
            }

            .radhey-popup-btn:hover::before {
                left: 100%;
            }

            .radhey-popup-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
            }

            .radhey-popup-btn:active {
                transform: translateY(-1px);
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

    // Show popup once after login (short delay)
    setTimeout(showPopup, popupConfig.delay);

    // Show popup every 30 minutes
    setInterval(() => {
        const popup = document.querySelector('.radhey-popup');
        if (!popup || !popup.classList.contains('show')) {
            showPopup();
        }
    }, popupConfig.repeatInterval);
});