import type { Characteristic, Correlation, House, Need, Project, ProjectStatus, Strength } from '../types';

export const relKey = (needId: string, charId: string) => `${needId}|${charId}`;
export const roofKey = (charA: string, charB: string) => `${charA}|${charB}`;
export const ratingKey = (needId: string, competitorId: string) => `${needId}|${competitorId}`;

export function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function cloneHouse(house: House): House {
  return structuredClone(house);
}

export const STRENGTH_SYMBOL: Record<Strength, string> = { 0: '', 1: '△', 3: '○', 9: '◉' };
export const CORRELATION_LABEL: Record<Correlation, string> = {
  '': 'no correlation',
  '++': 'strong positive',
  '+': 'positive',
  '-': 'negative (trade-off)',
  '--': 'strong negative',
};
export const CORRELATION_SYMBOL: Record<Correlation, string> = { '': '', '++': '++', '+': '+', '-': '−', '--': '−−' };

const STRENGTH_CYCLE: Strength[] = [0, 1, 3, 9];
const CORRELATION_CYCLE: Correlation[] = ['', '+', '++', '-', '--'];

export const nextStrength = (s: Strength): Strength => STRENGTH_CYCLE[(STRENGTH_CYCLE.indexOf(s) + 1) % STRENGTH_CYCLE.length];
export const nextCorrelation = (c: Correlation): Correlation =>
  CORRELATION_CYCLE[(CORRELATION_CYCLE.indexOf(c) + 1) % CORRELATION_CYCLE.length];
export const nextRating = (r: number | undefined): number | undefined => (r === undefined ? 1 : r >= 5 ? undefined : r + 1);

/** Roof value for two characteristics, independent of argument order. */
export function getCorrelation(house: House, a: string, b: string): Correlation {
  return house.roof[roofKey(a, b)] ?? house.roof[roofKey(b, a)] ?? '';
}

/** Roof key with both ids in characteristic order. */
export function orderedRoofKey(house: House, a: string, b: string): string {
  const ia = house.characteristics.findIndex((c) => c.id === a);
  const ib = house.characteristics.findIndex((c) => c.id === b);
  return ia <= ib ? roofKey(a, b) : roofKey(b, a);
}

// ---------------------------------------------------------------- scores

export interface Scores {
  /** Share of each need in total customer importance (0–1). */
  needShare: Record<string, number>;
  /** Technical importance: Σ importance × relationship strength. */
  charScore: Record<string, number>;
  charShare: Record<string, number>;
  rank: Record<string, number>;
  /** Top 3 characteristics (ties included), highlighted like in the Excel draft. */
  top: Set<string>;
}

export function computeScores(house: House): Scores {
  const totalImportance = house.needs.reduce((sum, n) => sum + n.importance, 0);
  const needShare: Record<string, number> = {};
  for (const n of house.needs) needShare[n.id] = totalImportance ? n.importance / totalImportance : 0;

  const charScore: Record<string, number> = {};
  for (const c of house.characteristics) {
    charScore[c.id] = house.needs.reduce((sum, n) => sum + n.importance * (house.relationships[relKey(n.id, c.id)] ?? 0), 0);
  }
  const totalScore = Object.values(charScore).reduce((a, b) => a + b, 0);
  const charShare: Record<string, number> = {};
  for (const c of house.characteristics) charShare[c.id] = totalScore ? charScore[c.id] / totalScore : 0;

  const sorted = [...house.characteristics].sort((a, b) => charScore[b.id] - charScore[a.id]);
  const rank: Record<string, number> = {};
  sorted.forEach((c, i) => {
    const prev = sorted[i - 1];
    rank[c.id] = prev && charScore[prev.id] === charScore[c.id] ? rank[prev.id] : i + 1;
  });
  const third = sorted[Math.min(2, sorted.length - 1)];
  const threshold = third ? charScore[third.id] : Infinity;
  const top = new Set(house.characteristics.filter((c) => charScore[c.id] > 0 && charScore[c.id] >= threshold).map((c) => c.id));

  return { needShare, charScore, charShare, rank, top };
}

// ---------------------------------------------------------------- changes vs. draft

export type Change =
  | { kind: 'needAdded'; need: Need }
  | { kind: 'needRemoved'; needId: string; text: string }
  | { kind: 'needText'; needId: string; from: string; to: string }
  | { kind: 'importance'; needId: string; from: number; to: number }
  | { kind: 'charAdded'; char: Characteristic }
  | { kind: 'charRemoved'; charId: string; text: string }
  | { kind: 'charText'; charId: string; from: string; to: string }
  | { kind: 'direction'; charId: string; from: Characteristic['direction']; to: Characteristic['direction'] }
  | { kind: 'relationship'; key: string; from: Strength; to: Strength }
  | { kind: 'roof'; key: string; from: Correlation; to: Correlation }
  | { kind: 'rating'; key: string; from?: number; to?: number };

