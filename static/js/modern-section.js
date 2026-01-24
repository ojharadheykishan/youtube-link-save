// Modern Section Animations and Interactions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modern section
    initModernSection();

    // Check for login and show welcome popup
    checkLoginStatus();
});

function initModernSection() {
    // Add fade-in animation to the section
    const modernSection = document.querySelector('.modern-section');
    if (modernSection) {
        modernSection.classList.add('fade-in');
    }

    // Add click interaction to AI character
    const aiCharacter = document.querySelector('.ai-character');
    if (aiCharacter) {
        aiCharacter.addEventListener('click', showWelcomePopup);
    }
}

function checkLoginStatus() {
    // Check if user is logged in (has auth_token cookie)
    const authToken = getCookie('auth_token');

    if (authToken) {
        // User is logged in, show welcome popup after a short delay
        setTimeout(() => {
            showWelcomePopup();
        }, 2000);
    }
}

function showWelcomePopup() {
    const popup = document.querySelector('.welcome-popup');
    if (!popup) return;

    // Remove existing show class
    popup.classList.remove('show');

    // Force reflow
    popup.offsetHeight;

    // Add show class
    popup.classList.add('show');

    // Play sound if available (optional)
    playWelcomeSound();

    // Auto hide after 8 seconds
    setTimeout(() => {
        hideWelcomePopup();
    }, 8000);

    // Hide on click outside
    document.addEventListener('click', function hideOnClickOutside(e) {
        if (!popup.contains(e.target) && !document.querySelector('.ai-character').contains(e.target)) {
            hideWelcomePopup();
            document.removeEventListener('click', hideOnClickOutside);
        }
    });
}

function hideWelcomePopup() {
    const popup = document.querySelector('.welcome-popup');
    if (popup) {
        popup.classList.remove('show');
    }
}

function playWelcomeSound() {
    // Optional: Add subtle welcome sound
    // For now, we'll skip this as it requires audio files
    // You can add: new Audio('/static/sounds/welcome.mp3').play();
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Enhanced slider animations
function enhanceSlider() {
    const sliderTrack = document.querySelector('.slider-track');
    if (!sliderTrack) return;

    // Pause animation on hover
    sliderTrack.addEventListener('mouseenter', () => {
        sliderTrack.style.animationPlayState = 'paused';
    });

    sliderTrack.addEventListener('mouseleave', () => {
        sliderTrack.style.animationPlayState = 'running';
    });
}

// Initialize slider enhancements
document.addEventListener('DOMContentLoaded', enhanceSlider);

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add mouse follow effect to background
    document.addEventListener('mousemove', function(e) {
        const modernSection = document.querySelector('.modern-section');
        if (!modernSection) return;

        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        modernSection.style.setProperty('--mouse-x', x);
        modernSection.style.setProperty('--mouse-y', y);
    });
});