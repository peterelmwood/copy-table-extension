import {
  defineAgent,
  defineRouting,
  defineSquad,
  defineTeam,
} from '@bradygaster/squad-sdk';

const agents = [
  defineAgent({
    name: 'lead',
    role: 'Technical Lead and Spec Kit Steward',
    description: 'Protects scope, architecture, and artifact traceability.',
    model: 'gpt-4.1',
    capabilities: [
      { name: 'spec-kit-governance', level: 'expert' },
      { name: 'browser-extension-architecture', level: 'expert' },
      { name: 'task-decomposition', level: 'expert' },
    ],
    status: 'active',
  }),
  defineAgent({
    name: 'webextensions-engineer',
    role: 'Firefox and WebExtensions Engineer',
    description: 'Owns Firefox packaging, browser boundaries, and permissions.',
    model: 'gpt-4.1',
    capabilities: [
      { name: 'firefox-webextensions', level: 'expert' },
      { name: 'browser-permissions', level: 'expert' },
      { name: 'context-menu-targeting', level: 'expert' },
      { name: 'interaction-scoped-clipboard', level: 'expert' },
      { name: 'typescript-build-tooling', level: 'proficient' },
    ],
    status: 'active',
  }),
  defineAgent({
    name: 'structured-data-engineer',
    role: 'DOM and Structured Data Engineer',
    description: 'Owns deterministic normalization and format fidelity.',
    model: 'gpt-4.1',
    capabilities: [
      { name: 'dom-extraction', level: 'expert' },
      { name: 'table-normalization', level: 'expert' },
      { name: 'html-markdown-text-csv', level: 'expert' },
      { name: 'rowspan-colspan-matrix', level: 'expert' },
      { name: 'safe-html-serialization', level: 'expert' },
    ],
    status: 'active',
  }),
  defineAgent({
    name: 'qa-engineer',
    role: 'Browser Extension QA Engineer',
    description: 'Enforces test-first browser and domain verification.',
    model: 'gpt-4.1',
    capabilities: [
      { name: 'test-driven-development', level: 'expert' },
      { name: 'firefox-integration-testing', level: 'expert' },
      { name: 'privacy-permission-verification', level: 'expert' },
      { name: 'clipboard-failure-testing', level: 'proficient' },
    ],
    status: 'active',
  }),
  defineAgent({
    name: 'scribe',
    role: 'Squad Scribe',
    description: 'Records decisions, handoffs, and durable project context.',
    model: 'gpt-4.1-mini',
    capabilities: [
      { name: 'decision-recording', level: 'expert' },
      { name: 'artifact-traceability', level: 'proficient' },
    ],
    status: 'active',
  }),
];

export default defineSquad({
  version: '1.0.0',
  team: defineTeam({
    name: 'Copy Table Browser Extension Squad',
    description:
      'A Firefox-first team for safe, deterministic structured-data capture.',
    projectContext:
      'Spec Kit artifacts are authoritative. Capture is explicit, local-only, permission-minimized, and Firefox-first.',
    members: [
      '@lead',
      '@webextensions-engineer',
      '@structured-data-engineer',
      '@qa-engineer',
      '@scribe',
    ],
  }),
  agents,
  routing: defineRouting({
    rules: [
      {
        pattern: 'constitution|spec|plan|architecture|scope|decision',
        agents: ['@lead'],
        tier: 'full',
        priority: 1,
        description: 'Spec Kit governance and architecture decisions.',
      },
      {
        pattern: 'firefox|manifest|extension|permission|background|content-script|clipboard|context-menu|active-tab',
        agents: ['@webextensions-engineer'],
        tier: 'standard',
        priority: 2,
        description: 'Firefox runtime, packaging, and browser boundaries.',
      },
      {
        pattern: 'DOM|table|normalize|HTML|Markdown|CSV|serializer|structured-data|rowspan|colspan|sanitize',
        agents: ['@structured-data-engineer'],
        tier: 'standard',
        priority: 2,
        description: 'Structured-data extraction and deterministic formats.',
      },
      {
        pattern: 'test|QA|coverage|verify|quickstart|privacy|security',
        agents: ['@qa-engineer'],
        tier: 'standard',
        priority: 2,
        description: 'Test-first validation, privacy, and permissions.',
      },
      {
        pattern: 'docs|decision-log|handoff|history|status',
        agents: ['@scribe'],
        tier: 'lightweight',
        priority: 3,
        description: 'Durable context and documentation support.',
      },
    ],
    defaultAgent: '@lead',
    fallback: 'default-agent',
  }),
});