/** Everything the team changed in `current` compared to the draft in `base`. */
export function diffHouse(base: House, current: House): Change[] {
  const changes: Change[] = [];
  const baseNeeds = new Map(base.needs.map((n) => [n.id, n]));
  const baseChars = new Map(base.characteristics.map((c) => [c.id, c]));
  const curNeedIds = new Set(current.needs.map((n) => n.id));
  const curCharIds = new Set(current.characteristics.map((c) => c.id));

  for (const n of base.needs) if (!curNeedIds.has(n.id)) changes.push({ kind: 'needRemoved', needId: n.id, text: n.text });
  for (const n of current.needs) {
    const b = baseNeeds.get(n.id);
    if (!b) changes.push({ kind: 'needAdded', need: n });
    else {
      if (b.text !== n.text) changes.push({ kind: 'needText', needId: n.id, from: b.text, to: n.text });
      if (b.importance !== n.importance) changes.push({ kind: 'importance', needId: n.id, from: b.importance, to: n.importance });
    }
  }

  for (const c of base.characteristics) if (!curCharIds.has(c.id)) changes.push({ kind: 'charRemoved', charId: c.id, text: c.text });
  for (const c of current.characteristics) {
    const b = baseChars.get(c.id);
    if (!b) changes.push({ kind: 'charAdded', char: c });
    else {
      if (b.text !== c.text) changes.push({ kind: 'charText', charId: c.id, from: b.text, to: c.text });
      if (b.direction !== c.direction) changes.push({ kind: 'direction', charId: c.id, from: b.direction, to: c.direction });
    }
  }

  for (const n of current.needs) {
    for (const c of current.characteristics) {
      const key = relKey(n.id, c.id);
      const from = base.relationships[key] ?? 0;
      const to = current.relationships[key] ?? 0;
      if (from !== to) changes.push({ kind: 'relationship', key, from, to });
    }
    for (const comp of current.competitors) {
      const key = ratingKey(n.id, comp.id);
      if (base.ratings[key] !== current.ratings[key]) changes.push({ kind: 'rating', key, from: base.ratings[key], to: current.ratings[key] });
    }
  }

  const chars = current.characteristics;
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const from = getCorrelation(base, chars[i].id, chars[j].id);
      const to = getCorrelation(current, chars[i].id, chars[j].id);
      if (from !== to) changes.push({ kind: 'roof', key: roofKey(chars[i].id, chars[j].id), from, to });
    }
  }
  return changes;
}

/** Re-applies the team's changes on top of a new draft (used when the AI draft is regenerated). */
export function applyChanges(base: House, changes: Change[]): House {
  const h = cloneHouse(base);
  for (const ch of changes) {
    switch (ch.kind) {
      case 'needRemoved':
        h.needs = h.needs.filter((n) => n.id !== ch.needId);
        break;
      case 'charRemoved':
        h.characteristics = h.characteristics.filter((c) => c.id !== ch.charId);
        break;
      case 'needAdded':
        if (!h.needs.some((n) => n.id === ch.need.id)) h.needs.push({ ...ch.need });
        break;
      case 'charAdded':
        if (!h.characteristics.some((c) => c.id === ch.char.id)) h.characteristics.push({ ...ch.char });
        break;
      default:
        break;
    }
  }
  const needIds = new Set(h.needs.map((n) => n.id));
  const charIds = new Set(h.characteristics.map((c) => c.id));
  const bothExist = (key: string, left: Set<string>, right: Set<string>) => {
    const [a, b] = key.split('|');
    return left.has(a) && right.has(b);
  };
  for (const ch of changes) {
    switch (ch.kind) {
      case 'needText':
      case 'importance': {
        const n = h.needs.find((x) => x.id === ch.needId);
        if (n && ch.kind === 'needText') n.text = ch.to;
        if (n && ch.kind === 'importance') n.importance = ch.to;
        break;
      }
      case 'charText':
      case 'direction': {
        const c = h.characteristics.find((x) => x.id === ch.charId);
        if (c && ch.kind === 'charText') c.text = ch.to;
        if (c && ch.kind === 'direction') c.direction = ch.to;
        break;
      }
      case 'relationship':
        if (bothExist(ch.key, needIds, charIds)) {
          if (ch.to) h.relationships[ch.key] = ch.to;
          else delete h.relationships[ch.key];
        }
        break;
      case 'roof':
        if (bothExist(ch.key, charIds, charIds)) {
          const [a, b] = ch.key.split('|');
          delete h.roof[roofKey(a, b)];
          delete h.roof[roofKey(b, a)];
          if (ch.to) h.roof[orderedRoofKey(h, a, b)] = ch.to;
        }
        break;
      case 'rating':
        if (needIds.has(ch.key.split('|')[0])) {
          if (ch.to === undefined) delete h.ratings[ch.key];
          else h.ratings[ch.key] = ch.to;
        }
        break;
      default:
        break;
    }
  }
  return pruneHouse(h);
}

