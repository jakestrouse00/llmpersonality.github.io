/**
 * LLMPersonality — Loop Page JavaScript
 * Scroll-triggered phase animations and interactive loop diagram.
 * Progressive enhancement: uses IntersectionObserver with CSS fallback.
 */

(function () {
  'use strict';

  /* ============================================================
     Phase Data
     ============================================================ */
  var phases = [
    {
      number: 1,
      key: 'clarify',
      title: 'Clarify',
      description: 'The group establishes shared understanding of the problem, constraints, and desired outcomes. The Moderator ensures all ambiguities are surfaced before moving forward. No solution is proposed — only questions and context.',
      agents: [
        { icon: '⚖️', name: 'Moderator', role: 'Frames the discussion' },
        { icon: '📚', name: 'Librarian', role: 'Provides background context' },
        { icon: '🛡️', name: 'Cynical', role: 'Surfaces hidden constraints' }
      ]
    },
    {
      number: 2,
      key: 'explore',
      title: 'Explore',
      description: 'The group generates a wide range of ideas, approaches, and perspectives. Divergent thinking is encouraged — no idea is too unconventional. The goal is breadth, not consensus.',
      agents: [
        { icon: '✨', name: 'Creative', role: 'Generates novel ideas' },
        { icon: '📚', name: 'Librarian', role: 'References prior art' },
        { icon: '🔥', name: 'Provocateur', role: 'Challenges assumptions' }
      ]
    },
    {
      number: 3,
      key: 'narrow',
      title: 'Narrow',
      description: 'The group converges on the most promising approach. Options are evaluated against constraints, risks, and feasibility. The Cynical agent stress-tests proposals while the Pragmatist grounds them in implementation reality.',
      agents: [
        { icon: '🛡️', name: 'Cynical', role: 'Stress-tests proposals' },
        { icon: '🔧', name: 'Pragmatist', role: 'Assesses feasibility' },
        { icon: '⚖️', name: 'Moderator', role: 'Forces decisions' }
      ]
    },
    {
      number: 4,
      key: 'execute',
      title: 'Execute',
      description: 'The Pragmatist produces the concrete deliverable — code, documentation, or a decision artifact. The group reviews for completeness and correctness. The Moderator calls for sign-off when the deliverable meets the bar.',
      agents: [
        { icon: '🔧', name: 'Pragmatist', role: 'Produces the deliverable' },
        { icon: '✨', name: 'Creative', role: 'Polishes presentation' },
        { icon: '⚖️', name: 'Moderator', role: 'Declares completion' }
      ]
    }
  ];

  /* ============================================================
     Render Loop Phases
     ============================================================ */
  function renderPhases() {
    var container = document.getElementById('loop-phases-container');
    if (!container) return;

    phases.forEach(function (phase, index) {
      var phaseEl = document.createElement('div');
      phaseEl.className = 'loop-phase fade-in';
      phaseEl.style.transitionDelay = (index * 100) + 'ms';

      var isLast = index === phases.length - 1;

      phaseEl.innerHTML = `
        <div class="loop-phase__connector">
          <div class="loop-phase__step">${phase.number}</div>
          ${!isLast ? '<div class="loop-phase__line"></div>' : ''}
        </div>
        <div class="loop-phase__content">
          <span class="loop-phase__label">Phase ${phase.number}</span>
          <h3 class="loop-phase__title">${phase.title}</h3>
          <p class="loop-phase__desc">${phase.description}</p>
          <div class="loop-phase__agents">
            ${phase.agents.map(function (a) {
              return `<span class="loop-phase__agent-tag">${a.icon} ${a.name} — ${a.role}</span>`;
            }).join('')}
          </div>
        </div>
      `;

      container.appendChild(phaseEl);
    });
  }

  /* ============================================================
     Render Loop Diagram (Interactive Circular Visual)
     ============================================================ */
  function renderDiagram() {
    var container = document.getElementById('loop-diagram-container');
    if (!container) return;

    var diagramEl = document.createElement('div');
    diagramEl.className = 'loop-diagram scale-in';

    phases.forEach(function (phase, index) {
      var stepEl = document.createElement('a');
      stepEl.className = 'loop-diagram__step';
      stepEl.href = '#phase-' + phase.key;
      stepEl.textContent = phase.title;
      stepEl.setAttribute('title', 'Phase ' + phase.number + ': ' + phase.title);
      diagramEl.appendChild(stepEl);

      if (index < phases.length - 1) {
        var arrow = document.createElement('span');
        arrow.className = 'loop-diagram__arrow';
        arrow.textContent = '→';
        diagramEl.appendChild(arrow);
      }
    });

    container.appendChild(diagramEl);
  }

  /* ============================================================
     Interactive Phase Highlighting
     ============================================================ */
  function initPhaseInteraction() {
    // Add IDs to phase elements for anchor linking
    var phaseElements = document.querySelectorAll('.loop-phase');
    phaseElements.forEach(function (el, index) {
      var contentEl = el.querySelector('.loop-phase__content');
      if (contentEl) {
        contentEl.id = 'phase-' + phases[index].key;
      }
    });

    // Diagram step hover highlights corresponding phase
    var diagramSteps = document.querySelectorAll('.loop-diagram__step');
    diagramSteps.forEach(function (step, index) {
      step.addEventListener('mouseenter', function () {
        var targetPhase = document.querySelectorAll('.loop-phase')[index];
        if (targetPhase) {
          var content = targetPhase.querySelector('.loop-phase__content');
          if (content) {
            content.style.borderColor = 'var(--color-accent)';
            content.style.boxShadow = 'var(--shadow-md)';
          }
        }
      });

      step.addEventListener('mouseleave', function () {
        var targetPhase = document.querySelectorAll('.loop-phase')[index];
        if (targetPhase) {
          var content = targetPhase.querySelector('.loop-phase__content');
          if (content) {
            content.style.borderColor = '';
            content.style.boxShadow = '';
          }
        }
      });
    });
  }

  /* ============================================================
     Animated Counter (Fun Stats Section)
     ============================================================ */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });

      counters.forEach(function (counter) {
        observer.observe(counter);
      });
    } else {
      counters.forEach(animateCounter);
    }
  }

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1500;
    var start = 0;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  /* ============================================================
     Initialization
     ============================================================ */
  function init() {
    renderPhases();
    renderDiagram();
    initPhaseInteraction();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();