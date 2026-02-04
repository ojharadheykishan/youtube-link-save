/**
 * VideoHub - Export System
 * Export video lists, folders, and notes to PDF/Excel formats
 */

(function() {
    'use strict';

    /**
     * Export Manager Class
     */
    class ExportManager {
        constructor() {
            this.formats = ['json', 'csv', 'txt'];
        }

        /**
         * Export videos data
         */
        exportVideos(videos, format = 'json') {
            let data, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'csv':
                    data = this.videosToCSV(videos);
                    filename = `videos-${this.getDate()}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'txt':
                    data = this.videosToText(videos);
                    filename = `videos-${this.getDate()}.txt`;
                    mimeType = 'text/plain';
                    break;
                case 'json':
                default:
                    data = JSON.stringify(videos, null, 2);
                    filename = `videos-${this.getDate()}.json`;
                    mimeType = 'application/json';
                    break;
            }

            this.download(data, filename, mimeType);
            this.showNotification(`✅ Exported ${videos.length} videos to ${format.toUpperCase()}`);
        }

        /**
         * Export folders data
         */
        exportFolders(folders, format = 'json') {
            let data, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'csv':
                    data = this.foldersToCSV(folders);
                    filename = `folders-${this.getDate()}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'txt':
                    data = this.foldersToText(folders);
                    filename = `folders-${this.getDate()}.txt`;
                    mimeType = 'text/plain';
                    break;
                case 'json':
                default:
                    data = JSON.stringify(folders, null, 2);
                    filename = `folders-${this.getDate()}.json`;
                    mimeType = 'application/json';
                    break;
            }

            this.download(data, filename, mimeType);
            this.showNotification(`✅ Exported ${folders.length} folders to ${format.toUpperCase()}`);
        }

        /**
         * Export notes
         */
        exportNotes(notes, format = 'json') {
            let data, filename, mimeType;

            switch (format.toLowerCase()) {
                case 'csv':
                    data = this.notesToCSV(notes);
                    filename = `notes-${this.getDate()}.csv`;
                    mimeType = 'text/csv';
                    break;
                case 'txt':
                    data = this.notesToText(notes);
                    filename = `notes-${this.getDate()}.txt`;
                    mimeType = 'text/plain';
                    break;
                case 'json':
                default:
                    data = JSON.stringify(notes, null, 2);
                    filename = `notes-${this.getDate()}.json`;
                    mimeType = 'application/json';
                    break;
            }

            this.download(data, filename, mimeType);
            this.showNotification(`✅ Exported ${notes.length} notes to ${format.toUpperCase()}`);
        }

        /**
         * Convert videos to CSV
         */
        videosToCSV(videos) {
            const headers = ['Title', 'URL', 'Folder', 'Views', 'Added Date', 'Duration'];
            const rows = videos.map(v => [
                `"${(v.title || '').replace(/"/g, '""')}"`,
                v.url || v.source_url || '',
                v.folder_name || v.folder || '',
                v.views_count || 0,
                v.added_time || v.added_date || '',
                v.duration || 0
            ]);
            
            return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        }

        /**
         * Convert videos to text
         */
        videosToText(videos) {
            let text = 'VIDEO LIST\n';
            text += '═'.repeat(50) + '\n\n';
            text += `Total Videos: ${videos.length}\n`;
            text += `Export Date: ${new Date().toLocaleString()}\n\n`;
            text += '─'.repeat(50) + '\n\n';

            videos.forEach((v, i) => {
                text += `${i + 1}. ${v.title || 'Untitled'}\n`;
                text += `   URL: ${v.url || v.source_url || 'N/A'}\n`;
                text += `   Folder: ${v.folder_name || v.folder || 'Root'}\n`;
                text += `   Views: ${v.views_count || 0}\n`;
                text += `   Added: ${v.added_time || v.added_date || 'N/A'}\n`;
                text += '\n';
            });

            return text;
        }

        /**
         * Convert folders to CSV
         */
        foldersToCSV(folders) {
            const headers = ['Folder Name', 'Path', 'Video Count', 'Created'];
            const rows = folders.map(f => [
                `"${(f.name || '').replace(/"/g, '""')}"`,
                f.path || '',
                f.count || 0,
                f.created_time || ''
            ]);
            
            return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        }

        /**
         * Convert folders to text
         */
        foldersToText(folders) {
            let text = 'FOLDER LIST\n';
            text += '═'.repeat(50) + '\n\n';
            text += `Total Folders: ${folders.length}\n`;
            text += `Export Date: ${new Date().toLocaleString()}\n\n`;
            text += '─'.repeat(50) + '\n\n';

            folders.forEach((f, i) => {
                text += `${i + 1}. ${f.name || 'Untitled'}\n`;
                text += `   Path: ${f.path || 'Root'}\n`;
                text += `   Videos: ${f.count || 0}\n`;
                text += `   Created: ${f.created_time || 'N/A'}\n`;
                text += '\n';
            });

            return text;
        }

        /**
         * Convert notes to CSV
         */
        notesToCSV(notes) {
            const headers = ['Video ID', 'Timestamp', 'Note', 'Created'];
            const rows = notes.map(n => [
                n.videoId || '',
                n.timestamp || '',
                `"${(n.content || '').replace(/"/g, '""')}"`,
                n.createdAt || n.created_at || ''
            ]);
            
            return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        }

        /**
         * Convert notes to text
         */
        notesToText(notes) {
            let text = 'VIDEO NOTES\n';
            text += '═'.repeat(50) + '\n\n';
            text += `Total Notes: ${notes.length}\n`;
            text += `Export Date: ${new Date().toLocaleString()}\n\n`;
            text += '─'.repeat(50) + '\n\n';

            notes.forEach((n, i) => {
                text += `${i + 1}. Video: ${n.videoId || 'Unknown'}\n`;
                text += `   Time: ${this.formatTimestamp(n.timestamp)}\n`;
                text += `   Note: ${n.content || ''}\n`;
                text += `   Created: ${n.createdAt || n.created_at || 'N/A'}\n`;
                text += '\n';
            });

            return text;
        }

        /**
         * Format timestamp
         */
        formatTimestamp(seconds) {
            if (!seconds && seconds !== 0) return 'N/A';
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return hrs > 0 
                ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                : `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        /**
         * Get current date string
         */
        getDate() {
            return new Date().toISOString().split('T')[0];
        }

        /**
         * Download file
         */
        download(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * Show notification
         */
        showNotification(message) {
            if (typeof window.showNotification === 'function') {
                window.showNotification(message);
            } else {
                console.log(message);
                alert(message);
            }
        }

        /**
         * Generate PDF (using basic text for now - requires jsPDF library)
         */
        async exportToPDF(data, type = 'videos') {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                // Create a simple text-based PDF-like HTML for printing
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${type.toUpperCase()} - Export</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            h1 { color: #333; border-bottom: 2px solid #ff0000; padding-bottom: 10px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                            th { background: linear-gradient(135deg, #ff0000, #cc0000); color: white; }
                            tr:nth-child(even) { background: #f9f9f9; }
                            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
                        </style>
                    </head>
                    <body>
                        <h1>📺 VideoHub - ${type.charAt(0).toUpperCase() + type.slice(1)} Export</h1>
                        <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
                        ${this.generateHTMLTable(data, type)}
                        <div class="footer">
                            <p>Generated by VideoHub - Made by Radhey Kishan Ojha 🇮🇳</p>
                        </div>
                        <script>
                            window.onload = function() { window.print(); }
                        <\/script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                this.showNotification('📄 PDF export opened in print dialog');
            } else {
                // Use jsPDF if available
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(20);
                doc.setTextColor(255, 0, 0);
                doc.text('VideoHub Export', 20, 20);
                
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} - Export Date: ${new Date().toLocaleDateString()}`, 20, 30);
                
                // Add content
                let y = 50;
                if (Array.isArray(data)) {
                    data.forEach((item, i) => {
                        if (y > 270) {
                            doc.addPage();
                            y = 20;
                        }
                        doc.text(`${i + 1}. ${item.title || item.name || 'Item'}`, 20, y);
                        y += 10;
                    });
                }
                
                doc.save(`${type}-${this.getDate()}.pdf`);
                this.showNotification('✅ PDF exported successfully');
            }
        }

        /**
         * Generate HTML table for print
         */
        generateHTMLTable(data, type) {
            if (!data || data.length === 0) return '<p>No data to export</p>';
            
            let html = '<table><thead><tr>';
            
            if (type === 'videos') {
                html += '<th>#</th><th>Title</th><th>Folder</th><th>Views</th><th>Added</th>';
            } else if (type === 'folders') {
                html += '<th>#</th><th>Name</th><th>Path</th><th>Videos</th>';
            } else if (type === 'notes') {
                html += '<th>#</th><th>Video</th><th>Time</th><th>Note</th>';
            }
            
            html += '</tr></thead><tbody>';
            
            data.forEach((item, i) => {
                html += '<tr>';
                html += `<td>${i + 1}</td>`;
                
                if (type === 'videos') {
                    html += `<td>${item.title || ''}</td>`;
                    html += `<td>${item.folder_name || item.folder || ''}</td>`;
                    html += `<td>${item.views_count || 0}</td>`;
                    html += `<td>${(item.added_time || item.added_date || '').substring(0, 10)}</td>`;
                } else if (type === 'folders') {
                    html += `<td>${item.name || ''}</td>`;
                    html += `<td>${item.path || ''}</td>`;
                    html += `<td>${item.count || 0}</td>`;
                } else if (type === 'notes') {
                    html += `<td>${item.videoId || ''}</td>`;
                    html += `<td>${this.formatTimestamp(item.timestamp)}</td>`;
                    html += `<td>${(item.content || '').substring(0, 50)}${(item.content || '').length > 50 ? '...' : ''}</td>`;
                }
                
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            return html;
        }
    }

    // Create global instance
    window.exportManager = new ExportManager();

    /**
     * Initialize export UI
     */
    function initExport() {
        console.log('📤 Export system initialized');
    }

    /**
     * Show export modal
     */
    window.showExportModal = function(type = 'videos') {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'exportModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-export"></i> Export ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    <button class="modal-close" onclick="closeExportModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        Choose your preferred export format:
                    </p>
                    
                    <div class="export-options">
                        <button class="export-btn" onclick="exportAsFormat('json', '${type}')">
                            <i class="fas fa-file-code"></i>
                            <span>JSON</span>
                            <small>Full data structure</small>
                        </button>
                        
                        <button class="export-btn" onclick="exportAsFormat('csv', '${type}')">
                            <i class="fas fa-file-excel"></i>
                            <span>CSV</span>
                            <small>Spreadsheet compatible</small>
                        </button>
                        
                        <button class="export-btn" onclick="exportAsFormat('txt', '${type}')">
                            <i class="fas fa-file-alt"></i>
                            <span>Text</span>
                            <small>Human readable</small>
                        </button>
                        
                        <button class="export-btn" onclick="exportAsPDF('${type}')">
                            <i class="fas fa-file-pdf"></i>
                            <span>PDF</span>
                            <small>Print ready</small>
                        </button>
                    </div>
                    
                    <div class="export-info">
                        <small><i class="fas fa-info-circle"></i> All exports will be downloaded to your device</small>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add styles
        if (!document.getElementById('exportStyles')) {
            const style = document.createElement('style');
            style.id = 'exportStyles';
            style.textContent = `
                .export-options {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .export-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 1.5rem 1rem;
                    background: var(--bg-color);
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s;
                    color: var(--text-primary);
                }
                
                .export-btn:hover {
                    border-color: var(--primary-color);
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px var(--shadow-color);
                    background: rgba(255, 0, 0, 0.05);
                }
                
                .export-btn i {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                    color: var(--primary-color);
                }
                
                .export-btn span {
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin-bottom: 0.25rem;
                }
                
                .export-btn small {
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                }
                
                .export-info {
                    text-align: center;
                    padding: 1rem;
                    background: var(--bg-color);
                    border-radius: 8px;
                    color: var(--text-secondary);
                }
                
                .export-info i {
                    color: var(--primary-color);
                }
            `;
            document.head.appendChild(style);
        }
    };

    /**
     * Close export modal
     */
    window.closeExportModal = function() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    /**
     * Export as format
     */
    window.exportAsFormat = function(format, type) {
        // Get data based on type
        let data = [];
        
        switch (type) {
            case 'videos':
                // Get videos from DOM or global
                if (typeof window.videosData !== 'undefined') {
                    data = window.videosData;
                }
                break;
            case 'folders':
                if (typeof window.foldersData !== 'undefined') {
                    data = window.foldersData;
                }
                break;
            case 'notes':
                if (typeof window.notesManager !== 'undefined') {
                    data = window.notesManager.getAllNotes();
                }
                break;
        }

        if (data.length === 0) {
            window.showNotification('⚠️ No data to export');
            return;
        }

        switch (type) {
            case 'videos':
                window.exportManager.exportVideos(data, format);
                break;
            case 'folders':
                window.exportManager.exportFolders(data, format);
                break;
            case 'notes':
                window.exportManager.exportNotes(data, format);
                break;
        }

        window.closeExportModal();
    };

    /**
     * Export as PDF
     */
    window.exportAsPDF = function(type) {
        // Get data based on type
        let data = [];
        
        switch (type) {
            case 'videos':
                if (typeof window.videosData !== 'undefined') {
                    data = window.videosData;
                }
                break;
            case 'folders':
                if (typeof window.foldersData !== 'undefined') {
                    data = window.foldersData;
                }
                break;
            case 'notes':
                if (typeof window.notesManager !== 'undefined') {
                    data = window.notesManager.getAllNotes();
                }
                break;
        }

        if (data.length === 0) {
            window.showNotification('⚠️ No data to export');
            return;
        }

        window.exportManager.exportToPDF(data, type);
        window.closeExportModal();
    };

    /**
     * Export all data
     */
    window.exportAllData = async function() {
        const exportData = {
            exportDate: new Date().toISOString(),
            videos: [],
            folders: [],
            notes: []
        };

        // Collect all data
        if (typeof window.videosData !== 'undefined') {
            exportData.videos = window.videosData;
        }
        if (typeof window.foldersData !== 'undefined') {
            exportData.folders = window.foldersData;
        }
        if (typeof window.notesManager !== 'undefined') {
            exportData.notes = window.notesManager.getAllNotes();
        }

        // Download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `videohub-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.showNotification(`✅ Full backup exported: ${exportData.videos.length} videos, ${exportData.folders.length} folders, ${exportData.notes.length} notes`);
    };

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExport);
    } else {
        initExport();
    }

})();

