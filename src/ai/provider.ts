import type { AiDraft, DocumentRef, House, Project } from '../types';

/**
 * Contract between the app and the AI that drafts a House of Quality.
 *
 * Today the app uses `mockProvider` (rule-based, runs in the browser).
 * A real provider (LLM) must run behind a small backend/proxy: never put an
 * API key into this static site, GitHub Pages serves everything publicly.
 */
export interface DraftRequest {
  project: Pick<Project, 'name' | 'customer' | 'vertical' | 'region' | 'description'>;
  documents: DocumentRef[];
  /** questionId -> answer from earlier follow-up questions */
  answers: Record<string, string>;
  /** Shared starting point (needs, characteristics, roof, competitors). */
  template: House;
}

export interface AiProvider {
  /** Shown in the UI and in the report, e.g. "Simulated AI (rules)". */
  name: string;
  draftHouse(request: DraftRequest): Promise<AiDraft>;
}
