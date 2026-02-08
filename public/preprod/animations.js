// Laserel Demo - Animations & Navigation

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.querySelector('.progress-text');
  const progressRing = document.querySelector('.progress-ring-fill');
  const header = document.querySelector('.header');
  const sectionNav = document.getElementById('section-nav');
  const sectionNavScroll = document.getElementById('section-nav-scroll');
  const sections = document.querySelectorAll('section[id]');

  // Progress ring circumference (for the SVG circle)
  const ringCircumference = 100; // stroke-dasharray uses 0-100

  // Throttle helper
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Calculate scroll progress (0-100)
  function getScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(Math.round((scrollTop / docHeight) * 100), 100);
  }

  // Update progress indicators
  function updateProgress() {
    const progress = getScrollProgress();

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    // Update progress text
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }

    // Update progress ring
    if (progressRing) {
      progressRing.setAttribute('stroke-dasharray', `${progress}, 100`);
    }
  }

  // Update header state on scroll
  function updateHeader() {
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }

  // Get current section in viewport
  function getCurrentSection() {
    let current = 'hero';
    const scrollPosition = window.scrollY + 150;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    return current;
  }

  // Update section navigation
  function updateSectionNav() {
    if (!sectionNavScroll) return;

    const currentSection = getCurrentSection();
    const navItems = sectionNavScroll.querySelectorAll('.section-nav-item');

    navItems.forEach(item => {
      const href = item.getAttribute('href');
      const isActive = href === `#${currentSection}`;

      if (isActive && !item.classList.contains('active')) {
        // Remove active from all
        navItems.forEach(i => i.classList.remove('active'));
        // Add active to current
        item.classList.add('active');

        // Scroll the nav item into view (centered)
        const navScrollWidth = sectionNavScroll.scrollWidth;
        const navVisibleWidth = sectionNavScroll.clientWidth;
        const itemLeft = item.offsetLeft;
        const itemWidth = item.offsetWidth;

        const scrollTo = itemLeft - (navVisibleWidth / 2) + (itemWidth / 2);

        sectionNavScroll.scrollTo({
          left: Math.max(0, scrollTo),
          behavior: 'smooth'
        });
      }
    });
  }

  // Scroll reveal animation
  function handleScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .stagger-children');
    const triggerBottom = window.innerHeight * 0.88;

    reveals.forEach(el => {
      const elTop = el.getBoundingClientRect().top;
      if (elTop < triggerBottom) {
        el.classList.add('visible');
      }
    });
  }

  // Add reveal classes to sections
  function initRevealElements() {
    // Add reveal class to key elements
    const revealSelectors = [
      '.section-header',
      '.hero-card',
      '.hero-benefits',
      '.problem-item',
      '.highlight-box',
      '.comparison-card',
      '.solution-card',
      '.also-section',
      '.roi-simulation',
      '.roi-stats-banner',
      '.roi-breakeven',
      '.roadmap-month',
      '.method-step',
      '.stack-simple',
      '.stack-block',
      '.process-step',
      '.guarantee',
      '.cta-card'
    ];

    revealSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.classList.contains('reveal') && !el.closest('.stagger-children')) {
          el.classList.add('reveal');
        }
      });
    });

    // Add stagger to grids
    const staggerContainers = [
      '.solutions-grid',
      '.roi-stats-banner',
      '.roadmap',
      '.method-steps',
      '.stack-blocks',
      '.guarantees'
    ];

    staggerContainers.forEach(selector => {
      document.querySelectorAll(selector).forEach(container => {
        container.classList.add('stagger-children');
        // Remove reveal from children to avoid double animation
        container.querySelectorAll('.reveal').forEach(child => {
          child.classList.remove('reveal');
        });
      });
    });
  }

  // Smooth scroll for navigation links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();

          const headerHeight = 100; // Header + nav height
          const targetPosition = target.offsetTop - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Handle scroll events
  const handleScroll = throttle(() => {
    updateProgress();
    updateHeader();
    updateSectionNav();
    handleScrollReveal();
  }, 16);

  // Initialize
  function init() {
    // Initial state
    updateProgress();
    updateHeader();
    updateSectionNav();

    // Setup reveal animations
    initRevealElements();

    // Initial reveal check
    setTimeout(handleScrollReveal, 100);

    // Setup smooth scroll
    initSmoothScroll();

    // Listen to scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Handle resize
    window.addEventListener('resize', throttle(() => {
      updateSectionNav();
    }, 100));
  }

  init();
});
