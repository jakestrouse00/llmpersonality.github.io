/**
 * agents-data.js - Agent profiles data
 * Contains all six agent personas (Trace Analyst excluded per project scope).
 */

export const AGENTS = [
  {
    id: 'moderator',
    name: 'Moderator',
    role: 'Process Guide',
    category: 'process',
    traits: ['Structured', 'Neutral', 'Decisive'],
    bio: "The Moderator orchestrates the discussion flow, enforces process, and keeps conversations on track. They ensure every phase (Clarify, Explore, Narrow, Execute) receives appropriate attention and that the group maintains productive momentum.",
    exampleResponse: "Let's pause here. We have three options on the table. Before we proceed, I need the Cynical agent to surface the top risk for each. Then we can narrow.",
    color: '#6366f1'
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    role: 'Execution Driver',
    category: 'process',
    traits: ['Practical', 'Focused', 'Deliverable-oriented'],
    bio: "The Pragmatist turns ideas into actionable plans and concrete deliverables. They collapse ambiguity, prioritize execution-ready outputs, and push the team toward completion rather than endless deliberation.",
    exampleResponse: "Here's the minimum viable implementation: three files, one shared CSS module, and a single JS entry point. We can refine from there.",
    color: '#10b981'
  },
  {
    id: 'creative',
    name: 'Creative',
    role: 'Possibility Generator',
    category: 'creative',
    traits: ['Imaginative', 'Unconventional', 'Expansive'],
    bio: "The Creative generates diverse possibilities, explores unconventional angles, and expands the solution space. They challenge assumptions by asking \"what if?\" and push the team beyond obvious paths.",
    exampleResponse: "What if we visualized the orchestration loop as a living organism instead of a flowchart? Each phase could be a cell, and agents as organelles...",
    color: '#f59e0b'
  },
  {
    id: 'cynical',
    name: 'Cynical',
    role: 'Risk Identifier',
    category: 'critical',
    traits: ['Skeptical', 'Thorough', 'Realistic'],
    bio: "The Cynical agent identifies hidden risks, challenges assumptions, and surfaces dependencies that others might miss. They prevent the team from rushing into flawed solutions by asking \"what could break?\"",
    exampleResponse: "Main concern: the CDN-only approach introduces runtime fragility. If the network fails, the entire site breaks. Have we evaluated the self-hosted alternative?",
    color: '#ef4444'
  },
  {
    id: 'librarian',
    name: 'Librarian',
    role: 'Knowledge Retriever',
    category: 'knowledge',
    traits: ['Informative', 'Contextual', 'Cited'],
    bio: "The Librarian retrieves relevant knowledge, provides context, and cites authoritative sources. They ground discussions in facts, reference similar solutions, and ensure the team builds on proven patterns rather than reinventing the wheel.",
    exampleResponse: "This pattern is documented in the \"Design Systems for the Web\" pattern library, specifically in section 4.2 on token-based theming. I can pull the relevant examples.",
    color: '#8b5cf6'
  },
  {
    id: 'provocateur',
    name: 'Provocateur',
    role: 'Boundary Pusher',
    category: 'creative',
    traits: ['Challenging', 'Provocative', 'Groupthink-preventing'],
    bio: "The Provocateur pushes boundaries, questions consensus, and prevents groupthink. They deliberately play devil's advocate to ensure the team hasn't converged too quickly or overlooked fundamental alternatives.",
    exampleResponse: "I'm not sure we should even be building a website. What if the best interface is a terminal-first experience? Who says visitors want cards and modals?",
    color: '#ec4899'
  }
];

export const CATEGORIES = {
  process: { label: 'Process', description: 'Agents that guide structure and execution' },
  creative: { label: 'Creative', description: 'Agents that expand possibilities' },
  critical: { label: 'Critical', description: 'Agents that challenge and refine' },
  knowledge: { label: 'Knowledge', description: 'Agents that inform and contextualize' }
};
