import { useState } from 'react';
import type { AiDraft, FollowUpQuestion } from '../types';
import { mockProvider } from '../ai/mockProvider';
import { createTemplateHouse } from '../data/template';
import { applyChanges, cloneHouse, diffHouse, draftInputsKey, openQuestions } from '../lib/hoq';
import { formatDateTime } from '../lib/format';
import { projectHref } from '../lib/router';
import type { TabProps } from './ProjectView';

// Swap this for a real provider once the AI backend exists (see src/ai/provider.ts).
const provider = mockProvider;

const STEPS = ['Reading description and documents', 'Extracting customer needs', 'Weighting needs (1–5)', 'Scoring relationships and roof', 'Preparing follow-up questions'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function DraftTab({ project, update }: TabProps) {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [kept, setKept] = useState<number | null>(null);
  const draft = project.draft;
  const stale = !!draft && draft.inputsKey !== draftInputsKey(project);
  const open = openQuestions(project);

  const generate = async () => {
    setRunning(true);
    setKept(null);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await sleep(380);
    }
    const result = await provider.draftHouse({
      project,
      documents: project.documents,
      answers: project.answers,
      template: createTemplateHouse(),
    });
    result.inputsKey = draftInputsKey(project);
    const changes = project.draft && project.house ? diffHouse(project.draft.house, project.house) : [];
    update((p) => ({ ...p, draft: result, house: applyChanges(result.house, changes), approval: undefined }));
    setKept(changes.length);
    setRunning(false);
  };

  const startFromTemplate = () => {
    const house = createTemplateHouse();
    const manual: AiDraft = {
      house,
      questions: [],
      rationale: [{ target: 'House of Quality', change: 'Started from the team template without AI.', source: 'Template' }],
      provider: 'Team template (no AI)',
      createdAt: new Date().toISOString(),
      inputsKey: draftInputsKey(project),
    };
    update((p) => ({ ...p, draft: manual, house: cloneHouse(house) }));
  };

  const setAnswer = (id: string, value: string) => update((p) => ({ ...p, answers: { ...p.answers, [id]: value } }));

  return (
    <div className="tab-grid">
      <section className="panel">
        <h2>AI draft</h2>
        <p className="sim-note">
          <strong>Simulated:</strong> the AI connection is not built yet. This mockup uses keyword rules on the description, file
          names, text files and your answers to show the workflow.
        </p>

        {running ? (
          <ol className="progress" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? 'done' : i === step ? 'active' : ''}>{s}</li>
            ))}
          </ol>
        ) : draft ? (
          <>
            <dl className="facts">
              <div><dt>Created</dt><dd>{formatDateTime(draft.createdAt)}</dd></div>
              <div><dt>By</dt><dd>{draft.provider}</dd></div>
              <div><dt>Inputs</dt><dd>{plural(project.documents.length, 'document')}, {plural(Object.values(project.answers).filter((a) => a?.trim()).length, 'answer')}</dd></div>
            </dl>
            {stale && (
              <p className="alert alert-info">Inputs changed since this draft (description, documents or answers). Regenerate to include them.</p>
            )}
            {kept !== null && (
              <p className="alert alert-success">
                Draft updated.{kept > 0 ? ` ${kept} manual change${kept === 1 ? ' was' : 's were'} kept.` : ''}
              </p>
            )}
            <div className="btn-row">
              <button className={`btn ${stale ? 'btn-primary' : 'btn-secondary'}`} onClick={generate}>
                {draft.provider.startsWith('Team') ? 'Generate AI draft' : 'Regenerate AI draft'}
              </button>
              <a className={`btn ${stale ? 'btn-secondary' : 'btn-primary'}`} href={projectHref(project.id, 'house')}>Open House of Quality →</a>
            </div>
            <p className="hint">Regenerating keeps the team’s manual changes and applies them on top of the new draft.</p>

            <h3>What the AI did and why</h3>
            {draft.rationale.length === 0 ? (
              <p className="muted">No changes to the template.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Item</th><th>Change and reason</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {draft.rationale.map((r, i) => (
                    <tr key={i}>
                      <td>{r.target}</td>
                      <td>{r.change}</td>
                      <td className="muted">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <>
            <p>The AI reads the request and the documents, fills the House of Quality and lists what it still needs to know.</p>
            <ul className="checklist">
              <li className={project.description.trim() ? 'ok' : ''}>Description {project.description.trim() ? 'available' : 'missing'}</li>
              <li className={project.documents.length ? 'ok' : ''}>{project.documents.length} document{project.documents.length === 1 ? '' : 's'} uploaded</li>
            </ul>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={generate}>Generate AI draft</button>
              <button className="btn btn-secondary" onClick={startFromTemplate}>Start from template without AI</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>
          Follow-up questions{' '}
          {draft && draft.questions.length > 0 && <span className={`count${open ? ' alert' : ''}`}>{open} open</span>}
        </h2>
        {!draft ? (
          <p className="muted">Questions appear after the first draft.</p>
        ) : draft.questions.length === 0 ? (
          <p className="muted">No questions: this project was started from the template.</p>
        ) : (
          <>
            <p className="muted">Answer what you know; then regenerate the draft. Answers also appear in the report.</p>
            <ol className="questions">
              {draft.questions.map((q) => (
                <QuestionItem key={q.id} question={q} value={project.answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
              ))}
            </ol>
            {stale && (
              <button className="btn btn-primary" onClick={generate} disabled={running}>Regenerate with answers</button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function QuestionItem({ question: q, value, onChange }: { question: FollowUpQuestion; value: string; onChange: (v: string) => void }) {
  const answered = !!value.trim();
  return (
    <li className={answered ? 'answered' : ''}>
      <div className="q-text">
        <strong>{q.text}</strong>
        <span className="muted small">{q.why}</span>
      </div>
      {q.options ? (
        <div className="segmented" role="radiogroup" aria-label={q.text}>
          {q.options.map((o) => (
            <button key={o} role="radio" aria-checked={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(value === o ? '' : o)}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Answer …" aria-label={q.text} />
      )}
    </li>
  );
}
