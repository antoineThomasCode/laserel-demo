// Laserel Demo - Premium Animations & Scroll Interactions

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const progressBar = document.getElementById('progress-bar');
  const progressRing = document.getElementById('progress-ring');
  const progressText = document.getElementById('progress-text');
  const sideNav = document.getElementById('side-nav');
  const header = document.querySelector('.header');
  const sections = document.querySelectorAll('section[id]');
  const revealElements = document.querySelectorAll('.reveal');

  // Progress ring setup
  const ringCircumference = 2 * Math.PI * 16; // radius = 16
  if (progressRing) {
    progressRing.style.strokeDasharray = ringCircumference;
    progressRing.style.strokeDashoffset = ringCircumference;
  }

  // Throttle function for performance
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

  // Calculate scroll progress
  function getScrollProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY;
    return Math.min(Math.round((scrollTop / scrollHeight) * 100), 100);
  }

  // Update progress indicators
  function updateProgress() {
    const progress = getScrollProgress();

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    // Update progress ring
    if (progressRing) {
      const offset = ringCircumference - (progress / 100) * ringCircumference;
      progressRing.style.strokeDashoffset = offset;
    }

    // Update progress text
    if (progressText) {
      progressText.textContent = `${progress}%`;
    }
  }

  // Update header scroll state
  function updateHeaderState() {
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }

  // Get current section in viewport
  function getCurrentSection() {
    let current = '';
    const scrollPosition = window.scrollY + window.innerHeight / 3;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    return current;
  }

  // Update side navigation active state
  function updateSideNav() {
    if (!sideNav) return;

    const currentSection = getCurrentSection();
    const navItems = sideNav.querySelectorAll('.side-nav-item');

    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === `#${currentSection}`) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Reveal elements on scroll
  function revealOnScroll() {
    const triggerBottom = window.innerHeight * 0.85;

    revealElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;

      if (elementTop < triggerBottom) {
        element.classList.add('revealed');
      }
    });
  }

  // Smooth scroll for navigation links
  function setupSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerHeight = header ? header.offsetHeight : 0;
          const targetPosition = target.offsetTop - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Parallax effect for hero section
  function setupParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', throttle(() => {
      const scrolled = window.scrollY;
      if (scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        hero.style.opacity = 1 - (scrolled / window.innerHeight) * 0.5;
      }
    }, 16));
  }

  // Stagger animation for cards
  function setupStaggerAnimations() {
    const cardGroups = [
      '.examples-grid .example-card',
      '.stack-cards .stack-card',
      '.reasons-grid .reason-card',
      '.guarantees .guarantee-card'
    ];

    cardGroups.forEach(selector => {
      const cards = document.querySelectorAll(selector);
      cards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
      });
    });
  }

  // Number counter animation
  function animateNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
          const target = entry.target;
          const finalValue = target.textContent;
          const numericValue = parseInt(finalValue.replace(/[^0-9]/g, ''));

          if (!isNaN(numericValue)) {
            target.classList.add('animated');
            animateValue(target, 0, numericValue, 1500, finalValue);
          }
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(num => observer.observe(num));
  }

  function animateValue(element, start, end, duration, originalText) {
    const startTime = performance.now();
    const suffix = originalText.replace(/[0-9]/g, '');

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeOut);

      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Cursor glow effect (desktop only)
  function setupCursorGlow() {
    if (window.innerWidth < 1024) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.style.cssText = `
      position: fixed;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translate(-50%, -50%);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(glow);

    document.addEventListener('mousemove', throttle((e) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, 16));
  }

  // Button ripple effect
  function setupRippleEffect() {
    const buttons = document.querySelectorAll('.cta-btn, .btn-primary');

    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();

        ripple.style.cssText = `
          position: absolute;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s linear;
          left: ${e.clientX - rect.left - 10}px;
          top: ${e.clientY - rect.top - 10}px;
        `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Add ripple animation to stylesheet
    if (!document.getElementById('ripple-style')) {
      const style = document.createElement('style');
      style.id = 'ripple-style';
      style.textContent = `
        @keyframes ripple {
          to {
            transform: scale(20);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Card tilt effect on hover (desktop)
  function setupCardTilt() {
    if (window.innerWidth < 1024) return;

    const cards = document.querySelectorAll('.example-card, .stack-card, .reason-card');

    cards.forEach(card => {
      card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      });

      card.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
      });
    });
  }

  // Initialize all animations
  function init() {
    // Initial updates
    updateProgress();
    updateHeaderState();
    updateSideNav();
    revealOnScroll();

    // Scroll event listeners
    window.addEventListener('scroll', throttle(() => {
      updateProgress();
      updateHeaderState();
      updateSideNav();
      revealOnScroll();
    }, 16));

    // Setup interactions
    setupSmoothScroll();
    setupParallax();
    setupStaggerAnimations();
    animateNumbers();
    setupCursorGlow();
    setupRippleEffect();
    setupCardTilt();

    // Initial reveal for elements already in view
    setTimeout(revealOnScroll, 100);
  }

  // Start
  init();
});
