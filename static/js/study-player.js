/**
 * Ultimate Study Video Player
 * Features: 4x Speed, Quality Selection, PiP, Keyboard Shortcuts
 */

class StudyVideoPlayer {
    constructor(containerId, videoId) {
        this.container = document.getElementById(containerId);
        this.videoId = videoId;
        this.video = null;
        this.isPlaying = false;
        this.currentQuality = 'auto';
        this.availableQualities = ['144p', '240p', '360p', '480p', '720p', '1080p', 'auto'];
        this.playbackRate = 1;
        this.volume = 1;
        this.isMuted = false;
        this.isFullscreen = false;
        this.isPiP = false;
        this.init();
    }

    async init() {
        this.render();
        await this.loadVideo();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.loadPreferences();
    }

    render() {
        this.container.innerHTML = `
            <div class="study-player-container" id="playerWrapper">
                <video id="studyVideo" class="study-video" poster="" crossorigin="anonymous">
                    Your browser does not support the video tag.
                </video>
                <div class="study-controls" id="controls">
                    <div class="progress-container" id="progressContainer">
                        <div class="progress-bar" id="progressBar">
                            <div class="progress-buffered" id="bufferedBar"></div>
                            <div class="progress-played" id="playedBar"></div>
                        </div>
                    </div>
                    <div class="controls-row">
                        <div class="controls-left">
                            <button class="control-btn" onclick="player.togglePlay()">
                                <i class="fas fa-play" id="playIcon"></i>
                            </button>
                            <button class="control-btn" onclick="player.skip(-10)">
                                <i class="fas fa-undo-10"></i>
                            </button>
                            <button class="control-btn" onclick="player.skip(10)">
                                <i class="fas fa-redo-10"></i>
                            </button>
                            <div class="volume-control">
                                <button class="control-btn" onclick="player.toggleMute()">
                                    <i class="fas fa-volume-up" id="volumeIcon"></i>
                                </button>
                                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="1" step="0.1" value="1">
                            </div>
                            <span class="time-display">
                                <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
                            </span>
                        </div>
                        <div class="controls-center">
                            <div class="speed-control">
                                <button class="control-btn speed-btn" id="speedBtn" onclick="player.toggleSpeedMenu()">
                                    <span id="speedDisplay">1x</span>
                                </button>
                                <div class="speed-menu" id="speedMenu">
                                    <button class="speed-option" onclick="player.setSpeed(0.25)">0.25x</button>
                                    <button class="speed-option" onclick="player.setSpeed(0.5)">0.5x</button>
                                    <button class="speed-option" onclick="player.setSpeed(0.75)">0.75x</button>
                                    <button class="speed-option active" onclick="player.setSpeed(1)">1x</button>
                                    <button class="speed-option" onclick="player.setSpeed(1.25)">1.25x</button>
                                    <button class="speed-option" onclick="player.setSpeed(1.5)">1.5x</button>
                                    <button class="speed-option" onclick="player.setSpeed(1.75)">1.75x</button>
                                    <button class="speed-option" onclick="player.setSpeed(2)">2x</button>
                                    <button class="speed-option" onclick="player.setSpeed(2.5)">2.5x</button>
                                    <button class="speed-option" onclick="player.setSpeed(3)">3x</button>
                                    <button class="speed-option" onclick="player.setSpeed(4)">4x</button>
                                </div>
                            </div>
                            <div class="quality-control">
                                <button class="control-btn quality-btn" id="qualityBtn" onclick="player.toggleQualityMenu()">
                                    <span id="qualityDisplay">Auto</span>
                                </button>
                                <div class="quality-menu" id="qualityMenu">
                                    <button class="quality-option active" onclick="player.setQuality('auto')">Auto</button>
                                    <button class="quality-option" onclick="player.setQuality('144p')">144p</button>
                                    <button class="quality-option" onclick="player.setQuality('240p')">240p</button>
                                    <button class="quality-option" onclick="player.setQuality('360p')">360p</button>
                                    <button class="quality-option" onclick="player.setQuality('480p')">480p</button>
                                    <button class="quality-option" onclick="player.setQuality('720p')">720p</button>
                                    <button class="quality-option" onclick="player.setQuality('1080p')">1080p</button>
                                </div>
                            </div>
                        </div>
                        <div class="controls-right">
                            <button class="control-btn" onclick="player.togglePiP()" title="Picture-in-Picture">
                                <i class="fas fa-picture-in-picture-alt" id="pipIcon"></i>
                            </button>
                            <button class="control-btn" onclick="player.toggleFullscreen()" title="Fullscreen">
                                <i class="fas fa-expand" id="fullscreenIcon"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="big-play-btn" id="bigPlayBtn" onclick="player.togglePlay()">
                    <i class="fas fa-play"></i>
                </div>
                <div class="video-info-overlay" id="videoInfo">
                    <div class="video-title" id="videoTitle">Study Video</div>
                </div>
            </div>
        `;
        this.video = document.getElementById('studyVideo');
    }

