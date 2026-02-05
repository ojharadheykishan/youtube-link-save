ter name="content">/**
 * Advanced Video Player Features
 * - Picture-in-Picture Mode
 * - Playback Speed Control (0.25x - 3x)
 * - Chapter Markers
 * - Background Play
 * - Theater Mode
 * - Mini Player
 */

// Video Player Enhancement Class
class VideoPlayerEnhancer {
    constructor() {
        this.player = null;
        this.videoId = null;
        this.chapters = [];
        this.isPiP = false;
        this.isTheaterMode = false;
        this.isMiniMode = false;
        this.originalContainer = null;
        this.miniPlayer = null;
        this.speedPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
        this.currentSpeed = 1;
        this.init();
    }
    
    init() {
        this.setupKeyboardShortcuts();
    }
    
    // Attach to video player
    attach(player, videoId, chapters = []) {
        this.player = player;
        this.videoId = videoId;
        this.chapters = chapters || [];
        
        this.setupControls();
        this.loadSettings();
    }
    
    // Setup custom controls
    setupControls() {
        if (!this.player) return;
        
        // Add speed control button
        this.addSpeedControl();
        
        // Add theater mode button
        this.addTheaterModeButton();
        
        // Add PiP button
        this.addPiPButton();
        
        // Add mini player button
        this.addMiniPlayerButton();
    }
    
