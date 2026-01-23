// animations.js - Smooth interactions and effects for YouTube Link Save app

document.addEventListener('DOMContentLoaded', function() {
    // Staggered fade-ins for video grid items on page load
    const videoItems = document.querySelectorAll('.video-item');
    videoItems.forEach((item, index) => {
        // Assume CSS sets initial opacity: 0 and transform: translateY(20px)
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, index * 100); // Stagger by 100ms
    });

    // Enhanced hover effects with JavaScript (tooltip animations)
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        const trigger = tooltip.previousElementSibling; // Assuming tooltip follows trigger
        if (trigger) {
            trigger.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
                tooltip.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], {
                    duration: 300,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
            });
            trigger.addEventListener('mouseleave', () => {
                const anim = tooltip.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(10px)' }], {
                    duration: 300,
                    easing: 'ease-in',
                    fill: 'forwards'
                });
                anim.addEventListener('finish', () => {
                    tooltip.style.display = 'none';
                });
            });
        }
    });

    // Form submission feedback animations (success/error messages)
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent actual submission for demo; adjust as needed
            const feedback = form.querySelector('.feedback');
            if (feedback) {
                // Simulate success; in real app, check response
                feedback.textContent = 'Submission successful!';
                feedback.classList.remove('error');
                feedback.classList.add('success');
                feedback.style.display = 'block';
                feedback.animate([{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'scale(1)' }], {
                    duration: 500,
                    easing: 'ease-out',
                    fill: 'forwards'
                });
                // Hide after 3 seconds
                setTimeout(() => {
                    feedback.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.8)' }], {
                        duration: 500,
                        easing: 'ease-in',
                        fill: 'forwards'
                    }).addEventListener('finish', () => {
                        feedback.style.display = 'none';
                    });
                }, 3000);
            }
        });
    });

    // Smooth scrolling to sections
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Animated counters (if applicable, e.g., for stats)
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'), 10);
        if (target) {
            let count = 0;
            const increment = target / 100; // Adjust speed
            const timer = setInterval(() => {
                count += increment;
                if (count >= target) {
                    count = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(count);
            }, 30); // ~30fps
        }
    });

    // Progress bars (if applicable)
    const progressBars = document.querySelectorAll('.progress-bar');
    progressBars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width') || '100%';
        bar.style.width = '0%';
        bar.animate([{ width: '0%' }, { width: targetWidth }], {
            duration: 1000,
            easing: 'ease-out',
            fill: 'forwards'
        });
    });

    // Real-time search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const videoCards = document.querySelectorAll('.video-card');
            videoCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const folder = card.getAttribute('data-folder').toLowerCase();
                const matches = title.includes(query) || folder.includes(query);
                if (matches) {
                    card.style.display = 'block';
                    card.animate([{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'scale(1)' }], {
                        duration: 300,
                        easing: 'ease-out',
                        fill: 'forwards'
                    });
                } else {
                    card.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.9)' }], {
                        duration: 300,
                        easing: 'ease-in',
                        fill: 'forwards'
                    }).addEventListener('finish', () => {
                        card.style.display = 'none';
                    });
                }
            });
        });
    }
});

// Performance optimization: Use requestAnimationFrame for any heavy animations if needed
// This code uses native Web Animations API for better performance over jQuery/CSS-only approaches