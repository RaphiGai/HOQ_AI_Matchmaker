import { useRef, useState } from 'react';
import type { Project, Vertical } from '../types';
import type { ProjectStore } from '../lib/store';
import { openQuestions, projectStatus, uid } from '../lib/hoq';
import { formatDate } from '../lib/format';
import { navigate, projectHref } from '../lib/router';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

const VERTICALS: Vertical[] = ['Warehousing', 'Manufacturing', 'Hospital', 'Other'];

const STEPS = [
  { title: 'Create a project', text: 'One project per customer request (RFI or inquiry).' },
  { title: 'Upload documents', text: 'RFI forms, site plans, IT requirements, meeting notes.' },
  { title: 'AI draft + questions', text: 'The AI fills the House of Quality and asks what is missing.' },
  { title: 'Review & export', text: 'The team overrides where needed, approves and exports a PDF.' },
];

export function ProjectList({ store }: { store: ProjectStore }) {
  const [creating, setCreating] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = store.importProject(JSON.parse(await file.text()));
      setImportError(null);
      navigate(projectHref(imported.id));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="page">
      <section className="intro">
        <div>
          <h1>Customer requests → House of Quality</h1>
          <p className="lead">
            Turn a customer request into a weighted House of Quality: customer needs on the left, Meili’s technical
            characteristics on top. The AI drafts it from the documents, the team checks and approves it.
          </p>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="toolbar">
        <h2>Projects <span className="count">{store.projects.length}</span></h2>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New project</button>
        </div>
      </div>
      {importError && <p className="alert alert-error">{importError}</p>}

      {store.projects.length === 0 ? (
        <div className="empty">
          <p>No projects yet.</p>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Create the first project</button>
          <button className="btn btn-link" onClick={store.resetDemo}>or load the example projects</button>
        </div>
      ) : (
        <div className="cards">
          {store.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {creating && <NewProjectModal onClose={() => setCreating(false)} onCreate={(p) => { store.add(p); navigate(projectHref(p.id)); }} />}
    </div>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  const status = projectStatus(p);
  const open = openQuestions(p);
  return (
    <a className="card project-card" href={projectHref(p.id, p.house ? 'house' : 'request')}>
      <div className="card-top">
        <StatusBadge status={status} />
        {p.example && <span className="pill pill-example">Example</span>}
      </div>
      <h3>{p.name}</h3>
      <p className="muted">{p.customer} · {p.vertical} · {p.region}</p>
      <dl className="card-facts">
        <div><dt>Documents</dt><dd>{p.documents.length}</dd></div>
        <div><dt>Needs</dt><dd>{p.house?.needs.length ?? '–'}</dd></div>
        <div><dt>Open questions</dt><dd>{p.draft ? open : '–'}</dd></div>
      </dl>
      <p className="card-date muted">Updated {formatDate(p.updatedAt)}</p>
    </a>
  );
}

function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [vertical, setVertical] = useState<Vertical>('Warehousing');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');

  const create = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onCreate({
      id: uid('p'),
      name: name.trim(),
      customer: customer.trim() || 'Unnamed customer',
      vertical,
      region: region.trim() || '–',
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      documents: [],
      answers: {},
    });
  };

  return (
    <Modal
      title="New project"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={!name.trim()}>Create project</button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <label>
          Project name *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hospital logistics, 2 buildings" required />
        </label>
        <div className="form-row">
          <label>
            Customer
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="e.g. Customer D" />
          </label>
          <label>
            Vertical
            <select value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)}>
              {VERTICALS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label>
            Region
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Denmark" />
          </label>
        </div>
        <label>
          Short description of the request
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does the customer want to automate? Fleet size, sites, special requirements …" />
        </label>
        <p className="hint">Public demo: use anonymised names (e.g. “Customer D”), no confidential customer data.</p>
      </form>
    </Modal>
  );
}
