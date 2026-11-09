import { useState } from 'react';
import type { Characteristic, House } from '../types';
import { cloneHouse, computeScores, describeChange, diffHouse, pruneHouse, uid } from '../lib/hoq';
import { pct } from '../lib/format';
import { projectHref } from '../lib/router';
import { HouseOfQuality } from './HouseOfQuality';
import { Modal } from './Modal';
import type { TabProps } from './ProjectView';

export function HouseTab({ project, update }: TabProps) {
  const [showChanges, setShowChanges] = useState(true);
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const house = project.house;
  const base = project.draft?.house;
  if (!house) return null;

  const changes = base ? diffHouse(base, house) : [];
  const scores = computeScores(house);
  const top = [...house.characteristics].filter((c) => scores.top.has(c.id)).sort((a, b) => scores.charScore[b.id] - scores.charScore[a.id]);

  const setHouse = (h: House) => update((p) => ({ ...p, house: h, approval: undefined }));

  const addNeed = () => {
    const h = cloneHouse(house);
    h.needs.push({ id: uid('n'), text: 'New customer need', importance: 3, origin: 'user' });
    setHouse(h);
  };

  const addCharacteristic = () => {
    const h = cloneHouse(house);
    const id = uid('c');
    h.characteristics.push({ id, text: 'New characteristic', direction: 'up' });
    setHouse(h);
    setEditingChar(id);
  };

  const reset = () => {
    if (base && window.confirm('Discard all manual changes and go back to the AI draft?')) setHouse(cloneHouse(base));
  };

  const char = house.characteristics.find((c) => c.id === editingChar);

  return (
    <div className="house-tab">
      <div className="house-toolbar no-print">
        <div className="btn-row">
          <button className="btn btn-secondary btn-sm" onClick={addNeed}>+ Customer need</button>
          <button className="btn btn-secondary btn-sm" onClick={addCharacteristic}>+ Characteristic</button>
          <label className="toggle">
            <input type="checkbox" checked={showChanges} onChange={(e) => setShowChanges(e.target.checked)} />
            Highlight changes vs. AI draft
          </label>
        </div>
        <div className="btn-row">
          <span className={`count${changes.length ? ' changed' : ''}`}>{changes.length} manual change{changes.length === 1 ? '' : 's'}</span>
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={!changes.length}>Reset to AI draft</button>
          <a className="btn btn-primary btn-sm" href={projectHref(project.id, 'report')}>Report & PDF →</a>
        </div>
      </div>

      <div className="top3">
        <span className="muted">Top technical characteristics for this customer:</span>
        {top.map((c) => (
          <span key={c.id} className="top3-item">
            <strong>{scores.rank[c.id]}.</strong> {c.text} <span className="muted">{pct(scores.charShare[c.id])}</span>
          </span>
        ))}
      </div>

      <div className="hoq-scroll">
        <HouseOfQuality house={house} base={base} editable showChanges={showChanges} onChange={setHouse} onEditCharacteristic={setEditingChar} />
      </div>

      <p className="hint">
        Click a cell to cycle △ 1 → ○ 3 → ◉ 9 → blank, or select it and type 9, 3, 1 or 0. Click a roof diamond to cycle + → ++ → − →
        −− → blank, ▲/▼ to switch the direction, a characteristic name to edit it. Competitor ratings: click to cycle 1–5. Hover a
        marked cell to see the AI value.
      </p>

      {changes.length > 0 && base && (
        <details className="panel changes">
          <summary>Changes made by the team ({changes.length})</summary>
          <ul>
            {changes.map((ch, i) => <li key={i}>{describeChange(ch, base, house)}</li>)}
          </ul>
        </details>
      )}

      {char && (
        <CharacteristicModal
          char={char}
          onClose={() => setEditingChar(null)}
          onSave={(c) => {
            const h = cloneHouse(house);
            h.characteristics = h.characteristics.map((x) => (x.id === c.id ? c : x));
            setHouse(h);
            setEditingChar(null);
          }}
          onDelete={() => {
            const h = cloneHouse(house);
            h.characteristics = h.characteristics.filter((x) => x.id !== char.id);
            setHouse(pruneHouse(h));
            setEditingChar(null);
          }}
        />
      )}
    </div>
  );
}

function CharacteristicModal({ char, onClose, onSave, onDelete }: { char: Characteristic; onClose: () => void; onSave: (c: Characteristic) => void; onDelete: () => void }) {
  const [text, setText] = useState(char.text);
  const [direction, setDirection] = useState(char.direction);
  return (
    <Modal
      title="Technical characteristic"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-danger-ghost" onClick={() => window.confirm('Remove this characteristic and its relationships?') && onDelete()}>Remove</button>
          <span className="spacer" />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...char, text: text.trim() || char.text, direction })}>Save</button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSave({ ...char, text: text.trim() || char.text, direction }); }}>
        <label>
          Name (measurable, with unit if possible)
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label>
          Direction of improvement
          <select value={direction} onChange={(e) => setDirection(e.target.value as Characteristic['direction'])}>
            <option value="up">▲ Higher is better</option>
            <option value="down">▼ Lower is better</option>
          </select>
        </label>
      </form>
    </Modal>
  );
}
