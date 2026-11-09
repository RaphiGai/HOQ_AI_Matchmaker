import type { AiDraft, FollowUpQuestion, House, Need, RationaleItem } from '../types';
import { cloneHouse, orderedRoofKey, relKey } from '../lib/hoq';
import type { AiProvider, DraftRequest } from './provider';

/**
 * Simulated AI: keyword rules over the project description, document names,
 * extracted text and answers. It only exists to make the mockup clickable;
 * replace it with a real LLM provider later (see provider.ts).
 */

export const FOLLOW_UP_QUESTIONS: FollowUpQuestion[] = [
  {
    id: 'fleet',
    text: 'How many robots will the fleet have at go-live, and in three years?',
    why: 'Sets the importance of “Able to handle a change in fleet size”.',
  },
  {
    id: 'brands',
    text: 'Which robot brands or models are in use or planned?',
    why: 'Several vendors make interoperability the key need.',
  },
  {
    id: 'onprem',
    text: 'Must the software run on-premise (e.g. for data protection)?',
    why: 'Drives “Our data stays secure” and the deployment option.',
    options: ['Yes', 'No', 'Not decided'],
  },
  {
    id: 'integrations',
    text: 'Which systems must be integrated (WMS/ERP/MES, lifts, doors)?',
    why: 'Integrations decide how much value the system adds to existing processes.',
  },
  {
    id: 'pricing',
    text: 'Preferred pricing model?',
    why: 'Pricing structure is a known delay in procurement.',
    options: ['CapEx (licence)', 'OpEx (subscription)', 'Open'],
  },
  {
    id: 'golive',
    text: 'What is the target go-live date?',
    why: 'A short timeline makes deployment time a critical characteristic.',
  },
];

interface Source {
  label: string;
  text: string;
}

interface Rule {
  pattern: RegExp;
  apply: (ctx: Ctx, source: string) => void;
}

class Ctx {
  rationale: RationaleItem[] = [];
  constructor(public house: House) {}

  need(id: string): Need | undefined {
    return this.house.needs.find((n) => n.id === id);
  }

  raise(needId: string, importance: number, source: string, reason: string) {
    const n = this.need(needId);
    if (!n || n.importance >= importance) return;
    this.rationale.push({ target: n.text, change: `Importance ${n.importance} → ${importance}: ${reason}`, source });
    n.importance = importance;
    n.origin = 'ai';
    n.source = source;
  }

  lower(needId: string, importance: number, source: string, reason: string) {
    const n = this.need(needId);
    if (!n || n.importance <= importance) return;
    this.rationale.push({ target: n.text, change: `Importance ${n.importance} → ${importance}: ${reason}`, source });
    n.importance = importance;
    n.origin = 'ai';
    n.source = source;
  }

  addNeed(need: Need, relationships: Record<string, 1 | 3 | 9>, source: string, reason: string) {
    if (this.need(need.id)) return;
    this.house.needs.push(need);
    for (const [charId, s] of Object.entries(relationships)) this.house.relationships[relKey(need.id, charId)] = s;
    this.rationale.push({ target: need.text, change: `New need (importance ${need.importance}): ${reason}`, source });
  }

  note(target: string, change: string, source: string) {
    this.rationale.push({ target, change, source });
  }
}

const LIFT_NEED = (source: string): Need => ({
  id: 'n-lifts',
  text: 'Robots use lifts and automatic doors on their own',
  importance: 5,
  origin: 'ai',
  source,
});

const DOCUMENT_RULES: Rule[] = [
  {
    pattern: /hospital|clinic|patient|krankenhaus|klinik/,
    apply: (ctx, src) => {
      ctx.raise('n8', 5, src, 'patient data in a hospital setting');
      ctx.raise('n6', 5, src, 'hospital logistics must not fail');
      ctx.addNeed(LIFT_NEED(src), { c3: 9, c4: 3, c9: 1 }, src, 'hospital transports cross floors and buildings');
    },
  },
  {
    pattern: /lift|elevator|automatic door|aufzug/,
    apply: (ctx, src) => ctx.addNeed(LIFT_NEED(src), { c3: 9, c4: 3, c9: 1 }, src, 'lifts or doors mentioned in the request'),
  },
  {
    pattern: /vda ?5050|mixed fleet|multi-?vendor|two vendors|several vendors|different vendors/,
    apply: (ctx, src) => {
      ctx.raise('n2', 5, src, 'robots from several vendors');
      ctx.raise('n1', 5, src, 'mixed fleet shares the same space');
    },
  },
  {
    pattern: /\b(sap|wms|erp|mes)\b/,
    apply: (ctx, src) => {
      ctx.raise('n7', 5, src, 'existing WMS/ERP/MES must be connected');
      ctx.raise('n3', 5, src, 'value depends on process integration');
    },
  },
  {
    pattern: /24\/7|three shifts|3 shifts|around the clock/,
    apply: (ctx, src) => {
      ctx.raise('n6', 5, src, 'continuous operation');
      ctx.raise('n11', 5, src, 'support needed outside office hours');
    },
  },
  {
    pattern: /budget|tco|cost-sensitive|price-sensitive|low cost/,
    apply: (ctx, src) => ctx.raise('n4', 5, src, 'budget is an explicit criterion'),
  },
  {
    pattern: /scal|expan|ramp-?up|peak season|grow/,
    apply: (ctx, src) => ctx.raise('n9', 5, src, 'fleet size will change'),
  },
  {
    pattern: /pedestrian|forklift|mixed traffic|people walking|staff and robots/,
    apply: (ctx, src) => ctx.raise('n1', 5, src, 'robots share space with people or forklifts'),
  },
  {
    pattern: /on-?prem|data protection|gdpr|dsgvo|no cloud/,
    apply: (ctx, src) => {
      ctx.raise('n8', 5, src, 'data protection requirement');
      ctx.raise('n7', 4, src, 'hosting must match the customer IT');
    },
  },
];

