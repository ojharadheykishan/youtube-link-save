// Smooth scrolling animations
document.addEventListener('DOMContentLoaded', function() {
    // Observe elements for animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe video cards
    document.querySelectorAll('.video-card').forEach(card => {
        observer.observe(card);
    });

    document.querySelectorAll('.folder-card').forEach(card => {
        observer.observe(card);
    });
});

// Add ripple effect to buttons
document.querySelectorAll('button, a.btn-primary, a.btn-secondary').forEach(button => {
    button.addEventListener('mouseenter', function() {
        const ripple = document.createElement('span');
        ripple.style.animation = 'ripple 0.6s ease-out';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
    }
});

// Add loading animation for form submission
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function() {
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.style.opacity = '0.7';
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
        }
    });
});

// Animate numbers (view counts)
function animateCounter(element, target, duration = 800) {
    let start = 0;
    const increment = target / (duration / 16);

    const counter = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Add animation classes for staggered loading
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.video-card, .folder-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.05}s`;
    });
});
