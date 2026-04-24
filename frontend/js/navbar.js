document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        const navOverlay = document.createElement('div');
        navOverlay.className = 'nav-overlay';
        document.body.appendChild(navOverlay);

        const closeMenu = () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            navOverlay.classList.remove('active');
            document.body.classList.remove('nav-open');
        };

        const openMenu = () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            navOverlay.classList.toggle('active');
            document.body.classList.toggle('nav-open');
        };

        hamburger.addEventListener('click', openMenu);
        navOverlay.addEventListener('click', closeMenu);

        // Close menu when a link is clicked
        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            closeMenu();
        }));

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }
});
