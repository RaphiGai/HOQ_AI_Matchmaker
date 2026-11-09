/** Relationship strength between a customer need and a technical characteristic (QFD 9/3/1 scale). */
export type Strength = 0 | 1 | 3 | 9;

/** Roof correlation between two technical characteristics. */
export type Correlation = '' | '++' | '+' | '-' | '--';

/** Direction of improvement for a technical characteristic. */
export type Direction = 'up' | 'down';

/** Where a value came from: the shared template, the AI draft, or a manual edit. */
export type Origin = 'template' | 'ai' | 'user';

export type Vertical = 'Warehousing' | 'Manufacturing' | 'Hospital' | 'Other';

export interface Need {
  id: string;
  text: string;
  /** 1 = low, 5 = high */
  importance: number;
  origin: Origin;
  /** Document or answer the AI took this need from. */
  source?: string;
}

export interface Characteristic {
  id: string;
  text: string;
  direction: Direction;
}

export interface Competitor {
  id: string;
  name: string;
}

export interface House {
  needs: Need[];
  characteristics: Characteristic[];
  /** key: relKey(needId, charId) */
  relationships: Record<string, Strength>;
  /** key: roofKey(charIdA, charIdB), A before B in characteristic order */
  roof: Record<string, Correlation>;
  competitors: Competitor[];
  /** key: ratingKey(needId, competitorId), value 1–5 */
  ratings: Record<string, number>;
}

export interface DocumentRef {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: string;
  /** Extracted text for plain-text files; binary files are parsed by the AI backend later. */
  text?: string;
  /** Placeholder file in the demo data (no real content). */
  demo?: boolean;
}

export interface FollowUpQuestion {
  id: string;
  text: string;
  why: string;
  options?: string[];
}

export interface RationaleItem {
  target: string;
  change: string;
  source: string;
}

export interface AiDraft {
  house: House;
  questions: FollowUpQuestion[];
  rationale: RationaleItem[];
  provider: string;
  createdAt: string;
  /** Fingerprint of description, documents and answers used for this draft. */
  inputsKey?: string;
}

export interface Approval {
  by: string;
  at: string;
}

export interface Project {
  id: string;
  name: string;
  customer: string;
  vertical: Vertical;
  region: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  documents: DocumentRef[];
  /** questionId -> answer */
  answers: Record<string, string>;
  /** Last AI (or template) draft; the reference for "changed by user". */
  draft?: AiDraft;
  /** Working House of Quality, edited by the team. */
  house?: House;
  approval?: Approval;
  /** Fictitious example shipped with the mockup. */
  example?: boolean;
}

export type ProjectStatus = 'New' | 'Questions open' | 'In review' | 'Approved';
