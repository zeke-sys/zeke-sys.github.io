// ─────────────────────────────────────────────
// Theme + Animations Script
// ─────────────────────────────────────────────

const body = document.body;
const YEAR_IDS = ['year', 'year-2', 'year-3'];

// ─── Year Setter ─────────────────────────────
(function setYears() {
    const year = new Date().getFullYear();
    YEAR_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = year;
    });
})();

// ─── Theme Handling ──────────────────────────
function applyTheme(theme) {
    body.classList.toggle('light', theme === 'light');
}

function getStoredTheme() {
    try { return localStorage.getItem('theme'); }
    catch { return null; }
}

function storeTheme(theme) {
    try { localStorage.setItem('theme', theme); }
    catch {}
}

function toggleTheme() {
    const current = getStoredTheme() || (body.classList.contains('light') ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    storeTheme(next);
}

// initialize theme
(function initTheme() {
    const stored = getStoredTheme();
    if (stored) {
        applyTheme(stored);
        return;
    }

    // fallback to system preference
    const systemPrefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    applyTheme(systemPrefersLight ? 'light' : 'dark');
})();

// ─── DOM Ready ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // theme toggle buttons
    document.querySelectorAll('#theme-toggle').forEach(btn =>
        btn.addEventListener('click', toggleTheme)
    );

    // scroll animations
    const animateEls = document.querySelectorAll('[data-animate]');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        animateEls.forEach(el => observer.observe(el));
    } else {
        animateEls.forEach(el => el.classList.add('in-view'));
    }

    // keyboard accessibility (Enter to click)
    document.querySelectorAll('.project-card, .btn').forEach(el => {
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter') el.click();
        });
    });
});