    async loadVideo() {
        try {
            const response = await fetch('/api/stream/' + this.videoId);
            const data = await response.json();
            if (data.stream_url) {
                this.video.src = data.stream_url;
            }
            if (data.duration) {
                document.getElementById('duration').textContent = this.formatTime(data.duration);
            }
            if (data.title) {
                document.getElementById('videoTitle').textContent = data.title;
            }
        } catch (error) {
            console.log('Demo mode - configure API for full features');
            showToast('Demo Mode - Configure Telegram API', 'info');
        }
    }

    setupEventListeners() {
        this.video.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            document.getElementById('bigPlayBtn').style.display = 'none';
        });
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            document.getElementById('bigPlayBtn').style.display = 'flex';
        });
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('loadedmetadata', () => {
            document.getElementById('duration').textContent = this.formatTime(this.video.duration);
        });
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });
        document.getElementById('progressContainer').addEventListener('click', (e) => {
            this.seekTo(e.offsetX / e.target.offsetWidth);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch(e.key.toLowerCase()) {
                case ' ': e.preventDefault(); this.togglePlay(); break;
                case 'arrowleft': this.skip(-10); break;
                case 'arrowright': this.skip(10); break;
                case 'arrowup': e.preventDefault(); this.volumeUp(); break;
                case 'arrowdown': e.preventDefault(); this.volumeDown(); break;
                case 'm': this.toggleMute(); break;
                case 'f': this.toggleFullscreen(); break;
                case 'p': this.togglePiP(); break;
            }
            if (e.key >= '1' && e.key <= '9') {
                this.video.currentTime = (parseInt(e.key) / 10) * this.video.duration;
            }
        });
    }

    togglePlay() {
        this.video.paused ? this.video.play() : this.video.pause();
    }

    skip(seconds) {
        this.video.currentTime = Math.max(0, Math.min(this.video.currentTime + seconds, this.video.duration));
    }

    setVolume(value) {
        this.video.volume = value;
        this.volume = value;
        this.updateVolumeIcon();
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.isMuted = this.video.muted;
        this.updateVolumeIcon();
    }

    volumeUp() { this.setVolume(Math.min(1, this.video.volume + 0.1)); }
    volumeDown() { this.setVolume(Math.max(0, this.video.volume - 0.1)); }

    toggleSpeedMenu() {
        document.getElementById('speedMenu').classList.toggle('show');
        document.getElementById('qualityMenu').classList.remove('show');
    }

    setSpeed(rate) {
        this.video.playbackRate = rate;
        this.playbackRate = rate;
        document.getElementById('speedDisplay').textContent = rate + 'x';
        document.querySelectorAll('.speed-option').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === rate + 'x');
        });
        document.getElementById('speedMenu').classList.remove('show');
        showToast('Speed: ' + rate + 'x', 'info');
    }

    toggleQualityMenu() {
        document.getElementById('qualityMenu').classList.toggle('show');
        document.getElementById('speedMenu').classList.remove('show');
    }

    setQuality(quality) {
        this.currentQuality = quality;
        document.getElementById('qualityDisplay').textContent = quality;
        document.querySelectorAll('.quality-option').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === quality);
        });
        document.getElementById('qualityMenu').classList.remove('show');
        showToast('Quality: ' + quality, 'info');
    }

    async toggleFullscreen() {
        const wrapper = document.getElementById('playerWrapper');
        if (!document.fullscreenElement) {
            await wrapper.requestFullscreen();
            this.isFullscreen = true;
        } else {
            await document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    async togglePiP() {
        try {
            if (this.video !== document.pictureInPictureElement) {
                await this.video.requestPictureInPicture();
            } else {
                await document.exitPictureInPicture();
            }
        } catch (error) {
            console.log('PiP not supported');
        }
    }

    updateProgress() {
        const percent = (this.video.currentTime / this.video.duration) * 100;
        document.getElementById('playedBar').style.width = percent + '%';
        document.getElementById('currentTime').textContent = this.formatTime(this.video.currentTime);
    }

    seekTo(percent) {
        this.video.currentTime = percent * this.video.duration;
    }

    updatePlayButton() {
        document.getElementById('playIcon').className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    updateVolumeIcon() {
        const icon = document.getElementById('volumeIcon');
        if (this.video.muted || this.video.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.video.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + secs.toString().padStart(2, '0');
    }

    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('videoPreferences'));
            if (prefs) {
                this.video.volume = prefs.volume || 1;
                this.video.playbackRate = prefs.playbackRate || 1;
                this.setQuality(prefs.quality || 'auto');
            }
        } catch (e) {}
    }
}

let player;
function initStudyPlayer(videoId) {
    player = new StudyVideoPlayer('playerContainer', videoId);
}
window.initStudyPlayer = initStudyPlayer;
window.StudyVideoPlayer = StudyVideoPlayer;

