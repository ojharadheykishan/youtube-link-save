document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const videoId = window.location.pathname.split('/').pop();
    const savedTime = localStorage.getItem(`video_${videoId}`);
    if (savedTime) {
        video.currentTime = parseFloat(savedTime);
    }
    video.addEventListener('timeupdate', () => {
        localStorage.setItem(`video_${videoId}`, video.currentTime);
    });
    // Auto-next can be added later by fetching next video
});