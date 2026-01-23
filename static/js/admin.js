function syncVideos() {
    fetch('/admin/sync', { method: 'POST' })
        .then(response => response.json())
        .then(data => alert(data.message))
        .catch(err => console.error('Sync failed', err));
}