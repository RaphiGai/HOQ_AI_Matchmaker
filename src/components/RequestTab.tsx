import { useRef, useState, type DragEvent } from 'react';
import type { DocumentRef, Vertical } from '../types';
import { uid } from '../lib/hoq';
import { formatBytes, formatDate } from '../lib/format';
import { projectHref } from '../lib/router';
import type { TabProps } from './ProjectView';

const VERTICALS: Vertical[] = ['Warehousing', 'Manufacturing', 'Hospital', 'Other'];
const TEXT_TYPES = /\.(txt|md|csv|json|eml)$/i;
const MAX_TEXT_BYTES = 300_000;

function fileKind(doc: DocumentRef): string {
  const ext = doc.name.split('.').pop()?.toUpperCase() ?? '';
  return ext.length <= 4 ? ext : 'FILE';
}

export function RequestTab({ project, update }: TabProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends 'name' | 'customer' | 'vertical' | 'region' | 'description'>(key: K, value: string) =>
    update((p) => ({ ...p, [key]: value }));

  const addFiles = async (files: FileList | File[]) => {
    const docs: DocumentRef[] = [];
    for (const file of Array.from(files)) {
      const isText = (file.type.startsWith('text/') || TEXT_TYPES.test(file.name)) && file.size <= MAX_TEXT_BYTES;
      docs.push({
        id: uid('d'),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        addedAt: new Date().toISOString(),
        text: isText ? await file.text() : undefined,
      });
    }
    if (docs.length) update((p) => ({ ...p, documents: [...p.documents, ...docs] }));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="tab-grid">
      <section className="panel">
        <h2>Customer request</h2>
        <div className="form">
          <label>
            Project name
            <input value={project.name} onChange={(e) => setField('name', e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Customer
              <input value={project.customer} onChange={(e) => setField('customer', e.target.value)} />
            </label>
            <label>
              Vertical
              <select value={project.vertical} onChange={(e) => setField('vertical', e.target.value)}>
                {VERTICALS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              Region
              <input value={project.region} onChange={(e) => setField('region', e.target.value)} />
            </label>
          </div>
          <label>
            Description of the request
            <textarea rows={7} value={project.description} onChange={(e) => setField('description', e.target.value)} />
          </label>
          <p className="hint">The AI reads this description together with the documents.</p>
        </div>
      </section>

      <section className="panel">
        <h2>Documents <span className="count">{project.documents.length}</span></h2>
        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <p><strong>Drop RFI forms, site plans or notes here</strong></p>
          <p className="muted">PDF, Word, Excel, text · several files at once</p>
          <button className="btn btn-secondary" onClick={() => inputRef.current?.click()}>Choose files</button>
          <input ref={inputRef} type="file" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
        <p className="hint">
          Mockup: files stay in this browser. Text files are read directly; for PDF and Office files only name and size
          are stored until the AI backend can parse them. Do not upload confidential documents to the public demo.
        </p>

        {project.documents.length > 0 && (
          <ul className="doc-list">
            {project.documents.map((d) => (
              <li key={d.id}>
                <span className="doc-kind">{fileKind(d)}</span>
                <div className="doc-main">
                  <span className="doc-name">{d.name}</span>
                  <span className="muted small">
                    {formatBytes(d.size)} · added {formatDate(d.addedAt)} ·{' '}
                    {d.demo ? 'demo placeholder' : d.text !== undefined ? `text extracted (${d.text.length.toLocaleString('en')} characters)` : 'parsed by the AI backend (planned)'}
                  </span>
                </div>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => update((p) => ({ ...p, documents: p.documents.filter((x) => x.id !== d.id) }))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="panel-foot">
          <a className="btn btn-primary" href={projectHref(project.id, 'draft')}>
            Next: AI draft →
          </a>
        </div>
      </section>
    </div>
  );
}
