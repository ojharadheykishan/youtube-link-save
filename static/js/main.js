// Main JavaScript for Video Library

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            fetch('/add_video', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert('Video processing started! It will appear in the folder once downloaded.');
                form.reset();
            })
            .catch(error => {
                alert('Error adding video: ' + error.message);
            });
        });
    }
});