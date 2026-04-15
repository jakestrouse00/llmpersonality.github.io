/**
 * agents-ui.js - Agent Explorer UI logic
 * Handles filtering, card rendering, expandable panels, and modal wiring.
 */

import { AGENTS, CATEGORIES } from './agents-data.js';
import { openModal, closeModal } from './modal.js';
import { refresh as refreshScrollAnim } from './scroll-anim.js';

let currentFilter = 'all';

/**
 * Initialize the Agent Explorer
 */
export function init() {
  renderFilterButtons();
  renderAgentCards();
  setupEventListeners();
}

/**
 * Render filter buttons based on categories
 */
function renderFilterButtons() {
  const filterGroup = document.querySelector('.filter-group');
  if (!filterGroup) return;

  const buttons = filterGroup.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      setFilter(filter);
    });
  });
}

/**
 * Set active filter and re-render cards
 */
function setFilter(filter) {
  currentFilter = filter;
  
  // Update button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
  });
  
  renderAgentCards();
}

/**
 * Render agent cards based on current filter
 */
function renderAgentCards() {
  const grid = document.getElementById('agents-grid');
  if (!grid) return;

  const filteredAgents = currentFilter === 'all'
    ? AGENTS
    : AGENTS.filter(agent => agent.category === currentFilter);

  grid.innerHTML = filteredAgents.map(agent => `
    <article class="agent-card reveal" data-agent-id="${agent.id}">
      <div class="agent-card-header" style="border-color: ${agent.color}">
        <h3 class="agent-name">${agent.name}</h3>
        <span class="agent-role">${agent.role}</span>
      </div>
      <div class="agent-card-body">
        <div class="agent-traits">
          ${agent.traits.map(trait => `<span class="trait-tag">${trait}</span>`).join('')}
        </div>
        <p class="agent-bio-preview">${agent.bio.substring(0, 120)}...</p>
      </div>
      <div class="agent-card-footer">
        <button class="btn btn-expand" data-agent-id="${agent.id}" aria-expanded="false">
          Learn More
        </button>
        <button class="btn btn-primary btn-modal" data-agent-id="${agent.id}">
          Deep Dive
        </button>
      </div>
    </article>
  `).join('');

  // Re-initialize scroll animations for new cards
  refreshScrollAnim();

  // Bind card events
  setupCardEventListeners();
}

/**
 * Set up event listeners for agent cards
 */
function setupCardEventListeners() {
  // Expand button
  document.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const agentId = btn.getAttribute('data-agent-id');
      toggleAgentExpand(agentId, btn);
    });
  });

  // Modal button
  document.querySelectorAll('.btn-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const agentId = btn.getAttribute('data-agent-id');
      openAgentModal(agentId);
    });
  });
}

/**
 * Toggle expanded state for an agent card
 */
function toggleAgentExpand(agentId, btn) {
  const card = document.querySelector(`[data-agent-id="${agentId}"].agent-card`);
  if (!card) return;

  const isExpanded = btn.getAttribute('aria-expanded') === 'true';
  
  if (isExpanded) {
    // Collapse
    card.classList.remove('expanded');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Learn More';
  } else {
    // Expand
    const agent = AGENTS.find(a => a.id === agentId);
    if (agent) {
      card.classList.add('expanded');
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = 'Show Less';
      
      // Add full bio if not already present
      let bioFull = card.querySelector('.agent-bio-full');
      if (!bioFull) {
        bioFull = document.createElement('div');
        bioFull.className = 'agent-bio-full';
        bioFull.innerHTML = `<p>${agent.bio}</p><blockquote class="agent-example"><p>${agent.exampleResponse}</p></blockquote>`;
        card.querySelector('.agent-card-body').appendChild(bioFull);
      }
    }
  }
}

/**
 * Open modal with full agent details
 */
function openAgentModal(agentId) {
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) return;

  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="modal-agent-header" style="border-color: ${agent.color}">
      <h2 id="modal-title" class="modal-agent-name">${agent.name}</h2>
      <span class="modal-agent-role">${agent.role}</span>
    </div>
    <div class="modal-agent-content">
      <div class="modal-section">
        <h3>Traits</h3>
        <div class="agent-traits">
          ${agent.traits.map(trait => `<span class="trait-tag">${trait}</span>`).join('')}
        </div>
      </div>
      <div class="modal-section">
        <h3>Biography</h3>
        <p>${agent.bio}</p>
      </div>
      <div class="modal-section">
        <h3>Example Response</h3>
        <blockquote class="agent-example">
          <p>${agent.exampleResponse}</p>
        </blockquote>
      </div>
    </div>
  `;

  openModal('agent-modal');
}

/**
 * Set up general event listeners
 */
function setupEventListeners() {
  // Modal close button
  const closeBtn = document.querySelector('#agent-modal .modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal('agent-modal'));
  }

  // Modal backdrop click to close
  const backdrop = document.querySelector('#agent-modal .modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => closeModal('agent-modal'));
  }
}

// Export for refresh
export { init as initAgentsUI, setFilter, renderAgentCards };
