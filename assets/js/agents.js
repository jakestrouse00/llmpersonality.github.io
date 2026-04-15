/**
 * LLMPersonality — Agent Explorer JavaScript
 * Handles card rendering, filtering, modal popups, and animated transitions.
 * Depends on: agents.json data, core.js (theme/scroll utilities)
 */

(function () {
  'use strict';

  /* ============================================================
     Agent Data Management
     ============================================================ */
  let agentsData = [];
  let activeFilter = 'all';

  async function loadAgents() {
    try {
      // Determine the base path for the JSON file
      const basePath = getBasePath();
      const response = await fetch(basePath + 'assets/data/agents.json');
      if (!response.ok) throw new Error('Failed to load agent data');
      agentsData = await response.json();
      return agentsData;
    } catch (err) {
      console.error('Error loading agents:', err);
      // Fallback: use embedded data if fetch fails
      agentsData = getEmbeddedAgents();
      return agentsData;
    }
  }

  function getBasePath() {
    // Handle both local file and served scenarios
    const path = window.location.pathname;
    const dir = path.substring(0, path.lastIndexOf('/'));
    return dir ? dir + '/' : './';
  }

  function getEmbeddedAgents() {
    return [
      {
        id: 'moderator',
        name: 'Moderator',
        role: 'Orchestrator & Process Owner',
        color: '#3b82f6',
        icon: '⚖️',
        traits: ['Decisive', 'Impartial', 'Process-Driven', 'Diplomatic', 'Summarizer'],
        description: 'The Moderator keeps the discussion on track, enforces phase boundaries, and ensures every voice is heard. They declare when the group moves from one phase to the next.',
        exampleResponse: 'We\'ve spent enough time exploring. The two viable paths are: (A) a static multi-page site with progressive enhancement, or (B) a single-page app with client-side routing. I\'m calling for a narrowing decision.',
        strengths: ['Phase management', 'Conflict resolution', 'Decision forcing', 'Summary synthesis'],
        catchphrase: 'Progress over perfection — what\'s our next concrete step?'
      },
      {
        id: 'pragmatist',
        name: 'Pragmatist',
        role: 'Execution Engine & Deliverable Owner',
        color: '#10b981',
        icon: '🔧',
        traits: ['Action-Oriented', 'Concrete', 'Risk-Aware', 'Efficient', 'Deliverable-Focused'],
        description: 'The Pragmatist turns promising ideas into realistic, low-friction plans. They draft, revise, and save concrete deliverables by default, preferring simple, robust approaches.',
        exampleResponse: 'I\'ve drafted the file structure and saved the initial CSS. Three pages, one shared stylesheet, vanilla JS modules. No build step, no framework — just files that work when you open them.',
        strengths: ['Rapid prototyping', 'Scope management', 'Technical feasibility', 'Artifact production'],
        catchphrase: 'Ship the simplest thing that demonstrates value.'
      },
      {
        id: 'creative',
        name: 'Creative',
        role: 'Idea Generator & Perspective Shifter',
        color: '#8b5cf6',
        icon: '✨',
        traits: ['Imaginative', 'Unconventional', 'Synthesizing', 'Optimistic', 'Analogical'],
        description: 'The Creative agent generates novel ideas, unexpected connections, and alternative framings. They are the team\'s primary source of divergent thinking.',
        exampleResponse: 'What if the Agent Explorer wasn\'t a grid of cards at all, but a constellation map where each agent is a star, and the lines between them show their collaboration patterns?',
        strengths: ['Divergent ideation', 'Metaphorical thinking', 'Cross-domain synthesis', 'Reframing problems'],
        catchphrase: 'The best solution might be the one nobody\'s imagined yet.'
      },
      {
        id: 'cynical',
        name: 'Cynical',
        role: 'Risk Analyst & Assumption Challenger',
        color: '#f43f5e',
        icon: '🛡️',
        traits: ['Skeptical', 'Thorough', 'Conservative', 'Detail-Oriented', 'Stress-Tester'],
        description: 'The Cynical agent identifies risks, challenges assumptions, and stress-tests proposals before they reach production. Their skepticism is constructive.',
        exampleResponse: 'The constellation map idea is visually compelling, but it fails on three counts: (1) it requires a canvas renderer, adding 50+ KB; (2) it\'s inaccessible to screen readers; (3) on mobile, spatial relationships become unreadable.',
        strengths: ['Risk identification', 'Assumption testing', 'Edge-case analysis', 'Performance scrutiny'],
        catchphrase: 'What could go wrong, and how do we know it won\'t?'
      },
      {
        id: 'librarian',
        name: 'Librarian',
        role: 'Context Provider & Research Anchor',
        color: '#f59e0b',
        icon: '📚',
        traits: ['Research-Driven', 'Citation-Focused', 'Thorough', 'Pattern-Aware', 'Historical'],
        description: 'The Librarian provides context, references, and structured knowledge to ground the discussion, ensuring decisions are informed by what has already been proven.',
        exampleResponse: 'The debate mirrors the progressive enhancement vs. graceful degradation conversation from 2015–2018. The W3C recommends full page reloads for primary navigation to preserve native accessibility behaviors.',
        strengths: ['Prior-art research', 'Evidence-based argumentation', 'Pattern recognition', 'Documentation synthesis'],
        catchphrase: 'Before we decide, let\'s check what\'s already been proven.'
      },
      {
        id: 'provocateur',
        name: 'Provocateur',
        role: 'Contrarian Catalyst & Assumption Breaker',
        color: '#f97316',
        icon: '🔥',
        traits: ['Contrarian', 'Disruptive', 'Insightful', 'Uncomfortable', 'Reframing'],
        description: 'The Provocateur challenges groupthink, surfaces hidden assumptions, and proposes radical alternatives that the team would not generate on its own.',
        exampleResponse: 'Everyone\'s debating static vs. dynamic rendering, but has anyone questioned whether we need a website at all? The framework\'s value proposition is multi-agent discussion — what if the demo IS the discussion?',
        strengths: ['Assumption surfacing', 'Radical reframing', 'Groupthink prevention', 'Uncomfortable questions'],
        catchphrase: 'The most dangerous assumption is the one you didn\'t know you were making.'
      }
    ];
  }

  /* ============================================================
     Card Rendering
     ============================================================ */
  function createAgentCard(agent, index) {
    const card = document.createElement('article');
    card.className = 'agent-card agent-card--animate-in';
    card.style.setProperty('--agent-color', agent.color);
    card.style.animationDelay = (index * 80) + 'ms';
    card.setAttribute('data-agent-id', agent.id);
    card.setAttribute('data-traits', agent.traits.join(',').toLowerCase());
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'View details for ' + agent.name);

    card.innerHTML = `
      <div class="agent-card__header">
        <div class="agent-card__icon">${agent.icon}</div>
        <div class="agent-card__info">
          <h3 class="agent-card__name">${agent.name}</h3>
          <p class="agent-card__role">${agent.role}</p>
        </div>
      </div>
      <div class="agent-card__traits">
        ${agent.traits.slice(0, 3).map(t => `<span class="agent-trait">${t}</span>`).join('')}
      </div>
      <p class="agent-card__preview">${agent.description}</p>
      <div class="agent-card__cta">
        Explore profile <span aria-hidden="true">→</span>
      </div>
    `;

    // Click handler
    card.addEventListener('click', function () {
      openModal(agent);
    });

    // Keyboard handler
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(agent);
      }
    });

    return card;
  }

  function renderAgents(agents) {
    const grid = document.getElementById('agent-grid');
    if (!grid) return;

    grid.innerHTML = '';
    agents.forEach(function (agent, index) {
      grid.appendChild(createAgentCard(agent, index));
    });
  }

  /* ============================================================
     Filtering
     ============================================================ */
  function initFilters() {
    const filterContainer = document.querySelector('.agent-filters');
    if (!filterContainer) return;

    // Define filter categories
    const filters = [
      { key: 'all', label: 'All Agents' },
      { key: 'process-driven', label: 'Process-Driven' },
      { key: 'action-oriented', label: 'Action-Oriented' },
      { key: 'imaginative', label: 'Imaginative' },
      { key: 'skeptical', label: 'Skeptical' },
      { key: 'research-driven', label: 'Research-Driven' },
      { key: 'contrarian', label: 'Contrarian' }
    ];

    filters.forEach(function (filter) {
      const btn = document.createElement('button');
      btn.className = 'agent-filter-btn' + (filter.key === 'all' ? ' agent-filter-btn--active' : '');
      btn.textContent = filter.label;
      btn.setAttribute('data-filter', filter.key);
      btn.addEventListener('click', function () {
        applyFilter(filter.key);
        // Update active state
        filterContainer.querySelectorAll('.agent-filter-btn').forEach(function (b) {
          b.classList.remove('agent-filter-btn--active');
        });
        btn.classList.add('agent-filter-btn--active');
      });
      filterContainer.appendChild(btn);
    });
  }

  function applyFilter(filterKey) {
    activeFilter = filterKey;
    const cards = document.querySelectorAll('.agent-card');

    cards.forEach(function (card) {
      const traits = card.getAttribute('data-traits') || '';
      const shouldShow = filterKey === 'all' || traits.includes(filterKey);

      if (shouldShow) {
        card.classList.remove('agent-card--hidden');
        // Re-trigger animation
        card.classList.remove('agent-card--animate-in');
        // Force reflow
        void card.offsetWidth;
        card.classList.add('agent-card--animate-in');
      } else {
        card.classList.add('agent-card--hidden');
      }
    });
  }

  /* ============================================================
     Modal Management
     ============================================================ */
  let currentModal = null;

  function createModalHTML(agent) {
    return `
      <div class="modal-overlay" id="agent-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-agent-name">
        <div class="modal">
          <div class="modal__header">
            <div class="modal__agent-info">
              <div class="modal__agent-icon">${agent.icon}</div>
              <div>
                <h2 class="modal__agent-name" id="modal-agent-name">${agent.name}</h2>
                <p class="modal__agent-role">${agent.role}</p>
              </div>
            </div>
            <button class="modal__close" aria-label="Close modal" id="modal-close-btn">✕</button>
          </div>
          <div class="modal__body">
            <div class="modal__section">
              <h3 class="modal__section-title">About</h3>
              <p class="modal__description">${agent.description}</p>
            </div>
            <div class="modal__section">
              <h3 class="modal__section-title">Personality Traits</h3>
              <div class="modal__traits">
                ${agent.traits.map(t => `<span class="modal__trait">${t}</span>`).join('')}
              </div>
            </div>
            <div class="modal__section">
              <h3 class="modal__section-title">Example Response</h3>
              <blockquote class="modal__quote">${agent.exampleResponse}</blockquote>
            </div>
            <div class="modal__section">
              <h3 class="modal__section-title">Core Strengths</h3>
              <div class="modal__strengths">
                ${agent.strengths.map(s => `<div class="modal__strength">${s}</div>`).join('')}
              </div>
            </div>
            <div class="modal__section">
              <h3 class="modal__section-title">Catchphrase</h3>
              <div class="modal__catchphrase">"${agent.catchphrase}"</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openModal(agent) {
    // Remove any existing modal
    closeModal();

    // Create and insert modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = createModalHTML(agent);
    document.body.appendChild(modalContainer.firstElementChild);

    currentModal = document.getElementById('agent-modal-overlay');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(function () {
      currentModal.classList.add('modal-overlay--active');
    });

    // Bind close events
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    currentModal.addEventListener('click', function (e) {
      if (e.target === currentModal) closeModal();
    });

    // Focus trap
    document.getElementById('modal-close-btn').focus();

    // Keyboard close
    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeModal() {
    if (!currentModal) return;

    currentModal.classList.remove('modal-overlay--active');

    setTimeout(function () {
      if (currentModal && currentModal.parentNode) {
        currentModal.parentNode.removeChild(currentModal);
      }
      currentModal = null;
      document.body.style.overflow = '';
    }, 250);

    document.removeEventListener('keydown', handleModalKeydown);
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  /* ============================================================
     Search / Text Filter
     ============================================================ */
  function initSearch() {
    const searchInput = document.getElementById('agent-search');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        const query = searchInput.value.toLowerCase().trim();
        filterBySearch(query);
      }, 200);
    });
  }

  function filterBySearch(query) {
    const cards = document.querySelectorAll('.agent-card');

    if (!query) {
      cards.forEach(function (card) {
        card.classList.remove('agent-card--hidden');
      });
      return;
    }

    cards.forEach(function (card) {
      const name = card.querySelector('.agent-card__name').textContent.toLowerCase();
      const role = card.querySelector('.agent-card__role').textContent.toLowerCase();
      const traits = card.getAttribute('data-traits') || '';
      const preview = card.querySelector('.agent-card__preview').textContent.toLowerCase();
      const matches = name.includes(query) || role.includes(query) || traits.includes(query) || preview.includes(query);

      if (matches) {
        card.classList.remove('agent-card--hidden');
      } else {
        card.classList.add('agent-card--hidden');
      }
    });
  }

  /* ============================================================
     Initialization
     ============================================================ */
  async function init() {
    await loadAgents();
    renderAgents(agentsData);
    initFilters();
    initSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();