/** Removes matrix, roof and rating entries that point to deleted needs or characteristics. */
export function pruneHouse(house: House): House {
  const needIds = new Set(house.needs.map((n) => n.id));
  const charIds = new Set(house.characteristics.map((c) => c.id));
  const keep = <T>(rec: Record<string, T>, left: Set<string>, right: Set<string>) =>
    Object.fromEntries(Object.entries(rec).filter(([k]) => {
      const [a, b] = k.split('|');
      return left.has(a) && right.has(b);
    }));
  const compIds = new Set(house.competitors.map((c) => c.id));
  return {
    ...house,
    relationships: keep(house.relationships, needIds, charIds),
    roof: keep(house.roof, charIds, charIds),
    ratings: keep(house.ratings, needIds, compIds),
  };
}

/** Human-readable line for the change log in the report. */
export function describeChange(ch: Change, base: House, current: House): string {
  const needText = (id: string) => current.needs.find((n) => n.id === id)?.text ?? base.needs.find((n) => n.id === id)?.text ?? id;
  const charText = (id: string) =>
    current.characteristics.find((c) => c.id === id)?.text ?? base.characteristics.find((c) => c.id === id)?.text ?? id;
  const compName = (id: string) => current.competitors.find((c) => c.id === id)?.name ?? id;
  const sym = (s: Strength) => (s ? `${STRENGTH_SYMBOL[s]} ${s}` : 'blank');
  const dir = (d: Characteristic['direction']) => (d === 'up' ? '▲ higher is better' : '▼ lower is better');
  switch (ch.kind) {
    case 'needAdded':
      return `Need added: “${ch.need.text}” (importance ${ch.need.importance})`;
    case 'needRemoved':
      return `Need removed: “${ch.text}”`;
    case 'needText':
      return `Need renamed: “${ch.from}” → “${ch.to}”`;
    case 'importance':
      return `Importance of “${needText(ch.needId)}”: ${ch.from} → ${ch.to}`;
    case 'charAdded':
      return `Characteristic added: “${ch.char.text}”`;
    case 'charRemoved':
      return `Characteristic removed: “${ch.text}”`;
    case 'charText':
      return `Characteristic renamed: “${ch.from}” → “${ch.to}”`;
    case 'direction':
      return `Direction of “${charText(ch.charId)}”: ${dir(ch.from)} → ${dir(ch.to)}`;
    case 'relationship': {
      const [n, c] = ch.key.split('|');
      return `Relationship “${needText(n)}” × “${charText(c)}”: ${sym(ch.from)} → ${sym(ch.to)}`;
    }
    case 'roof': {
      const [a, b] = ch.key.split('|');
      return `Roof “${charText(a)}” × “${charText(b)}”: ${CORRELATION_SYMBOL[ch.from] || 'blank'} → ${CORRELATION_SYMBOL[ch.to] || 'blank'}`;
    }
    case 'rating': {
      const [n, comp] = ch.key.split('|');
      return `Rating of ${compName(comp)} on “${needText(n)}”: ${ch.from ?? 'blank'} → ${ch.to ?? 'blank'}`;
    }
  }
}

// ---------------------------------------------------------------- project status

/** Changes whenever an input of the AI draft changes; used to suggest regenerating. */
export function draftInputsKey(project: Project): string {
  return JSON.stringify([project.description, project.vertical, project.documents.map((d) => d.id), project.answers]);
}

export function openQuestions(project: Project): number {
  return project.draft?.questions.filter((q) => !project.answers[q.id]?.trim()).length ?? 0;
}

export function projectStatus(project: Project): ProjectStatus {
  if (project.approval) return 'Approved';
  if (!project.house) return 'New';
  if (openQuestions(project) > 0) return 'Questions open';
  return 'In review';
}
