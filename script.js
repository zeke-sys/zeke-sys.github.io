// theme + animations script

// --- Theme toggle with localStorage persistence ---
const body = document.body;
const themeToggleButtons = document.querySelectorAll('#theme-toggle');
const YEAR_IDS = ['year', 'year-2', 'year-3', 'year-writing', 'year-contact'];

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

    // lightbox functionality for personal photos (only when present)
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.querySelector('.lightbox-img');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-nav.prev');
    const nextBtn = document.querySelector('.lightbox-nav.next');

    if (lightbox && lightboxImg && closeBtn) {
        const photos = Array.from(document.querySelectorAll('.personal-photos img'));
        let currentIndex = 0;
        let isOpen = false;

        function openLightboxAt(index) {
            if (!photos.length) return;
            currentIndex = (index + photos.length) % photos.length;
            const img = photos[currentIndex];
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.style.display = 'flex';
            isOpen = true;
        }

        function closeLightbox() {
            lightbox.style.display = 'none';
            isOpen = false;
        }

        function showOffset(delta) {
            if (!photos.length) return;
            openLightboxAt(currentIndex + delta);
        }

        // open lightbox on image click
        photos.forEach((img, index) => {
            img.addEventListener('click', () => {
                openLightboxAt(index);
            });
        });

        // navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showOffset(-1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showOffset(1);
            });
        }

        // close button
        closeBtn.addEventListener('click', () => {
            closeLightbox();
        });

        // click outside image closes
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        // keyboard navigation when lightbox is open
        document.addEventListener('keydown', (e) => {
            if (!isOpen) return;
            if (e.key === 'ArrowRight') {
                showOffset(1);
            } else if (e.key === 'ArrowLeft') {
                showOffset(-1);
            } else if (e.key === 'Escape') {
                closeLightbox();
            }
        });
    }
    
});

// highlight active nav link
const current = window.location.pathname.split("/").pop();
const page = current === "" ? "index.html" : current;

document.querySelectorAll(".nav-links a").forEach(a => {
    if (a.getAttribute("href") === page) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
    }
});

// menu button on mobile
const menuBtn = document.getElementById("mobile-menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("open");
        menuBtn.textContent = isOpen ? "✕" : "☰";  // icon changes
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!navLinks.contains(e.target) && e.target !== menuBtn) {
            navLinks.classList.remove("open");
            menuBtn.textContent = "☰"; // reset icon
        }
    });
}

// Tracking Resume Button Click
document.querySelectorAll('a[href="zeke-resume.pdf"]').forEach(btn => {
    btn.addEventListener("click", () => {
        gtag('event', 'resume_click', {
            event_category: 'engagement',
            event_label: 'Resume PDF'
        });
    });
});

// Tracking GitHub Repo Clicks
document.querySelectorAll('a[href*="github.com"]').forEach(link => {
    link.addEventListener("click", () => {
        gtag('event', 'github_repo_click', {
            event_category: 'engagement',
            event_label: link.href
        });
    });
});

// end of theme + animations script