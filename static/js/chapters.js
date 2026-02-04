/**
 * VideoHub - Video Chapters System
 * Auto-detect or manually add video chapters with timestamps
 */

(function() {
    'use strict';

    const CHAPTERS_KEY = 'videohub_chapters';

    /**
     * Chapters Manager Class
     */
    class ChaptersManager {
        constructor() {
            this.chapters = this.loadChapters();
        }

        /**
         * Load chapters from localStorage
         */
        loadChapters() {
            try {
                const data = localStorage.getItem(CHAPTERS_KEY);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                console.error('Error loading chapters:', e);
                return {};
            }
        }

        /**
         * Save chapters
         */
        saveChapters() {
            try {
                localStorage.setItem(CHAPTERS_KEY, JSON.stringify(this.chapters));
            } catch (e) {
                console.error('Error saving chapters:', e);
            }
        }

        /**
         * Get chapters for a video
         */
        getChapters(videoId) {
            return this.chapters[videoId] || [];
        }

        /**
         * Add chapter to video
         */
        addChapter(videoId, title, timestamp, description = '') {
            if (!this.chapters[videoId]) {
                this.chapters[videoId] = [];
            }

            const chapter = {
                id: Date.now(),
                title: title,
                timestamp: parseFloat(timestamp),
                description: description,
                createdAt: new Date().toISOString()
            };

            this.chapters[videoId].push(chapter);
            
            // Sort by timestamp
            this.chapters[videoId].sort((a, b) => a.timestamp - b.timestamp);
            
            this.saveChapters();
            return chapter;
        }

        /**
         * Update chapter
         */
        updateChapter(videoId, chapterId, updates) {
            if (!this.chapters[videoId]) return null;

            const chapterIndex = this.chapters[videoId].findIndex(c => c.id === chapterId);
            if (chapterIndex === -1) return null;

            this.chapters[videoId][chapterIndex] = {
                ...this.chapters[videoId][chapterIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            // Re-sort
            this.chapters[videoId].sort((a, b) => a.timestamp - b.timestamp);
            
            this.saveChapters();
            return this.chapters[videoId][chapterIndex];
        }

        /**
         * Delete chapter
         */
        deleteChapter(videoId, chapterId) {
            if (!this.chapters[videoId]) return false;

            const chapterIndex = this.chapters[videoId].findIndex(c => c.id === chapterId);
            if (chapterIndex === -1) return false;

            this.chapters[videoId].splice(chapterIndex, 1);
            this.saveChapters();
            return true;
        }

        /**
         * Delete all chapters for a video
         */
        deleteAllChapters(videoId) {
            if (this.chapters[videoId]) {
                delete this.chapters[videoId];
                this.saveChapters();
            }
        }

        /**
         * Import chapters from YouTube description
         */
        importFromYouTubeDescription(videoId, description) {
            // Parse YouTube timestamp format: 0:00, 1:30, 10:45, 1:02:30
            const timestampPattern = /(\d{1,2}):(\d{2})(?::(\d{2}))?/g;
            const matches = [...description.matchAll(timestampPattern)];

            const chapters = [];
            for (const match of matches) {
                const hours = match[1];
                const minutes = match[2];
                const seconds = match[3] || '0';
                
                const totalSeconds = (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
                const nextTimestamp = matches[matches.indexOf(match) + 1];
                
                let chapterTitle = 'Chapter';
                if (nextTimestamp) {
                    const nextMatch = nextTimestamp[0];
                    const titleMatch = description.substring(match.index + match[0].length, nextTimestamp.index).trim();
                    if (titleMatch && titleMatch.length < 100) {
                        chapterTitle = titleMatch.replace(/^[-.\s]+/, '');
                    }
                }

                chapters.push({
                    id: Date.now() + totalSeconds,
                    title: chapterTitle,
                    timestamp: totalSeconds,
                    description: '',
                    isAutoDetected: true,
                    createdAt: new Date().toISOString()
                });
            }

            if (chapters.length > 0) {
                this.chapters[videoId] = chapters;
                this.saveChapters();
            }

            return chapters;
        }

        /**
         * Format timestamp for display
         */
        formatTimestamp(seconds, includeHours = false) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            if (includeHours || hrs > 0) {
                return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        /**
         * Export chapters
         */
        exportChapters(videoId) {
            const chapters = this.getChapters(videoId);
            return chapters.map(c => ({
                title: c.title,
                timestamp: this.formatTimestamp(c.timestamp)
            })).join('\n');
        }
    }

    // Create global instance
    window.chaptersManager = new ChaptersManager();

    /**
     * Initialize chapters UI
     */
    function initChapters() {
        console.log('📑 Chapters system initialized');
    }

    /**
     * Create chapters panel for video page
     */
    window.createChaptersPanel = function(videoId, videoTitle) {
        const panel = document.createElement('div');
        panel.id = 'chaptersPanel';
        panel.className = 'chapters-panel';
        panel.innerHTML = `
            <div class="chapters-header">
                <h3><i class="fas fa-list-ul"></i> Video Chapters</h3>
                <button class="btn-icon" onclick="showAddChapterModal('${videoId}')" title="Add Chapter">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="chapters-list" id="chaptersList">
                <div class="empty-chapters">
                    <i class="fas fa-video"></i>
                    <p>No chapters yet</p>
                    <small>Add chapters to jump to specific parts of the video</small>
                </div>
            </div>
        `;
        return panel;
    };

    /**
     * Show add chapter modal
     */
    window.showAddChapterModal = function(videoId) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'addChapterModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Add Chapter</h3>
                    <button class="modal-close" onclick="closeAddChapterModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitChapter(event, '${videoId}')">
                        <div class="form-group">
                            <label>Chapter Title *</label>
                            <input type="text" id="chapterTitle" placeholder="e.g., Introduction" required>
                        </div>
                        <div class="form-group">
                            <label>Timestamp (MM:SS or HH:MM:SS) *</label>
                            <input type="text" id="chapterTimestamp" placeholder="0:00" required 
                                   pattern="\\d{1,2}:\\d{2}(:\\d{2})?" 
                                   title="Format: MM:SS or HH:MM:SS">
                        </div>
                        <div class="form-group">
                            <label>Description (Optional)</label>
                            <textarea id="chapterDescription" placeholder="Add a description for this chapter"></textarea>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-plus"></i> Add Chapter
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeAddChapterModal()" style="flex: 1;">
                                Cancel
                            </button>
                        </div>
                    </form>
                    <div class="chapter-help">
                        <small><i class="fas fa-info-circle"></i> Tip: Pause video at desired position, then copy timestamp</small>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Parse timestamp input
        document.getElementById('chapterTimestamp').addEventListener('input', function(e) {
            const value = e.target.value;
            const pattern = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
            const match = value.match(pattern);
            if (match) {
                const hrs = parseInt(match[1]) || 0;
                const mins = parseInt(match[2]) || 0;
                const secs = parseInt(match[3]) || 0;
                const totalSecs = hrs * 3600 + mins * 60 + secs;
                e.target.dataset.seconds = totalSecs;
            }
        });
    };

    /**
     * Close add chapter modal
     */
    window.closeAddChapterModal = function() {
        const modal = document.getElementById('addChapterModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Submit chapter form
     */
    window.submitChapter = function(event, videoId) {
        event.preventDefault();

        const title = document.getElementById('chapterTitle').value.trim();
        const timestampInput = document.getElementById('chapterTimestamp').value;
        const description = document.getElementById('chapterDescription').value.trim();

        // Parse timestamp
        const parts = timestampInput.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else {
            seconds = parts[0];
        }

        const chapter = window.chaptersManager.addChapter(videoId, title, seconds, description);
        
        // Close modal and refresh
        window.closeAddChapterModal();
        window.refreshChaptersList(videoId);
        window.showNotification('✅ Chapter added successfully!');
    };

    /**
     * Refresh chapters list
     */
    window.refreshChaptersList = function(videoId) {
        const list = document.getElementById('chaptersList');
        if (!list) return;

        const chapters = window.chaptersManager.getChapters(videoId);
        
        if (chapters.length === 0) {
            list.innerHTML = `
                <div class="empty-chapters">
                    <i class="fas fa-video"></i>
                    <p>No chapters yet</p>
                    <small>Add chapters to jump to specific parts of the video</small>
                </div>
            `;
            return;
        }

        list.innerHTML = chapters.map(chapter => `
            <div class="chapter-item" onclick="seekToChapter(${chapter.timestamp})">
                <div class="chapter-time">${window.chaptersManager.formatTimestamp(chapter.timestamp)}</div>
                <div class="chapter-content">
                    <div class="chapter-title">${chapter.title}</div>
                    ${chapter.description ? `<div class="chapter-desc">${chapter.description}</div>` : ''}
                </div>
                <div class="chapter-actions">
                    <button class="btn-icon-sm" onclick="event.stopPropagation(); editChapter('${videoId}', ${chapter.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm" onclick="event.stopPropagation(); deleteChapter('${videoId}', ${chapter.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    };

    /**
     * Seek to chapter timestamp
     */
    window.seekToChapter = function(seconds) {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = seconds;
            video.play();
        }
    };

    /**
     * Edit chapter
     */
    window.editChapter = function(videoId, chapterId) {
        const chapter = window.chaptersManager.getChapters(videoId).find(c => c.id === chapterId);
        if (!chapter) return;

        // Populate modal with chapter data
        window.showAddChapterModal(videoId);
        document.getElementById('chapterTitle').value = chapter.title;
        document.getElementById('chapterTimestamp').value = window.chaptersManager.formatTimestamp(chapter.timestamp);
        document.getElementById('chapterDescription').value = chapter.description || '';

        // Change form to update mode
        const form = document.querySelector('#addChapterModal form');
        form.onsubmit = function(e) {
            e.preventDefault();
            const updates = {
                title: document.getElementById('chapterTitle').value.trim(),
                description: document.getElementById('chapterDescription').value.trim()
            };
            
            const parts = document.getElementById('chapterTimestamp').value.split(':').map(Number);
            let seconds = 0;
            if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
            else seconds = parts[0];
            
            updates.timestamp = seconds;

            window.chaptersManager.updateChapter(videoId, chapterId, updates);
            window.closeAddChapterModal();
            window.refreshChaptersList(videoId);
            window.showNotification('✅ Chapter updated!');
        };

        // Add hidden input for chapter ID
        let input = document.getElementById('chapterId');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.id = 'chapterId';
            form.appendChild(input);
        }
        input.value = chapterId;
    };

    /**
     * Delete chapter
     */
    window.deleteChapter = function(videoId, chapterId) {
        if (!confirm('Are you sure you want to delete this chapter?')) return;
        
        window.chaptersManager.deleteChapter(videoId, chapterId);
        window.refreshChaptersList(videoId);
        window.showNotification('🗑️ Chapter deleted');
    };

    /**
     * Import chapters from description
     */
    window.importChaptersFromDescription = function(videoId, description) {
        const count = window.chaptersManager.importFromYouTubeDescription(videoId, description);
        window.refreshChaptersList(videoId);
        
        if (count.length > 0) {
            window.showNotification(`✅ ${count.length} chapters imported!`);
        } else {
            window.showNotification('ℹ️ No chapters found in description');
        }
    };

    /**
     * Export chapters
     */
    window.exportChapters = function(videoId) {
        const text = window.chaptersManager.exportChapters(videoId);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chapters-${videoId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        window.showNotification('📤 Chapters exported!');
    };

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .chapters-panel {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .chapters-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.05));
            border-bottom: 1px solid var(--border-color);
        }
        
        .chapters-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .chapters-list {
            max-height: 400px;
            overflow-y: auto;
            padding: 1rem;
        }
        
        .empty-chapters {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }
        
        .empty-chapters i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.3;
        }
        
        .empty-chapters p {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        
        .chapter-item {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            padding: 0.75rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 0.5rem;
        }
        
        .chapter-item:hover {
            background: var(--hover-bg);
        }
        
        .chapter-time {
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--primary-color);
            font-weight: 600;
            min-width: 70px;
        }
        
        .chapter-content {
            flex: 1;
            min-width: 0;
        }
        
        .chapter-title {
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }
        
        .chapter-desc {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        .chapter-actions {
            display: flex;
            gap: 0.25rem;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .chapter-item:hover .chapter-actions {
            opacity: 1;
        }
        
        .btn-icon-sm {
            padding: 0.4rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .btn-icon-sm:hover {
            background: var(--primary-color);
            color: white;
        }
        
        .chapter-help {
            margin-top: 1rem;
            padding: 0.75rem;
            background: var(--bg-color);
            border-radius: 8px;
            color: var(--text-secondary);
        }
        
        .chapter-help i {
            color: var(--primary-color);
        }
    `;
    document.head.appendChild(style);

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChapters);
    } else {
        initChapters();
    }

})();

