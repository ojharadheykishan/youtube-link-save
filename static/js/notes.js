/**
 * VideoHub - Video Notes System
 * Add personal notes to videos with timestamps
 */

(function() {
    'use strict';

    const NOTES_KEY = 'videohub_notes';

    /**
     * Notes Manager Class
     */
    class NotesManager {
        constructor() {
            this.notes = this.loadNotes();
        }

        /**
         * Load notes from localStorage
         */
        loadNotes() {
            try {
                const data = localStorage.getItem(NOTES_KEY);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                console.error('Error loading notes:', e);
                return {};
            }
        }

        /**
         * Save notes
         */
        saveNotes() {
            try {
                localStorage.setItem(NOTES_KEY, JSON.stringify(this.notes));
            } catch (e) {
                console.error('Error saving notes:', e);
            }
        }

        /**
         * Get all notes for a video
         */
        getVideoNotes(videoId) {
            return this.notes[videoId] || [];
        }

        /**
         * Add note to video
         */
        addNote(videoId, content, timestamp = null) {
            if (!this.notes[videoId]) {
                this.notes[videoId] = [];
            }

            const note = {
                id: Date.now(),
                content: content,
                timestamp: timestamp,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.notes[videoId].push(note);
            this.saveNotes();
            return note;
        }

        /**
         * Update note
         */
        updateNote(videoId, noteId, content, timestamp = null) {
            if (!this.notes[videoId]) return null;

            const noteIndex = this.notes[videoId].findIndex(n => n.id === noteId);
            if (noteIndex === -1) return null;

            this.notes[videoId][noteIndex] = {
                ...this.notes[videoId][noteIndex],
                content: content,
                timestamp: timestamp,
                updatedAt: new Date().toISOString()
            };

            this.saveNotes();
            return this.notes[videoId][noteIndex];
        }

        /**
         * Delete note
         */
        deleteNote(videoId, noteId) {
            if (!this.notes[videoId]) return false;

            const noteIndex = this.notes[videoId].findIndex(n => n.id === noteId);
            if (noteIndex === -1) return false;

            this.notes[videoId].splice(noteIndex, 1);
            
            // Clean up empty video
            if (this.notes[videoId].length === 0) {
                delete this.notes[videoId];
            }
            
            this.saveNotes();
            return true;
        }

        /**
         * Delete all notes for a video
         */
        deleteVideoNotes(videoId) {
            if (this.notes[videoId]) {
                delete this.notes[videoId];
                this.saveNotes();
            }
        }

        /**
         * Search notes across all videos
         */
        searchNotes(query) {
            const results = [];
            const searchLower = query.toLowerCase();

            for (const [videoId, notes] of Object.entries(this.notes)) {
                for (const note of notes) {
                    if (note.content.toLowerCase().includes(searchLower)) {
                        results.push({
                            videoId: videoId,
                            ...note
                        });
                    }
                }
            }

            return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        /**
         * Get all notes for user
         */
        getAllNotes() {
            const allNotes = [];
            for (const [videoId, notes] of Object.entries(this.notes)) {
                for (const note of notes) {
                    allNotes.push({
                        videoId: videoId,
                        ...note
                    });
                }
            }
            return allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        /**
         * Format timestamp
         */
        formatTimestamp(seconds) {
            if (!seconds && seconds !== 0) return '';
            
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        /**
         * Export notes to text
         */
        exportNotes(videoId = null) {
            let output = '';
            
            if (videoId) {
                const notes = this.getVideoNotes(videoId);
                output = notes.map(n => {
                    let text = `[${this.formatTimestamp(n.timestamp)}] ${n.content}`;
                    if (n.createdAt !== n.updatedAt) {
                        text += ` (updated: ${new Date(n.updatedAt).toLocaleDateString()})`;
                    }
                    return text;
                }).join('\n\n');
            } else {
                const allNotes = this.getAllNotes();
                output = allNotes.map(n => {
                    let text = `Video: ${n.videoId}\n`;
                    text += `Time: ${this.formatTimestamp(n.timestamp)}\n`;
                    text += `Note: ${n.content}\n`;
                    text += `Date: ${new Date(n.createdAt).toLocaleString()}`;
                    text += '\n' + '-'.repeat(50) + '\n';
                    return text;
                }).join('\n');
            }
            
            return output;
        }
    }

    // Create global instance
    window.notesManager = new NotesManager();

    /**
     * Initialize notes UI
     */
    function initNotes() {
        console.log('📝 Notes system initialized');
    }

    /**
     * Create notes panel for video page
     */
    window.createNotesPanel = function(videoId) {
        const panel = document.createElement('div');
        panel.id = 'notesPanel';
        panel.className = 'notes-panel';
        panel.innerHTML = `
            <div class="notes-header">
                <h3><i class="fas fa-sticky-note"></i> My Notes</h3>
                <div class="notes-actions">
                    <button class="btn-icon" onclick="showAddNoteModal('${videoId}')" title="Add Note">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon" onclick="toggleNotesPanel()" title="Minimize">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
            <div class="notes-list" id="notesList">
                <div class="empty-notes">
                    <i class="fas fa-pen-fancy"></i>
                    <p>No notes yet</p>
                    <small>Add notes to remember important points</small>
                </div>
            </div>
        `;
        return panel;
    };

    /**
     * Show add note modal
     */
    window.showAddNoteModal = function(videoId) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'addNoteModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-plus-circle"></i> Add Note</h3>
                    <button class="modal-close" onclick="closeAddNoteModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form onsubmit="submitNote(event, '${videoId}')">
                        <div class="form-group">
                            <label>Your Note *</label>
                            <textarea id="noteContent" rows="4" placeholder="Write your note here..." required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--input-bg); color: var(--text-primary); resize: vertical;"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Timestamp (Optional)</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="noteTimestamp" placeholder="0:00" pattern="\\d{1,2}:\\d{2}(:\\d{2})?" title="Format: MM:SS or HH:MM:SS" style="flex: 1;">
                                <button type="button" class="btn-secondary" onclick="getCurrentTimestamp('${videoId}')" title="Get current video time">
                                    <i class="fas fa-clock"></i>
                                </button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-save"></i> Save Note
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeAddNoteModal()" style="flex: 1;">
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
     * Close add note modal
     */
    window.closeAddNoteModal = function() {
        const modal = document.getElementById('addNoteModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Get current video timestamp
     */
    window.getCurrentTimestamp = function(videoId) {
        const video = document.querySelector('video');
        if (video) {
            const currentTime = video.currentTime;
            const hrs = Math.floor(currentTime / 3600);
            const mins = Math.floor((currentTime % 3600) / 60);
            const secs = Math.floor(currentTime % 60);
            
            let timestamp = '';
            if (hrs > 0) {
                timestamp = `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                timestamp = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
            
            document.getElementById('noteTimestamp').value = timestamp;
            document.getElementById('noteTimestamp').dataset.seconds = currentTime;
        }
    };

    /**
     * Submit note form
     */
    window.submitNote = function(event, videoId) {
        event.preventDefault();

        const content = document.getElementById('noteContent').value.trim();
        const timestampInput = document.getElementById('noteTimestamp').value;
        
        let timestamp = null;
        if (timestampInput) {
            const parts = timestampInput.split(':').map(Number);
            if (parts.length === 3) {
                timestamp = parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                timestamp = parts[0] * 60 + parts[1];
            } else {
                timestamp = parts[0];
            }
        }

        const note = window.notesManager.addNote(videoId, content, timestamp);
        
        window.closeAddNoteModal();
        window.refreshNotesList(videoId);
        window.showNotification('✅ Note saved!');
    };

    /**
     * Refresh notes list
     */
    window.refreshNotesList = function(videoId) {
        const list = document.getElementById('notesList');
        if (!list) return;

        const notes = window.notesManager.getVideoNotes(videoId);
        
        if (notes.length === 0) {
            list.innerHTML = `
                <div class="empty-notes">
                    <i class="fas fa-pen-fancy"></i>
                    <p>No notes yet</p>
                    <small>Add notes to remember important points</small>
                </div>
            `;
            return;
        }

        list.innerHTML = notes.map(note => `
            <div class="note-item" id="note-${note.id}">
                <div class="note-header">
                    ${note.timestamp !== null ? 
                        `<span class="note-timestamp" onclick="seekToTimestamp(${note.timestamp})">${window.notesManager.formatTimestamp(note.timestamp)}</span>` : 
                        '<span class="note-timestamp no-time">No time</span>'
                    }
                    <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="note-content">${escapeHtml(note.content)}</div>
                <div class="note-actions">
                    ${note.timestamp !== null ? 
                        `<button class="btn-icon-sm" onclick="seekToTimestamp(${note.timestamp})" title="Jump to timestamp">
                            <i class="fas fa-play"></i>
                        </button>` : ''
                    }
                    <button class="btn-icon-sm" onclick="editNote('${videoId}', ${note.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm" onclick="deleteNote('${videoId}', ${note.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    };

    /**
     * Seek to timestamp
     */
    window.seekToTimestamp = function(seconds) {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = seconds;
            video.play();
        }
    };

    /**
     * Edit note
     */
    window.editNote = function(videoId, noteId) {
        const note = window.notesManager.getVideoNotes(videoId).find(n => n.id === noteId);
        if (!note) return;

        // Populate modal with note data
        window.showAddNoteModal(videoId);
        document.getElementById('noteContent').value = note.content;
        document.getElementById('noteTimestamp').value = note.timestamp !== null ? 
            window.notesManager.formatTimestamp(note.timestamp) : '';

        // Change form to update mode
        const form = document.querySelector('#addNoteModal form');
        form.onsubmit = function(e) {
            e.preventDefault();
            
            const content = document.getElementById('noteContent').value.trim();
            const timestampInput = document.getElementById('noteTimestamp').value;
            
            let timestamp = null;
            if (timestampInput) {
                const parts = timestampInput.split(':').map(Number);
                if (parts.length === 3) timestamp = parts[0] * 3600 + parts[1] * 60 + parts[2];
                else if (parts.length === 2) timestamp = parts[0] * 60 + parts[1];
                else timestamp = parts[0];
            }

            window.notesManager.updateNote(videoId, noteId, content, timestamp);
            window.closeAddNoteModal();
            window.refreshNotesList(videoId);
            window.showNotification('✅ Note updated!');
        };
    };

    /**
     * Delete note
     */
    window.deleteNote = function(videoId, noteId) {
        if (!confirm('Are you sure you want to delete this note?')) return;
        
        window.notesManager.deleteNote(videoId, noteId);
        window.refreshNotesList(videoId);
        window.showNotification('🗑️ Note deleted');
    };

    /**
     * Toggle notes panel
     */
    window.toggleNotesPanel = function() {
        const panel = document.getElementById('notesPanel');
        const list = document.getElementById('notesList');
        if (panel && list) {
            list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
    };

    /**
     * Export notes
     */
    window.exportNotes = function(videoId = null) {
        const text = window.notesManager.exportNotes(videoId);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = videoId ? `notes-${videoId}.txt` : 'all-notes.txt';
        a.click();
        URL.revokeObjectURL(url);
        window.showNotification('📤 Notes exported!');
    };

    /**
     * Search all notes
     */
    window.searchAllNotes = function(query) {
        return window.notesManager.searchNotes(query);
    };

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notes-panel {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .notes-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, rgba(103, 58, 183, 0.1), rgba(103, 58, 183, 0.05));
            border-bottom: 1px solid var(--border-color);
        }
        
        .notes-header h3 {
            margin: 0;
            color: var(--text-primary);
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .notes-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .notes-list {
            max-height: 400px;
            overflow-y: auto;
            padding: 1rem;
        }
        
        .empty-notes {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }
        
        .empty-notes i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.3;
            color: var(--primary-color);
        }
        
        .empty-notes p {
            margin: 0 0 0.5rem 0;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        
        .note-item {
            background: var(--bg-color);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            transition: all 0.2s;
        }
        
        .note-item:hover {
            box-shadow: 0 2px 10px var(--shadow-color);
        }
        
        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .note-timestamp {
            font-family: monospace;
            font-size: 0.85rem;
            color: var(--primary-color);
            font-weight: 600;
            background: rgba(255, 107, 107, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .note-timestamp:hover {
            background: var(--primary-color);
            color: white;
        }
        
        .note-timestamp.no-time {
            color: var(--text-secondary);
            background: var(--hover-bg);
            cursor: default;
        }
        
        .note-date {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        
        .note-content {
            color: var(--text-primary);
            line-height: 1.6;
            margin-bottom: 0.75rem;
            white-space: pre-wrap;
        }
        
        .note-actions {
            display: flex;
            gap: 0.25rem;
            justify-content: flex-end;
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
    `;
    document.head.appendChild(style);

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotes);
    } else {
        initNotes();
    }

})();

