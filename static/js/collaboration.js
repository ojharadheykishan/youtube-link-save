/**
 * VideoHub - Collaboration System
 * Share folders with other users, collaborate on collections
 */

(function() {
    'use strict';

    const COLLABORATIONS_KEY = 'videohub_collaborations';

    /**
     * Collaboration Manager Class
     */
    class CollaborationManager {
        constructor() {
            this.collaborations = this.loadCollaborations();
        }

        loadCollaborations() {
            try {
                const data = localStorage.getItem(COLLABORATIONS_KEY);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        }

        saveCollaborations() {
            try {
                localStorage.setItem(COLLABORATIONS_KEY, JSON.stringify(this.collaborations));
            } catch (e) {
                console.error('Error saving collaborations:', e);
            }
        }

        getUserCollaborations(username) {
            return this.collaborations[username] || [];
        }

        getSharedWithMe(username) {
            const shared = [];
            for (const [owner, folders] of Object.entries(this.collaborations)) {
                if (owner !== username) {
                    for (const collab of folders) {
                        if (collab.sharedWith.includes(username)) {
                            shared.push({ ...collab, owner });
                        }
                    }
                }
            }
            return shared;
        }

        shareFolder(owner, folderPath, sharedWith, permission = 'view') {
            if (!this.collaborations[owner]) {
                this.collaborations[owner] = [];
            }

            let collab = this.collaborations[owner].find(c => c.folderPath === folderPath);

            if (collab) {
                collab.sharedWith = [...new Set([...collab.sharedWith, ...sharedWith])];
                collab.permission = permission;
                collab.updatedAt = new Date().toISOString();
            } else {
                this.collaborations[owner].push({
                    id: 'collab_' + Date.now(),
                    folderPath,
                    sharedWith,
                    permission,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            this.saveCollaborations();
            return true;
        }

        removeCollaborator(owner, folderPath, usernameToRemove) {
            if (!this.collaborations[owner]) return false;

            const collab = this.collaborations[owner].find(c => c.folderPath === folderPath);
            if (!collab) return false;

            collab.sharedWith = collab.sharedWith.filter(u => u !== usernameToRemove);
            collab.updatedAt = new Date().toISOString();
            
            if (collab.sharedWith.length === 0) {
                this.collaborations[owner] = this.collaborations[owner].filter(c => c.folderPath !== folderPath);
            }

            this.saveCollaborations();
            return true;
        }

        canAccess(owner, folderPath, username) {
            if (owner === username) return true;
            const collabs = this.collaborations[owner] || [];
            const collab = collabs.find(c => c.folderPath === folderPath);
            return collab ? collab.sharedWith.includes(username) : false;
        }
    }

    window.collabManager = new CollaborationManager();

    function initCollaboration() {
        console.log('Collaboration system initialized');
    }

    window.showShareFolderModal = function(folderPath, folderName) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'shareFolderModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-share-alt"></i> Share Folder</h3>
                    <button class="modal-close" onclick="closeShareFolderModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="share-folder-info">
                        <i class="fas fa-folder"></i>
                        <span>Sharing: <strong>${escapeHtml(folderName)}</strong></span>
                    </div>
                    <form onsubmit="submitShareFolder(event, '${escapeHtml(folderPath)}')">
                        <div class="form-group">
                            <label>Share with users (comma separated)</label>
                            <input type="text" id="shareWithUsers" placeholder="e.g., user1, user2, user3" required>
                        </div>
                        <div class="form-group">
                            <label>Permission Level</label>
                            <select id="sharePermission">
                                <option value="view">View Only</option>
                                <option value="edit">Can Edit</option>
                            </select>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button type="submit" class="btn-primary" style="flex: 1;">
                                <i class="fas fa-share"></i> Share
                            </button>
                            <button type="button" class="btn-secondary" onclick="closeShareFolderModal()" style="flex: 1;">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.closeShareFolderModal = function() {
        const modal = document.getElementById('shareFolderModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    window.submitShareFolder = function(event, folderPath) {
        event.preventDefault();
        const shareWithInput = document.getElementById('shareWithUsers').value;
        const permission = document.getElementById('sharePermission').value;
        
        const users = shareWithInput.split(',').map(u => u.trim()).filter(u => u.length > 0);
        if (users.length === 0) {
            alert('Please enter at least one username');
            return;
        }

        const currentUser = window.currentUser || 'admin';
        window.collabManager.shareFolder(currentUser, folderPath, users, permission);
        window.closeShareFolderModal();
        window.showNotification('Folder shared successfully!');
    };

    window.createSharedFoldersSection = function() {
        const section = document.createElement('div');
        section.className = 'sidebar-section';
        section.id = 'sharedFoldersSection';
        section.innerHTML = `
            <div class="sidebar-title">Shared With Me</div>
            <div id="sharedFoldersList" class="shared-folders-list"></div>
        `;
        return section;
    };

    window.refreshSharedFolders = function() {
        const list = document.getElementById('sharedFoldersList');
        if (!list) return;

        const currentUser = window.currentUser || 'admin';
        const sharedFolders = window.collabManager.getSharedWithMe(currentUser);

        if (sharedFolders.length === 0) {
            list.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary); text-align: center;">No folders shared with you</div>';
            return;
        }

        list.innerHTML = sharedFolders.map(share => `
            <a href="/folder/${encodeURIComponent(share.folderPath)}" class="sidebar-item">
                <i class="fas fa-folder-share"></i>
                <span>${escapeHtml(share.folderPath.split('/').pop())}</span>
            </a>
        `).join('');
    };

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    const style = document.createElement('style');
    style.textContent = `
        .share-folder-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(255, 107, 107, 0.1);
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .share-folder-info i { font-size: 1.5rem; color: var(--primary-color); }
        .shared-folders-list .loading { text-align: center; padding: 1rem; color: var(--text-secondary); }
    `;
    document.head.appendChild(style);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCollaboration);
    } else {
        initCollaboration();
    }

})();

je 