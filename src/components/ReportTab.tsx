import { useState } from 'react';
import type { Origin } from '../types';
import { computeScores, describeChange, diffHouse, projectStatus } from '../lib/hoq';
import { formatBytes, formatDate, formatDateTime, pct } from '../lib/format';
import { HouseOfQuality } from './HouseOfQuality';
import type { TabProps } from './ProjectView';

const ORIGIN_LABEL: Record<Origin, string> = { template: 'Template', ai: 'AI', user: 'Team' };

export function ReportTab({ project, update }: TabProps) {
  const [reviewer, setReviewer] = useState('');
  const house = project.house;
  const draft = project.draft;
  if (!house) return null;

  const scores = computeScores(house);
  const charsRanked = [...house.characteristics].sort((a, b) => scores.charScore[b.id] - scores.charScore[a.id]);
  const top = charsRanked.filter((c) => scores.top.has(c.id));
  const needsRanked = [...house.needs].sort((a, b) => b.importance - a.importance);
  const changes = draft ? diffHouse(draft.house, house) : [];
  const answered = draft?.questions.filter((q) => project.answers[q.id]?.trim()) ?? [];
  const unanswered = draft?.questions.filter((q) => !project.answers[q.id]?.trim()) ?? [];
  const maxShare = Math.max(...Object.values(scores.charShare), 0.0001);

  return (
    <div className="report-tab">
      <div className="report-actions no-print">
        <div className="btn-row">
          {project.approval ? (
            <>
              <span className="alert alert-success inline">Approved by {project.approval.by} on {formatDate(project.approval.at)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => update((p) => ({ ...p, approval: undefined }))}>Withdraw approval</button>
            </>
          ) : (
            <form className="approve" onSubmit={(e) => {
              e.preventDefault();
              if (reviewer.trim()) update((p) => ({ ...p, approval: { by: reviewer.trim(), at: new Date().toISOString() } }));
            }}>
              <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Reviewed by (name)" aria-label="Reviewed by" />
              <button className="btn btn-secondary btn-sm" disabled={!reviewer.trim()}>Approve</button>
            </form>
          )}
        </div>
        <div className="btn-row">
          <span className="hint">Choose “Save as PDF” in the print dialog.</span>
          <button className="btn btn-primary" onClick={() => window.print()}>Export PDF</button>
        </div>
      </div>

      <article className="report">
        <header className="report-head">
          <div>
            <p className="eyebrow">House of Quality · customer request</p>
            <h1>{project.name}</h1>
          </div>
          <dl className="report-meta">
            <div><dt>Customer</dt><dd>{project.customer}</dd></div>
            <div><dt>Vertical / region</dt><dd>{project.vertical} · {project.region}</dd></div>
            <div><dt>Status</dt><dd>{projectStatus(project)}{project.approval ? ` (${project.approval.by}, ${formatDate(project.approval.at)})` : ''}</dd></div>
            <div><dt>Draft</dt><dd>{draft ? `${draft.provider}, ${formatDateTime(draft.createdAt)}` : '–'}</dd></div>
            <div><dt>Team changes</dt><dd>{changes.length}</dd></div>
            <div><dt>Exported</dt><dd>{formatDateTime(new Date().toISOString())}</dd></div>
          </dl>
        </header>

        {project.description && (
          <section className="report-section">
            <h2>Request</h2>
            <p>{project.description}</p>
          </section>
        )}

        <section className="report-section">
          <h2>Key result: what matters most for this customer</h2>
          <div className="top-cards">
            {top.map((c) => (
              <div key={c.id} className="top-card">
                <span className="top-rank">{scores.rank[c.id]}</span>
                <div>
                  <strong>{c.text}</strong>
                  <span className="muted small">{pct(scores.charShare[c.id])} of technical importance · {c.direction === 'up' ? '▲ higher is better' : '▼ lower is better'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bars" role="img" aria-label="Share of technical importance per characteristic">
            {charsRanked.map((c) => (
              <div key={c.id} className="bar-row">
                <span className="bar-label">{c.text}</span>
                <span className="bar-track">
                  <span className={`bar${scores.top.has(c.id) ? ' top' : ''}`} style={{ width: `${(scores.charShare[c.id] / maxShare) * 100}%` }} />
                </span>
                <span className="bar-value">{pct(scores.charShare[c.id])}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>Customer needs by importance</h2>
          <table className="table">
            <thead>
              <tr><th>Need</th><th className="num">Importance</th><th className="num">Share</th><th>Set by</th><th>Source</th></tr>
            </thead>
            <tbody>
              {needsRanked.map((n) => (
                <tr key={n.id}>
                  <td>{n.text}</td>
                  <td className="num">{n.importance}</td>
                  <td className="num">{pct(scores.needShare[n.id])}</td>
                  <td>{ORIGIN_LABEL[n.origin]}</td>
                  <td className="muted">{n.source ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-section page-break">
          <h2>House of Quality</h2>
          <div className="hoq-scroll">
            <HouseOfQuality house={house} base={draft?.house} compact showChanges={changes.length > 0} />
          </div>
        </section>

        {draft && draft.questions.length > 0 && (
          <section className="report-section">
            <h2>Follow-up questions</h2>
            <table className="table">
              <tbody>
                {answered.map((q) => (
                  <tr key={q.id}><td>{q.text}</td><td>{project.answers[q.id]}</td></tr>
                ))}
                {unanswered.map((q) => (
                  <tr key={q.id} className="open-q"><td>{q.text}</td><td>Open: clarify with the customer</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {draft && draft.rationale.length > 0 && (
          <section className="report-section">
            <h2>Reasoning of the draft</h2>
            <ul className="plain-list">
              {draft.rationale.map((r, i) => (
                <li key={i}><strong>{r.target}:</strong> {r.change} <span className="muted">({r.source})</span></li>
              ))}
            </ul>
          </section>
        )}

        {draft && changes.length > 0 && (
          <section className="report-section">
            <h2>Changes made by the team</h2>
            <ul className="plain-list">
              {changes.map((ch, i) => <li key={i}>{describeChange(ch, draft.house, house)}</li>)}
            </ul>
          </section>
        )}

        <section className="report-section">
          <h2>Documents considered</h2>
          {project.documents.length ? (
            <ul className="plain-list">
              {project.documents.map((d) => <li key={d.id}>{d.name} <span className="muted">({formatBytes(d.size)})</span></li>)}
            </ul>
          ) : (
            <p className="muted">None.</p>
          )}
        </section>

        <footer className="report-foot">
          Mockup, DTU course 38108 student project with Meili Robots. Fictitious example data. The AI draft is simulated with keyword rules;
          relationship values are illustrative team estimates and must be validated by experts before use.
        </footer>
      </article>
    </div>
  );
}
