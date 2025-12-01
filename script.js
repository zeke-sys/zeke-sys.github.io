// theme + animations script

// --- Theme toggle with localStorage persistence ---
const body = document.body;
const themeToggleButtons = document.querySelectorAll('#theme-toggle');
const YEAR_IDS = ['year', 'year-2', 'year-3'];

// set initial year(s)
function setYears(){
    const y = new Date().getFullYear();
    YEAR_IDS.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = y;
    });
}

setYears();

// load saved theme from localStorage
function applyTheme(theme) { // 'light' or 'dark'
    if(theme === 'light') {
        body.classList.add('light');
    } else {
        body.classList.remove('light'); // default to dark
    }
}

// retrieve stored theme preference
function getStoredTheme() { // returns 'light', 'dark', or null
    try {
        return localStorage.getItem('theme');
    } catch(e) {
        return null;
    }
}

// store theme preference
function storeTheme(theme) {
    try { localStorage.setItem('theme', theme); } catch(e) {}
}

// toggle theme and update localStorage
function toggleTheme() {
    const current = getStoredTheme() || (body.classList.contains('light') ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    storeTheme(next);
}

// initialize theme from storage or system preference
(function initTheme(){
    const stored = getStoredTheme();
    if(stored) {
        applyTheme(stored);
    } else {
        // default to system preference
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        applyTheme(prefersLight ? 'light' : 'dark');
    }
})();

// attach event listeners to all theme toggle buttons (header present on multiple pages)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#theme-toggle').forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    // Dynamic daily greeting
    const greetingEl = document.getElementById("daily-greeting");
    if(greetingEl) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = new Date();
        greetingEl.textContent = `Happy ${days[today.getDay()]}!`;
    }

    // IntersectionObserver for scroll animations
    const animateEls = document.querySelectorAll('[data-animate]');
    if('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12});
        animateEls.forEach(el => io.observe(el));
    } else {
        // fallback: just add all
        animateEls.forEach(el => el.classList.add('in-view'));
    }

    // small: add hover focus styles for keyboard users
    document.querySelectorAll('.project-card, .btn').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') el.click();
        });
    });

    // lightbox functionality for project images
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.querySelector('.lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');

    // open lightbox on image click
    document.querySelectorAll('.personal-photos img').forEach(img => {
        img.addEventListener('click', () => {
            lightbox.style.display = 'flex';
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
        });
    });

    // close button
    closeBtn.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });

    // click outside image closes
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.style.display = 'none';
    });
    
});

// end of theme + animations script