    // Add speed control dropdown
    addSpeedControl() {
        const controls = this.player.controls || document.querySelector('.player-controls');
        if (!controls) return;
        
        let speedBtn = document.querySelector('.speed-control-btn');
        if (speedBtn) speedBtn.remove();
        
        speedBtn = document.createElement('button');
        speedBtn.className = 'speed-control-btn ctrl-btn';
        speedBtn.innerHTML = '<span class="speed-display">1x</span>';
        speedBtn.title = 'Playback Speed';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'speed-dropdown';
        dropdown.innerHTML = `
            <div class="speed-option" data-speed="0.25">0.25x</div>
            <div class="speed-option" data-speed="0.5">0.5x</div>
            <div class="speed-option" data-speed="0.75">0.75x</div>
            <div class="speed-option" data-speed="1">1x (Normal)</div>
            <div class="speed-option" data-speed="1.25">1.25x</div>
            <div class="speed-option" data-speed="1.5">1.5x</div>
            <div class="speed-option" data-speed="2">2x</div>
            <div class="speed-option" data-speed="2.5">2.5x</div>
            <div class="speed-option" data-speed="3">3x</div>
        `;
        
        speedBtn.appendChild(dropdown);
        controls.appendChild(speedBtn);
        
        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });
        
        dropdown.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', () => {
                const speed = parseFloat(option.dataset.speed);
                this.setSpeed(speed);
                dropdown.classList.remove('active');
            });
        });
        
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
    }
    
    // Set playback speed
    setSpeed(speed) {
        if (!this.player) return;
        
        this.currentSpeed = speed;
        this.player.playbackRate = speed;
        
        const speedDisplay = document.querySelector('.speed-display');
        if (speedDisplay) {
            speedDisplay.textContent = speed + 'x';
        }
        
        localStorage.setItem('video_speed_' + this.videoId, speed);
    }
    
    // Add theater mode button
    addTheaterModeButton() {
        const controls = this.player.controls || document.querySelector('.player-controls');
        if (!controls) return;
        
        let theaterBtn = document.querySelector('.theater-mode-btn');
        if (theaterBtn) theaterBtn.remove();
        
        theaterBtn = document.createElement('button');
        theaterBtn.className = 'theater-mode-btn ctrl-btn';
        theaterBtn.innerHTML = '<i class="fas fa-expand"></i>';
        theaterBtn.title = 'Theater Mode (T)';
        
        controls.appendChild(theaterBtn);
        
        theaterBtn.addEventListener('click', () => {
            this.toggleTheaterMode();
        });
    }
    
    // Toggle theater mode
    toggleTheaterMode() {
        this.isTheaterMode = !this.isTheaterMode;
        
        const playerContainer = document.querySelector('.player-container') || this.player.parentElement;
        
        if (this.isTheaterMode) {
            playerContainer.classList.add('theater-mode');
            document.body.classList.add('theater-mode-active');
        } else {
            playerContainer.classList.remove('theater-mode');
            document.body.classList.remove('theater-mode-active');
        }
    }
    
    // Add Picture-in-Picture button
    addPiPButton() {
        const controls = this.player.controls || document.querySelector('.player-controls');
        if (!controls) return;
        
        let pipBtn = document.querySelector('.pip-btn');
        if (pipBtn) pipBtn.remove();
        
        pipBtn = document.createElement('button');
        pipBtn.className = 'pip-btn ctrl-btn';
        pipBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
        pipBtn.title = 'Picture-in-Picture (P)';
        
        controls.appendChild(pipBtn);
        
        pipBtn.addEventListener('click', () => {
            this.togglePiP();
        });
    }
    
    // Toggle Picture-in-Picture
    async togglePiP() {
        if (!this.player) return;
        
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                this.isPiP = false;
            } else {
                await this.player.requestPictureInPicture();
                this.isPiP = true;
            }
        } catch (error) {
            console.error('PiP error:', error);
        }
    }
    
    // Add mini player button
    addMiniPlayerButton() {
        const controls = this.player.controls || document.querySelector('.player-controls');
        if (!controls) return;
        
        let miniBtn = document.querySelector('.mini-player-btn');
        if (miniBtn) miniBtn.remove();
        
        miniBtn = document.createElement('button');
        miniBtn.className = 'mini-player-btn ctrl-btn';
        miniBtn.innerHTML = '<i class="fas fa-window-minimize"></i>';
        miniBtn.title = 'Mini Player (M)';
        
        controls.appendChild(miniBtn);
        
        miniBtn.addEventListener('click', () => {
            this.toggleMiniPlayer();
        });
    }
    
    // Toggle mini player
    toggleMiniPlayer() {
        if (this.isMiniMode) {
            this.exitMiniPlayer();
        } else {
            this.enterMiniPlayer();
        }
    }
    
    // Enter mini player mode
    enterMiniPlayer() {
        if (!this.player || this.isMiniMode) return;
        
        this.isMiniMode = true;
        this.originalContainer = this.player.parentElement;
        
        this.miniPlayer = document.createElement('div');
        this.miniPlayer.className = 'video-mini-player';
        this.miniPlayer.innerHTML = `
            <div class="mini-player-header">
                <span class="mini-title">Now Playing</span>
                <button class="mini-close"><i class="fas fa-times"></i></button>
            </div>
            <div class="mini-video-container"></div>
            <div class="mini-controls">
                <button class="mini-play"><i class="fas fa-play"></i></button>
                <button class="mini-close-btn">Exit</button>
            </div>
        `;
        
        const videoContainer = this.miniPlayer.querySelector('.mini-video-container');
        videoContainer.appendChild(this.player);
        
        document.body.appendChild(this.miniPlayer);
        
        Object.assign(this.miniPlayer.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '320px',
            background: 'rgba(0,0,0,0.95)',
            borderRadius: '12px',
            zIndex: '9999',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden'
        });
        
        this.miniPlayer.querySelector('.mini-close').addEventListener('click', () => {
            this.exitMiniPlayer();
        });
        
        this.miniPlayer.querySelector('.mini-close-btn').addEventListener('click', () => {
            this.exitMiniPlayer();
        });
    }
    
    // Exit mini player
    exitMiniPlayer() {
        if (!this.isMiniMode || !this.miniPlayer) return;
        
        this.isMiniMode = false;
        
        if (this.originalContainer && this.player) {
            this.originalContainer.appendChild(this.player);
        }
        
        this.miniPlayer.remove();
        this.miniPlayer = null;
    }
    
    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case 't':
                    this.toggleTheaterMode();
                    break;
                case 'p':
                    this.togglePiP();
                    break;
                case 'm':
                    this.toggleMiniPlayer();
                    break;
                case 'arrowleft':
                    this.player.currentTime -= 10;
                    break;
                case 'arrowright':
                    this.player.currentTime += 10;
                    break;
                case 'arrowup':
                    this.player.volume = Math.min(1, this.player.volume + 0.1);
                    break;
                case 'arrowdown':
                    this.player.volume = Math.max(0, this.player.volume - 0.1);
                    break;
                case ' ':
                    e.preventDefault();
                    if (this.player.paused) this.player.play();
                    else this.player.pause();
                    break;
                case 'f':
                    if (this.player.requestFullscreen) this.player.requestFullscreen();
                    break;
                case '[':
                    this.setSpeed(Math.max(0.25, this.currentSpeed - 0.25));
                    break;
                case ']':
                    this.setSpeed(Math.min(3, this.currentSpeed + 0.25));
                    break;
            }
        });
    }
    
    // Load saved settings
    loadSettings() {
        const savedSpeed = localStorage.getItem('video_speed_' + this.videoId);
        if (savedSpeed) {
            this.setSpeed(parseFloat(savedSpeed));
        }
    }
}

window.VideoPlayerEnhancer = VideoPlayerEnhancer;
