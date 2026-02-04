/**
 * VideoHub - Custom Playlists System
 * Create playlists from multiple folders and videos
 */

(function() {
    'use strict';

    const PLAYLISTS_KEY = 'videohub_playlists';

    /**
     * Playlists Manager Class
     */
    class PlaylistsManager {
        constructor() {
            this.playlists = this.loadPlaylists();
        }

        /**
         * Load playlists from localStorage
         */
        loadPlaylists() {
            try {
                const data = localStorage.getItem(PLAYLISTS_KEY);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                console.error('Error loading playlists:', e);
                return {};
            }
        }

        /**
         * Save playlists
         */
        savePlaylists() {
            try {
                localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(this.playlists));
            } catch (e) {
                console.error('Error saving playlists:', e);
            }
        }

        /**
         * Get all playlists
         */
        getAllPlaylists() {
            return Object.entries(this.playlists).map(([id, data]) => ({
                id,
                ...data
            }));
        }

        /**
         * Get playlist by ID
         */
        getPlaylist(playlistId) {
            return this.playlists[playlistId] || null;
        }

        /**
         * Create new playlist
         */
        createPlaylist(name, description = '', videos = []) {
            const id = 'playlist_' + Date.now();
            
            this.playlists[id] = {
                id,
                name,
                description,
                videos,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPublic: false
            };
            
            this.savePlaylists();
            return this.playlists[id];
        }

        /**
         * Update playlist
         */
        updatePlaylist(playlistId, updates) {
            if (!this.playlists[playlistId]) return null;

            this.playlists[playlistId] = {
                ...this.playlists[playlistId],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            this.savePlaylists();
            return this.playlists[playlistId];
        }

        /**
         * Delete playlist
         */
        deletePlaylist(playlistId) {
            if (!this.playlists[playlistId]) return false;
            
            delete this.playlists[playlistId];
            this.savePlaylists();
            return true;
        }

        /**
         * Add video to playlist
         */
        addVideoToPlaylist(playlistId, video) {
            if (!this.playlists[playlistId]) return false;

            const playlist = this.playlists[playlistId];
            
            // Check if video already exists
            const exists = playlist.videos.some(v => v.id === video.id);
            if (exists) {
                console.log('Video already in playlist');
                return playlist;
            }

            playlist.videos.push({
                ...video,
                addedAt: new Date().toISOString(),
                order: playlist.videos.length
            });
            
            playlist.updatedAt = new Date().toISOString();
            this.savePlaylists();
            return playlist;
        }

        /**
         * Remove video from playlist
         */
        removeVideoFromPlaylist(playlistId, videoId) {
            if (!this.playlists[playlistId]) return false;

            const playlist = this.playlists[playlistId];
            const index = playlist.videos.findIndex(v => v.id === videoId);
            
            if (index === -1) return false;

            playlist.videos.splice(index, 1);
            
            // Reorder
            playlist.videos.forEach((v, i) => {
                v.order = i;
            });
            
            playlist.updatedAt = new Date().toISOString();
            this.savePlaylists();
            return true;
        }

        /**
         * Reorder videos in playlist
         */
        reorderVideos(playlistId, videoIds) {
            if (!this.playlists[playlistId]) return false;

            const playlist = this.playlists[playlistId];
            const newOrder = [];
            
            videoIds.forEach((id, index) => {
                const video = playlist.videos.find(v => v.id === id);
                if (video) {
                    video.order = index;
                    newOrder.push(video);
                }
            });
            
            playlist.videos = newOrder;
            playlist.updatedAt = new Date().toISOString();
            this.savePlaylists();
            return true;
        }

        /**
         * Get playlist video count
         */
        getPlaylistCount(playlistId) {
            const playlist = this.playlists[playlistId];
            return playlist ? playlist.videos.length : 0;
        }
    }

    // Create global instance
    window.playlistsManager = new PlaylistsManager();

    /**
     * Initialize playlists UI
     */
    function initPlaylists() {
        console.log('🎵 Playlists system initialized');
    }

    /**
     * Create playlists sidebar section
     */
    window.createPlaylistsSidebar = function() {
        const section = document.createElement('div');
        section.className = 'sidebar-section';
        section.id = 'playlistsSection';
        section.innerHTML = `
            <div class="sidebar-title">
                My Playlists
                <button class="btn-icon-sm" onclick="showCreatePlaylistModal()" title="Create Playlist">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div id="playlistsList"></div>
        `;
        return section;
    };

    /**
     * Refresh playlists list
     */
    window.refreshPlaylistsList = function() {
        const list = document.getElementById('playlistsList');
        if (!list) return;

        const playlists = window.playlistsManager.getAllPlaylists();
        
        if (playlists.length === 0) {
            list.innerHTML = `
                <div class="empty-playlist">
                    <p>No playlists yet</p>
                    <button class="btn-create-playlist" onclick="showCreatePlaylistModal()">
                        <i class="fas fa-plus-circle"></i> Create Playlist
                    </button>
                </div>
            `;
            return;
        }

        list.innerHTML = playlists.map(p => `
            <a href="#" class="sidebar-item playlist-item" onclick="openPlaylist('${p.id}')">
                <i class="fas fa-list"></i>
                <span>${escapeHtml(p.name)}</span>
                <span class="playlist-count">${p.videos.length}</span>
            </a>
        `).join('');
    };

    /**
     * Show create playlist modal
     */
    window.showCreatePlaylistModal = function() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'createPlaylistModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Create New Playlist</h3>
                    <button class="modal-close" onclick="closeCreatePlaylistModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitCreatePlaylist(event)">
                        <div class="form-group">
                            <label>Playlist Name *</label>
                            <input type="text" id="playlistName" placeholder="e.g., My Favorite Videos" required>
                        </div>
                        <div class="form-group">
                            <label>Description (Optional)</label>
                            <textarea id="playlistDescription" rows="2" placeholder="Add a description for your playlist"></textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-plus"></i> Create
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeCreatePlaylistModal()" style="flex: 1;">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    /**
     * Close create playlist modal
     */
    window.closeCreatePlaylistModal = function() {
        const modal = document.getElementById('createPlaylistModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Submit create playlist form
     */
    window.submitCreatePlaylist = function(event) {
        event.preventDefault();

        const name = document.getElementById('playlistName').value.trim();
        const description = document.getElementById('playlistDescription').value.trim();

        if (!name) {
            alert('Please enter a playlist name');
            return;
        }

        const playlist = window.playlistsManager.createPlaylist(name, description);
        
        window.closeCreatePlaylistModal();
        window.refreshPlaylistsList();
        window.showNotification(`✅ Playlist "${name}" created!`);
        window.openPlaylist(playlist.id);
    };

    /**
     * Open playlist
     */
    window.openPlaylist = function(playlistId) {
        const playlist = window.playlistsManager.getPlaylist(playlistId);
        if (!playlist) {
            window.showNotification('Playlist not found');
            return;
        }

        // Create playlist view
        const view = document.createElement('div');
        view.id = 'playlistView';
        view.className = 'playlist-view';
        view.innerHTML = `
            <div class="playlist-header">
                <button class="btn-back" onclick="closePlaylistView()">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <div class="playlist-info">
                    <h2>${escapeHtml(playlist.name)}</h2>
                    ${playlist.description ? `<p>${escapeHtml(playlist.description)}</p>` : ''}
                    <span class="playlist-meta">${playlist.videos.length} videos</span>
                </div>
                <div class="playlist-actions">
                    <button class="btn-icon" onclick="showAddToPlaylistModal('${playlistId}')" title="Add Videos">
                        <i class="fas fa-plus"></i> Add Videos
                    </button>
                    <button class="btn-icon" onclick="editPlaylist('${playlistId}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="deletePlaylist('${playlistId}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="playlist-videos" id="playlistVideos">
                ${playlist.videos.length === 0 ? `
                    <div class="empty-playlist-videos">
                        <i class="fas fa-video"></i>
                        <p>No videos in this playlist yet</p>
                        <button class="btn-primary" onclick="showAddToPlaylistModal('${playlistId}')">
                            <i class="fas fa-plus"></i> Add Videos
                        </button>
                    </div>
                ` : playlist.videos.map((video, index) => `
                    <div class="playlist-video-item" draggable="true" data-id="${video.id}">
                        <div class="video-order">${index + 1}</div>
                        <div class="video-info">
                            <a href="/watch/${video.id}">
                                <img src="${video.thumbnail || `https://img.youtube.com/vi/${video.originalId || video.id.split('_')[0]}/default.jpg`}" 
                                     alt="${escapeHtml(video.title)}" 
                                     onerror="this.src='https://via.placeholder.com/120x90?text=Video'">
                            </a>
                            <div>
                                <a href="/watch/${video.id}" class="video-title">${escapeHtml(video.title)}</a>
                                <span class="video-folder">${video.folder || 'Unknown'}</span>
                            </div>
                        </div>
                        <div class="video-actions">
                            <button class="btn-icon-sm" onclick="playVideo('${video.id}')" title="Play">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn-icon-sm" onclick="removeFromPlaylist('${playlistId}', '${video.id}')" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Insert after sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        
        // Remove existing view
        const existingView = document.getElementById('playlistView');
        if (existingView) {
            existingView.remove();
        }
        
        document.querySelector('main').insertBefore(view, document.querySelector('main').firstChild);
        window.showNotification(`📂 Opened playlist: ${playlist.name}`);
    };

    /**
     * Close playlist view
     */
    window.closePlaylistView = function() {
        const view = document.getElementById('playlistView');
        if (view) {
            view.remove();
        }
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.display = '';
        }
        
        window.refreshPlaylistsList();
    };

    /**
     * Edit playlist
     */
    window.editPlaylist = function(playlistId) {
        const playlist = window.playlistsManager.getPlaylist(playlistId);
        if (!playlist) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Playlist</h3>
                    <button class="modal-close" onclick="closeEditPlaylistModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitEditPlaylist(event, '${playlistId}')">
                        <div class="form-group">
                            <label>Playlist Name *</label>
                            <input type="text" id="editPlaylistName" value="${escapeHtml(playlist.name)}" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="editPlaylistDescription" rows="2">${escapeHtml(playlist.description || '')}</textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-save"></i> Save
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeEditPlaylistModal()" style="flex: 1;">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    /**
     * Close edit playlist modal
     */
    window.closeEditPlaylistModal = function() {
        const modal = document.querySelector('#createPlaylistModal, .modal.active');
        if (modal && modal.id !== 'exportModal') {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Submit edit playlist form
     */
    window.submitEditPlaylist = function(event, playlistId) {
        event.preventDefault();

        const name = document.getElementById('editPlaylistName').value.trim();
        const description = document.getElementById('editPlaylistDescription').value.trim();

        window.playlistsManager.updatePlaylist(playlistId, { name, description });
        
        window.closeEditPlaylistModal();
        window.closePlaylistView();
        window.refreshPlaylistsList();
        window.showNotification('✅ Playlist updated!');
    };

    /**
     * Delete playlist
     */
    window.deletePlaylist = function(playlistId) {
        const playlist = window.playlistsManager.getPlaylist(playlistId);
        if (!playlist) return;

        if (!confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) return;

        window.playlistsManager.deletePlaylist(playlistId);
        window.closePlaylistView();
        window.refreshPlaylistsList();
        window.showNotification('🗑️ Playlist deleted');
    };

    /**
     * Add current video to playlist
     */
    window.addCurrentVideoToPlaylist = function(playlistId) {
        // Get current video info from DOM
        const videoTitle = document.querySelector('.video-title');
        const videoId = document.querySelector('.button-group button')?.onclick?.toString().match(/'([^']+)'/)?.[1];
        
        if (!videoId) {
            window.showNotification('⚠️ No video selected');
            return;
        }

        const video = {
            id: videoId,
            title: videoTitle?.textContent || 'Unknown Video',
            originalId: videoId.split('_')[0],
            folder: document.querySelector('.detail-value a')?.textContent || 'Unknown'
        };

        window.playlistsManager.addVideoToPlaylist(playlistId, video);
        window.showNotification('✅ Video added to playlist!');
    };

    /**
     * Remove video from playlist
     */
    window.removeFromPlaylist = function(playlistId, videoId) {
        window.playlistsManager.removeVideoFromPlaylist(playlistId, videoId);
        window.openPlaylist(playlistId); // Refresh view
        window.showNotification('🗑️ Video removed from playlist');
    };

    /**
     * Show add to playlist modal
     */
    window.showAddToPlaylistModal = function(playlistId) {
        const playlists = window.playlistsManager.getAllPlaylists();
        const currentPlaylist = playlists.find(p => p.id === playlistId);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Add to Playlist</h3>
                    <button class="modal-close" onclick="closeAddToPlaylistModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        Select videos to add to "${escapeHtml(currentPlaylist?.name || 'Playlist')}"
                    </p>
                    
                    <div id="availableVideos" class="available-videos-list">
                        <!-- Will be populated by JS -->
                        <div class="loading">Loading videos...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Populate with available videos
        window.populateAvailableVideos(playlistId);
    };

    /**
     * Populate available videos for playlist
     */
    window.populateAvailableVideos = function(playlistId) {
        const container = document.getElementById('availableVideos');
        if (!container) return;

        // Get videos from global data or empty
        let videos = [];
        if (typeof window.videosData !== 'undefined') {
            videos = window.videosData;
        }

        if (videos.length === 0) {
            container.innerHTML = `
                <div class="no-videos-message">
                    <i class="fas fa-info-circle"></i>
                    <p>No videos available to add</p>
                    <small>Add some videos to your library first</small>
                </div>
            `;
            return;
        }

        const playlist = window.playlistsManager.getPlaylist(playlistId);
        const existingIds = playlist?.videos?.map(v => v.id) || [];

        container.innerHTML = videos.map(video => `
            <div class="video-select-item ${existingIds.includes(video.video_id || video.id) ? 'added' : ''}">
                <input type="checkbox" 
                       id="video_${video.video_id || video.id}" 
                       value="${video.video_id || video.id}"
                       ${existingIds.includes(video.video_id || video.id) ? 'checked disabled' : ''}>
                <label for="video_${video.video_id || video.id}">
                    <img src="${video.thumbnail_path ? '/' + video.thumbnail_path : `https://img.youtube.com/vi/${(video.original_video_id || video.video_id || '').split('_')[0]}/default.jpg`}" 
                         alt="${escapeHtml(video.title)}"
                         onerror="this.src='https://via.placeholder.com/60x45?text=Video'">
                    <div class="video-info">
                        <span class="title">${escapeHtml(video.title)}</span>
                        <span class="folder">${video.folder_name || video.folder || 'Unknown'}</span>
                    </div>
                </label>
                ${existingIds.includes(video.video_id || video.id) ? '<span class="added-badge">Added</span>' : ''}
            </div>
        `).join('') + `
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                <button class="btn-primary" style="flex: 1;" onclick="addSelectedVideos('${playlistId}')">
                    <i class="fas fa-plus"></i> Add Selected
                </button>
                <button class="btn-secondary" style="flex: 1;" onclick="closeAddToPlaylistModal()">
                    Close
                </button>
            </div>
        `;
    };

    /**
     * Add selected videos to playlist
     */
    window.addSelectedVideos = function(playlistId) {
        const checkboxes = document.querySelectorAll('#availableVideos input[type="checkbox"]:not(:disabled):checked');
        
        if (checkboxes.length === 0) {
            window.showNotification('⚠️ Please select at least one video');
            return;
        }

        let added = 0;
        checkboxes.forEach(checkbox => {
            const videoId = checkbox.value;
            
            // Find video data
            let video = null;
            if (typeof window.videosData !== 'undefined') {
                video = window.videosData.find(v => (v.video_id || v.id) === videoId);
            }
            
            if (video) {
                window.playlistsManager.addVideoToPlaylist(playlistId, {
                    id: video.video_id || video.id,
                    title: video.title,
                    originalId: (video.original_video_id || video.video_id || '').split('_')[0],
                    folder: video.folder_name || video.folder,
                    thumbnail: video.thumbnail_path
                });
                added++;
            }
        });

        window.closeAddToPlaylistModal();
        window.openPlaylist(playlistId); // Refresh view
        window.showNotification(`✅ ${added} video${added > 1 ? 's' : ''} added to playlist!`);
    };

    /**
     * Close add to playlist modal
     */
    window.closeAddToPlaylistModal = function() {
        const modal = document.querySelector('#createPlaylistModal, .modal.active');
        if (modal && modal.id !== 'exportModal') {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Play video
     */
    window.playVideo = function(videoId) {
        window.location.href = '/watch/' + videoId;
    };

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .empty-playlist {
            text-align: center;
            padding: 1rem;
            color: var(--text-secondary);
        }
        
        .empty-playlist p {
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        
        .btn-create-playlist {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85rem;
        }
        
        .playlist-item {
            display: flex;
            align-items: center;
        }
        
        .playlist-count {
            margin-left: auto;
            background: var(--bg-color);
            padding: 0.2rem 0.5rem;
            border-radius: 10px;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .playlist-view {
            margin-left: 260px;
            padding: 2rem;
            min-height: calc(100vh - 70px);
        }
        
        .playlist-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .btn-back {
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .playlist-info {
            flex: 1;
        }
        
        .playlist-info h2 {
            margin: 0;
            color: var(--text-primary);
        }
        
        .playlist-info p {
            margin: 0.5rem 0 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        
        .playlist-meta {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        .playlist-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .playlist-videos {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .playlist-video-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            transition: all 0.2s;
        }
        
        .playlist-video-item:hover {
            transform: translateX(5px);
            border-color: var(--primary-color);
        }
        
        .video-order {
            width: 30px;
            height: 30px;
            background: var(--primary-color);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9rem;
        }
        
        .playlist-video-item .video-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .playlist-video-item .video-info img {
            width: 120px;
            height: 68px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .playlist-video-item .video-info a {
            text-decoration: none;
            color: var(--text-primary);
        }
        
        .playlist-video-item .video-info .video-title {
            font-weight: 500;
            display: block;
        }
        
        .playlist-video-item .video-info .video-folder {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        .playlist-video-item .video-actions {
            display: flex;
            gap: 0.25rem;
        }
        
        .empty-playlist-videos {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }
        
        .empty-playlist-videos i {
            font-size: 4rem;
            opacity: 0.3;
            margin-bottom: 1rem;
            display: block;
        }
        
        .available-videos-list {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .video-select-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            background: var(--bg-color);
        }
        
        .video-select-item.added {
            opacity: 0.6;
        }
        
        .video-select-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
        }
        
        .video-select-item label {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
        }
        
        .video-select-item label img {
            width: 80px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .video-select-item .video-info {
            display: flex;
            flex-direction: column;
        }
        
        .video-select-item .title {
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        .video-select-item .folder {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .added-badge {
            background: #28a745;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        
        .no-videos-message {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }
        
        .no-videos-message i {
            font-size: 3rem;
            opacity: 0.3;
            margin-bottom: 1rem;
            display: block;
        }
    `;
    document.head.appendChild(style);

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPlaylists);
    } else {
        initPlaylists();
    }

})();

