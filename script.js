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

function getStoredTheme() { // returns 'light', 'dark', or null
    try {
        return localStorage.getItem('theme');
    } catch(e) {
        return null;
    }
}

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

    // InsersectionObserver for scroll animations
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
});