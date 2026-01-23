/**
 * Advanced Custom Video Player - FIXED VERSION
 * Features: Speed control (0.25x - 4x), Quality/Resolution options, Enhanced controls
 */

class CustomVideoPlayer {
    constructor(videoElementId, containerId) {
        this.video = document.getElementById(videoElementId);
        this.container = document.getElementById(containerId);
        
        if (!this.video) {
            console.error('❌ Video element not found:', videoElementId);
            return;
        }

        // Prevent double initialization
        if (this.video.dataset.playerInit === 'true') {
            console.log('⚠️ Player already initialized');
            return;
        }

        console.log('✅ Initializing custom player...');
        this.currentQuality = 'auto';
        this.initPlayer();
        this.setupEventListeners();
        this.video.dataset.playerInit = 'true';
    }

    initPlayer() {
        // Remove existing controls if any
        const existingControls = this.container?.querySelector('.custom-player-controls');
        if (existingControls) {
            existingControls.remove();
        }

        // Create controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'custom-player-controls';
        controlsContainer.innerHTML = `
            <div class="player-control-row">
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        <div class="progress-handle"></div>
                    </div>
                    <div class="time-display">
                        <span class="current-time">00:00</span> / <span class="duration">00:00</span>
                    </div>
                </div>
            </div>

            <div class="player-control-row controls-bottom">
                <div class="controls-left">
                    <button class="control-btn play-btn" title="Play/Pause">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="volume-control">
                        <button class="control-btn volume-btn" title="Volume">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <input type="range" class="volume-slider" min="0" max="100" value="100">
                    </div>
                    <span class="time-display-bottom">
                        <span class="current-time-bottom">00:00</span> / <span class="duration-bottom">00:00</span>
                    </span>
                </div>

                <div class="controls-right">
                    <div class="control-group">
                        <button class="control-btn speed-btn" title="Speed">
                            <span class="speed-label">1x</span>
                        </button>
                        <div class="dropdown-menu speed-menu">
                            <div class="menu-title">Speed</div>
                            <button class="menu-item speed-item" data-speed="0.25">0.25x</button>
                            <button class="menu-item speed-item" data-speed="0.5">0.5x</button>
                            <button class="menu-item speed-item" data-speed="0.75">0.75x</button>
                            <button class="menu-item speed-item active" data-speed="1">1x</button>
                            <button class="menu-item speed-item" data-speed="1.25">1.25x</button>
                            <button class="menu-item speed-item" data-speed="1.5">1.5x</button>
                            <button class="menu-item speed-item" data-speed="1.75">1.75x</button>
                            <button class="menu-item speed-item" data-speed="2">2x</button>
                            <button class="menu-item speed-item" data-speed="2.5">2.5x</button>
                            <button class="menu-item speed-item" data-speed="3">3x</button>
                            <button class="menu-item speed-item" data-speed="4">4x</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <button class="control-btn quality-btn" title="Quality">
                            <span class="quality-label">Auto</span>
                        </button>
                        <div class="dropdown-menu quality-menu">
                            <div class="menu-title">Quality</div>
                            <button class="menu-item quality-item active" data-quality="auto">Auto</button>
                            <button class="menu-item quality-item" data-quality="4k">4K</button>
                            <button class="menu-item quality-item" data-quality="1440p">2K</button>
                            <button class="menu-item quality-item" data-quality="1080p">1080p</button>
                            <button class="menu-item quality-item" data-quality="720p">720p</button>
                            <button class="menu-item quality-item" data-quality="480p">480p</button>
                            <button class="menu-item quality-item" data-quality="360p">360p</button>
                            <button class="menu-item quality-item" data-quality="240p">240p</button>
                        </div>
                    </div>

                    <button class="control-btn pip-btn" title="PiP">
                        <i class="fas fa-window-restore"></i>
                    </button>

                    <button class="control-btn fullscreen-btn" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>
        `;

        // Append to container
        if (this.container) {
            this.container.appendChild(controlsContainer);
        } else {
            this.video.parentNode.insertBefore(controlsContainer, this.video.nextSibling);
        }
        
        this.controls = controlsContainer;
        this.setupControls();
        console.log('✅ Controls created');
    }

