document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const videoList = document.getElementById('video-list');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const cards = videoList.querySelectorAll('.video-card');
        cards.forEach(card => {
            const title = card.getAttribute('data-title').toLowerCase();
            const size = card.getAttribute('data-size');
            const duration = card.getAttribute('data-duration');
            if (title.includes(query) || size.includes(query) || duration.toString().includes(query)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
});