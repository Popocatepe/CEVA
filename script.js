/* ═══════════════════════════
   SOARE TOURING SRL – JS
   ═══════════════════════════ */

(function () {
  'use strict';

  /* ── Sticky header ── */
  const header = document.getElementById('header');
  function updateHeader() {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  /* ── Mobile nav ── */
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    nav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when a link is clicked
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ── Back to top ── */
  const backTop = document.getElementById('backTop');
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ── Smooth active nav highlight ── */
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks = document.querySelectorAll('#nav a[href^="#"]');

  function onScroll() {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 120) current = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Intersection observer animations ── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(
    '.card, .advantage, .contact-item, .stat, .about-content, .about-visual'
  ).forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });

  /* Add animation CSS dynamically */
  const animStyle = document.createElement('style');
  animStyle.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    .animate-on-scroll.visible {
      opacity: 1;
      transform: translateY(0);
    }
    #nav a.active {
      color: var(--amber) !important;
    }
  `;
  document.head.appendChild(animStyle);

  /* ── Contact form ── */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Basic validation
      const name    = form.querySelector('#name');
      const phone   = form.querySelector('#phone');
      const message = form.querySelector('#message');
      let valid = true;

      [name, phone, message].forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = '#EF4444';
          field.addEventListener('input', () => {
            field.style.borderColor = '';
          }, { once: true });
          valid = false;
        }
      });

      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = `
        <svg style="animation:spin .7s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity=".25"/>
          <path d="M12 2a10 10 0 0110 10" stroke-linecap="round"/>
        </svg>
        Se trimite...
      `;

      // Simulate send (replace with real backend/EmailJS/Formspree)
      setTimeout(() => {
        btn.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          Mesaj trimis cu succes!
        `;
        btn.style.background = '#10B981';
        btn.style.borderColor = '#10B981';
        form.reset();

        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = original;
          btn.style.background = '';
          btn.style.borderColor = '';
        }, 4000);
      }, 1500);
    });
  }

  const spinKeyframe = document.createElement('style');
  spinKeyframe.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(spinKeyframe);

})();