    setupControls() {
        if (!this.controls) return;

        // Play/Pause
        this.controls.querySelector('.play-btn')?.addEventListener('click', () => this.togglePlay());

        // Volume
        this.controls.querySelector('.volume-btn')?.addEventListener('click', () => this.toggleMute());
        this.controls.querySelector('.volume-slider')?.addEventListener('input', (e) => {
            this.video.volume = e.target.value / 100;
            this.updateVolumeIcon();
        });

        // Speed
        const speedBtn = this.controls.querySelector('.speed-btn');
        const speedMenu = this.controls.querySelector('.speed-menu');
        speedBtn?.addEventListener('click', () => {
            speedMenu?.classList.toggle('active');
            this.controls.querySelector('.quality-menu')?.classList.remove('active');
        });

        this.controls.querySelectorAll('.speed-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setSpeed(speed);
                this.controls.querySelectorAll('.speed-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                speedMenu?.classList.remove('active');
            });
        });

        // Quality
        const qualityBtn = this.controls.querySelector('.quality-btn');
        const qualityMenu = this.controls.querySelector('.quality-menu');
        qualityBtn?.addEventListener('click', () => {
            qualityMenu?.classList.toggle('active');
            speedMenu?.classList.remove('active');
        });

        this.controls.querySelectorAll('.quality-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const quality = e.target.dataset.quality;
                this.setQuality(quality);
                this.controls.querySelectorAll('.quality-item').forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                qualityMenu?.classList.remove('active');
            });
        });

        // PiP
        this.controls.querySelector('.pip-btn')?.addEventListener('click', () => this.togglePiP());

        // Fullscreen
        this.controls.querySelector('.fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

        // Progress
        const progressBar = this.controls.querySelector('.progress-bar');
        progressBar?.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.video.currentTime = Math.max(0, Math.min(percent * this.video.duration, this.video.duration));
        });

        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!this.controls.contains(e.target)) {
                speedMenu?.classList.remove('active');
                qualityMenu?.classList.remove('active');
            }
        });
    }

    setupEventListeners() {
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => this.updateDuration());
        this.video.addEventListener('play', () => this.updatePlayButtonState());
        this.video.addEventListener('pause', () => this.updatePlayButtonState());

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                this.toggleFullscreen();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                this.toggleMute();
            } else if (e.code === 'ArrowRight') {
                this.video.currentTime = Math.min(this.video.currentTime + 5, this.video.duration);
            } else if (e.code === 'ArrowLeft') {
                this.video.currentTime = Math.max(this.video.currentTime - 5, 0);
            } else if (e.code === 'ArrowUp') {
                e.preventDefault();
                this.video.volume = Math.min(this.video.volume + 0.1, 1);
                this.updateVolumeIcon();
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.video.volume = Math.max(this.video.volume - 0.1, 0);
                this.updateVolumeIcon();
            }
        });
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const btn = this.controls.querySelector('.volume-btn');
        const slider = this.controls.querySelector('.volume-slider');
        if (!btn || !slider) return;

        if (this.video.muted || this.video.volume === 0) {
            btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            slider.value = 0;
        } else if (this.video.volume < 0.5) {
            btn.innerHTML = '<i class="fas fa-volume-down"></i>';
            slider.value = this.video.volume * 100;
        } else {
            btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            slider.value = this.video.volume * 100;
        }
    }

    setSpeed(speed) {
        this.video.playbackRate = speed;
        const label = this.controls.querySelector('.speed-label');
        if (label) label.textContent = speed + 'x';
    }

    setQuality(quality) {
        this.currentQuality = quality;
        const label = this.controls.querySelector('.quality-label');
        if (label) label.textContent = quality.toUpperCase();
    }

    togglePiP() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (this.video.requestPictureInPicture) {
            this.video.requestPictureInPicture().catch(err => console.error('PiP failed:', err));
        }
    }

    toggleFullscreen() {
        const elem = this.container || this.video;
        if (!document.fullscreenElement && elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    updateProgress() {
        if (this.video.duration === 0) return;
        const progress = (this.video.currentTime / this.video.duration) * 100;
        const fill = this.controls.querySelector('.progress-fill');
        const handle = this.controls.querySelector('.progress-handle');
        if (fill) fill.style.width = progress + '%';
        if (handle) handle.style.left = progress + '%';
        this.updateTimeDisplay();
    }

    updateDuration() {
        const duration = this.formatTime(this.video.duration);
        this.controls.querySelectorAll('.duration, .duration-bottom').forEach(el => {
            el.textContent = duration;
        });
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.video.currentTime);
        this.controls.querySelectorAll('.current-time, .current-time-bottom').forEach(el => {
            el.textContent = current;
        });
    }

    updatePlayButtonState() {
        const btn = this.controls.querySelector('.play-btn');
        if (btn) btn.innerHTML = this.video.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

// Safe initialization
function initCustomPlayer() {
    const video = document.getElementById('html5Player');
    const container = document.getElementById('html5PlayerContainer');
    if (video && container && getComputedStyle(container).display !== 'none') {
        if (!video.dataset.playerInit) {
            window.customPlayer = new CustomVideoPlayer('html5Player', 'html5PlayerContainer');
            return true;
        }
    }
    return false;
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initCustomPlayer, 300));
} else {
    setTimeout(initCustomPlayer, 300);
}