function applyAnswers(ctx: Ctx, answers: Record<string, string>) {
  const src = (id: string) => `Answer: ${FOLLOW_UP_QUESTIONS.find((q) => q.id === id)?.text ?? id}`;
  const a = (id: string) => answers[id]?.trim() ?? '';

  const fleet = a('fleet');
  if (fleet) {
    const numbers = (fleet.match(/\d+/g) ?? []).map(Number);
    const max = numbers.length ? Math.max(...numbers) : 0;
    if (max >= 50) ctx.raise('n9', 5, src('fleet'), `up to ${max} robots`);
    else if (numbers.length >= 2 && max > 2 * Math.min(...numbers)) ctx.raise('n9', 4, src('fleet'), 'fleet will more than double');
    else if (max > 0 && max <= 10) ctx.lower('n9', 2, src('fleet'), 'small, stable fleet');
  }

  const brands = a('brands');
  if (brands && brands.split(/,|;| and | und |\+/).filter((s) => s.trim()).length >= 2) {
    ctx.raise('n2', 5, src('brands'), 'several robot vendors');
  }

  if (a('onprem') === 'Yes') ctx.raise('n8', 5, src('onprem'), 'on-premise required');

  const integrations = a('integrations').toLowerCase();
  if (/lift|elevator|door|aufzug/.test(integrations)) {
    ctx.addNeed(LIFT_NEED(src('integrations')), { c3: 9, c4: 3, c9: 1 }, src('integrations'), 'lifts or doors to integrate');
  }
  if (/\b(sap|wms|erp|mes)\b/.test(integrations)) ctx.raise('n7', 5, src('integrations'), 'WMS/ERP/MES integration');

  const pricing = a('pricing');
  if (pricing && pricing !== 'Open') {
    ctx.note('A competitive pricing point', `Customer prefers ${pricing}: answer the pricing questions in the RFI accordingly.`, src('pricing'));
  }

  if (a('golive')) {
    ctx.note(
      'Time from planning to deploying the software',
      `Target go-live “${a('golive')}”: check whether the deployment time fits.`,
      src('golive'),
    );
  }
}

export function buildDraft(request: DraftRequest): AiDraft {
  const ctx = new Ctx(cloneHouse(request.template));
  const { project, documents, answers } = request;

  const sources: Source[] = [
    { label: 'Project description', text: `${project.name} ${project.vertical} ${project.description}` },
    ...documents.map((d) => ({ label: `Document: ${d.name}`, text: `${d.name.replace(/[_.-]/g, ' ')} ${d.text ?? ''}` })),
  ];

  for (const rule of DOCUMENT_RULES) {
    const hit = sources.find((s) => rule.pattern.test(s.text.toLowerCase()));
    if (hit) rule.apply(ctx, hit.label);
  }
  applyAnswers(ctx, answers);

  // Assumption the "AI" adds to the roof
  const key = orderedRoofKey(ctx.house, 'c2', 'c5');
  if (!ctx.house.roof[key]) {
    ctx.house.roof[key] = '+';
    ctx.note('Roof: standards × onboarding time', 'Positive correlation: standards like VDA 5050 shorten onboarding of new robot types.', 'General knowledge (to verify)');
  }
  ctx.note(
    'Relationship matrix',
    'Taken from the team template (illustrative estimates). A real model would score it from documents and expert input.',
    'Template',
  );

  return {
    house: ctx.house,
    questions: FOLLOW_UP_QUESTIONS,
    rationale: ctx.rationale,
    provider: mockProvider.name,
    createdAt: new Date().toISOString(),
  };
}

export const mockProvider: AiProvider = {
  name: 'Simulated AI (keyword rules)',
  async draftHouse(request) {
    return buildDraft(request);
  },
};