window.initCustomPlayer = initCustomPlayer;
window.CustomVideoPlayer = CustomVideoPlayer;

    initPlayer() {
        // Create custom controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'custom-player-controls';
        controlsContainer.innerHTML = `
            <div class="player-control-row">
                <!-- Progress Bar -->
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        <div class="progress-handle"></div>
                    </div>
                    <div class="time-display">
                        <span class="current-time">00:00</span> / <span class="duration">00:00</span>
                    </div>
                </div>
            </div>

            <div class="player-control-row controls-bottom">
                <!-- Left Controls -->
                <div class="controls-left">
                    <button class="control-btn play-btn" title="Play/Pause">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="volume-control">
                        <button class="control-btn volume-btn" title="Volume">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <input type="range" class="volume-slider" min="0" max="100" value="100" title="Volume">
                    </div>
                    <span class="time-display-bottom">
                        <span class="current-time-bottom">00:00</span> / <span class="duration-bottom">00:00</span>
                    </span>
                </div>

                <!-- Right Controls -->
                <div class="controls-right">
                    <!-- Speed Control -->
                    <div class="control-group">
                        <button class="control-btn speed-btn" title="Playback Speed">
                            <span class="speed-label">1x</span>
                        </button>
                        <div class="dropdown-menu speed-menu">
                            <div class="menu-title">Playback Speed</div>
                            <button class="menu-item speed-item" data-speed="0.25">0.25x</button>
                            <button class="menu-item speed-item" data-speed="0.5">0.5x</button>
                            <button class="menu-item speed-item" data-speed="0.75">0.75x</button>
                            <button class="menu-item speed-item active" data-speed="1">1x (Normal)</button>
                            <button class="menu-item speed-item" data-speed="1.25">1.25x</button>
                            <button class="menu-item speed-item" data-speed="1.5">1.5x</button>
                            <button class="menu-item speed-item" data-speed="1.75">1.75x</button>
                            <button class="menu-item speed-item" data-speed="2">2x</button>
                            <button class="menu-item speed-item" data-speed="2.5">2.5x</button>
                            <button class="menu-item speed-item" data-speed="3">3x</button>
                            <button class="menu-item speed-item" data-speed="4">4x (Ultra)</button>
                        </div>
                    </div>

                    <!-- Quality Control -->
                    <div class="control-group">
                        <button class="control-btn quality-btn" title="Video Quality">
                            <span class="quality-label">Auto</span>
                        </button>
                        <div class="dropdown-menu quality-menu">
                            <div class="menu-title">Video Quality</div>
                            <button class="menu-item quality-item active" data-quality="auto">Auto (Recommended)</button>
                            <button class="menu-item quality-item" data-quality="4k">4K (2160p)</button>
                            <button class="menu-item quality-item" data-quality="1440p">2K (1440p)</button>
                            <button class="menu-item quality-item" data-quality="1080p">Full HD (1080p)</button>
                            <button class="menu-item quality-item" data-quality="720p">HD (720p)</button>
                            <button class="menu-item quality-item" data-quality="480p">SD (480p)</button>
                            <button class="menu-item quality-item" data-quality="360p">Low (360p)</button>
                            <button class="menu-item quality-item" data-quality="240p">Lowest (240p)</button>
                        </div>
                    </div>

                    <!-- Picture in Picture -->
                    <button class="control-btn pip-btn" title="Picture in Picture">
                        <i class="fas fa-window-restore"></i>
                    </button>

                    <!-- Fullscreen -->
                    <button class="control-btn fullscreen-btn" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
            </div>

            <div class="loading-spinner" style="display: none;">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        `;

        // Insert controls after video
        this.video.parentNode.insertBefore(controlsContainer, this.video.nextSibling);
        this.controls = controlsContainer;
        this.setupControls();
    }

    setupControls() {
        // Play/Pause Button
        const playBtn = this.controls.querySelector('.play-btn');
        playBtn.addEventListener('click', () => this.togglePlay());

        // Volume Control
        const volumeBtn = this.controls.querySelector('.volume-btn');
        const volumeSlider = this.controls.querySelector('.volume-slider');
        
        volumeBtn.addEventListener('click', () => this.toggleMute());
        volumeSlider.addEventListener('input', (e) => {
            this.video.volume = e.target.value / 100;
            this.updateVolumeIcon();
        });

        // Speed Control
        const speedBtn = this.controls.querySelector('.speed-btn');
        const speedMenu = this.controls.querySelector('.speed-menu');
        const speedItems = this.controls.querySelectorAll('.speed-item');

        speedBtn.addEventListener('click', () => {
            this.toggleMenu(speedMenu);
            this.closeMenu(this.controls.querySelector('.quality-menu'));
        });

        speedItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setSpeed(speed);
                
                // Update active state
                speedItems.forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                
                // Close menu
                this.closeMenu(speedMenu);
            });
        });

        // Quality Control
        const qualityBtn = this.controls.querySelector('.quality-btn');
        const qualityMenu = this.controls.querySelector('.quality-menu');
        const qualityItems = this.controls.querySelectorAll('.quality-item');

        qualityBtn.addEventListener('click', () => {
            this.toggleMenu(qualityMenu);
            this.closeMenu(speedMenu);
        });

        qualityItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const quality = e.target.dataset.quality;
                this.setQuality(quality);
                
                // Update active state
                qualityItems.forEach(i => i.classList.remove('active'));
                e.target.classList.add('active');
                
                // Close menu
                this.closeMenu(qualityMenu);
            });
        });

        // Picture in Picture
        const pipBtn = this.controls.querySelector('.pip-btn');
        pipBtn.addEventListener('click', () => this.togglePiP());

        // Fullscreen
        const fullscreenBtn = this.controls.querySelector('.fullscreen-btn');
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Progress Bar
        const progressBar = this.controls.querySelector('.progress-bar');
        const progressFill = this.controls.querySelector('.progress-fill');
        const progressHandle = this.controls.querySelector('.progress-handle');

        progressBar.addEventListener('click', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.video.currentTime = percent * this.video.duration;
        });

        progressBar.addEventListener('mousemove', (e) => {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const tooltipTime = this.formatTime(percent * this.video.duration);
            // Optional: Show tooltip
        });

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.controls.contains(e.target)) {
                this.closeMenu(speedMenu);
                this.closeMenu(qualityMenu);
            }
        });
    }

    setupEventListeners() {
        // Update progress bar
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        // Update duration
        this.video.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });

        // Update play button state
        this.video.addEventListener('play', () => {
            this.updatePlayButtonState();
        });

        this.video.addEventListener('pause', () => {
            this.updatePlayButtonState();
        });

        // Handle loading state
        this.video.addEventListener('waiting', () => {
            this.controls.querySelector('.loading-spinner').style.display = 'flex';
        });

        this.video.addEventListener('canplay', () => {
            this.controls.querySelector('.loading-spinner').style.display = 'none';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === this.video || document.activeElement === document.body) {
                this.handleKeyPress(e);
            }
        });
    }

    handleKeyPress(e) {
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'KeyF':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'ArrowRight':
                this.video.currentTime = Math.min(this.video.currentTime + 5, this.video.duration);
                break;
            case 'ArrowLeft':
                this.video.currentTime = Math.max(this.video.currentTime - 5, 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.video.volume = Math.min(this.video.volume + 0.1, 1);
                this.updateVolumeIcon();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.video.volume = Math.max(this.video.volume - 0.1, 0);
                this.updateVolumeIcon();
                break;
        }
    }

    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }

    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
        } else {
            this.video.muted = true;
        }
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        const volumeBtn = this.controls.querySelector('.volume-btn');
        const volumeSlider = this.controls.querySelector('.volume-slider');
        
        if (this.video.muted || this.video.volume === 0) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            volumeSlider.value = 0;
        } else if (this.video.volume < 0.5) {
            volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
            volumeSlider.value = this.video.volume * 100;
        } else {
            volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            volumeSlider.value = this.video.volume * 100;
        }
    }

    setSpeed(speed) {
        this.video.playbackRate = speed;
        const speedLabel = this.controls.querySelector('.speed-label');
        speedLabel.textContent = speed + 'x';
        
        // Show notification
        this.showNotification(`Speed: ${speed}x`);
    }

    setQuality(quality) {
        this.currentQuality = quality;
        const qualityLabel = this.controls.querySelector('.quality-label');
        qualityLabel.textContent = quality === 'auto' ? 'Auto' : quality.toUpperCase();
        
        // Here you would implement actual quality switching
        // This depends on your video source implementation
        this.showNotification(`Quality: ${quality.toUpperCase()}`);
    }

    togglePiP() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else {
            this.video.requestPictureInPicture().catch(err => {
                console.error('Picture in Picture failed:', err);
            });
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().catch(err => {
                console.error('Fullscreen failed:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    updateProgress() {
        const progress = (this.video.currentTime / this.video.duration) * 100;
        const progressFill = this.controls.querySelector('.progress-fill');
        const progressHandle = this.controls.querySelector('.progress-handle');
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressHandle) progressHandle.style.left = progress + '%';
        
        this.updateTimeDisplay();
    }

    updateDuration() {
        const durationElements = this.controls.querySelectorAll('.duration, .duration-bottom');
        durationElements.forEach(el => {
            el.textContent = this.formatTime(this.video.duration);
        });
    }

    updateTimeDisplay() {
        const currentTimeElements = this.controls.querySelectorAll('.current-time, .current-time-bottom');
        currentTimeElements.forEach(el => {
            el.textContent = this.formatTime(this.video.currentTime);
        });
    }

    updatePlayButtonState() {
        const playBtn = this.controls.querySelector('.play-btn');
        if (this.video.paused) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    toggleMenu(menu) {
        menu.classList.toggle('active');
    }

    closeMenu(menu) {
        menu.classList.remove('active');
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'player-notification';
        notification.textContent = message;
        this.controls.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
}

// Initialize player when document is ready and video element is visible
function initCustomPlayer() {
    const videoElement = document.getElementById('html5Player');
    const playerContainer = document.getElementById('html5PlayerContainer');
    
    if (videoElement && playerContainer && playerContainer.style.display !== 'none') {
        // Only initialize if container is visible
        if (!window.customPlayer) {
            window.customPlayer = new CustomVideoPlayer('html5Player', 'html5PlayerContainer');
        }
        return true;
    }
    return false;
}

// Try to initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for elements to be ready
        setTimeout(initCustomPlayer, 100);
    });
} else {
    // DOM already loaded
    setTimeout(initCustomPlayer, 100);
}

// Also expose init function globally for manual triggering
window.initCustomPlayer = initCustomPlayer;
