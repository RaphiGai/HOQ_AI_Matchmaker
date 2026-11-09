import type { CSSProperties, KeyboardEvent } from 'react';
import type { Correlation, House, Strength } from '../types';
import {
  CORRELATION_LABEL,
  CORRELATION_SYMBOL,
  STRENGTH_SYMBOL,
  computeScores,
  getCorrelation,
  nextCorrelation,
  nextRating,
  nextStrength,
  orderedRoofKey,
  pruneHouse,
  ratingKey,
  relKey,
  roofKey,
} from '../lib/hoq';
import { pct } from '../lib/format';

interface Props {
  house: House;
  /** AI draft; cells that differ from it are marked as changed by the team. */
  base?: House;
  editable?: boolean;
  showChanges?: boolean;
  /** Smaller cells for the report / PDF. */
  compact?: boolean;
  onChange?: (house: House) => void;
  onEditCharacteristic?: (id: string) => void;
}

const STRENGTH_KEYS: Record<string, Strength> = { '0': 0, '1': 1, '3': 3, '9': 9, Backspace: 0, Delete: 0 };
const ROOF_CLASS: Record<Correlation, string> = { '': 'roof-none', '++': 'roof-pp', '+': 'roof-p', '-': 'roof-m', '--': 'roof-mm' };

export function HouseOfQuality({ house, base, editable = false, showChanges = true, compact = false, onChange, onEditCharacteristic }: Props) {
  const chars = house.characteristics;
  const needs = house.needs;
  const comps = house.competitors;
  const N = chars.length;
  const K = needs.length;

  const cell = compact ? 40 : 52;
  const compW = compact ? 30 : 40;
  const needW = compact ? 230 : 380;
  const roofH = (Math.max(N, 1) * cell) / 2;
  const scores = computeScores(house);
  const mark = showChanges && base ? base : undefined;

  const col = { idx: 1, need: 2, imp: 3, share: 4, char: (i: number) => 5 + i, gap: 5 + N, comp: (j: number) => 6 + N + j };
  const row = { roof: 1, dir: 2, head: 3, need: (k: number) => 4 + k, score: 4 + K, share: 5 + K, rank: 6 + K };
  const at = (c: number | string, r: number | string): CSSProperties => ({ gridColumn: c, gridRow: r });

  const gridTemplateColumns = [
    '28px',
    `${needW}px`,
    compact ? '44px' : '58px',
    compact ? '44px' : '52px',
    N ? `repeat(${N}, ${cell}px)` : '',
    compact ? '10px' : '16px',
    comps.length ? `repeat(${comps.length}, ${compW}px)` : '',
  ].join(' ');
  const gridTemplateRows = [`${roofH}px`, compact ? '22px' : '28px', compact ? '150px' : '196px', `repeat(${K + 3}, auto)`].join(' ');

  const set = (fn: (h: House) => void) => {
    if (!onChange) return;
    const h = structuredClone(house);
    fn(h);
    onChange(pruneHouse(h));
  };

  const baseNeed = (id: string) => mark?.needs.find((n) => n.id === id);
  const baseChar = (id: string) => mark?.characteristics.find((c) => c.id === id);
  const changed = (isChanged: boolean | undefined) => (isChanged ? ' changed' : '');

  const onStrengthKey = (e: KeyboardEvent, key: string) => {
    const value = STRENGTH_KEYS[e.key];
    if (value === undefined) return;
    e.preventDefault();
    set((h) => {
      if (value) h.relationships[key] = value;
      else delete h.relationships[key];
    });
  };

  const activate = (e: KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  // ------------------------------------------------------------ roof
  const diamonds = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = chars[i];
      const b = chars[j];
      const value = getCorrelation(house, a.id, b.id);
      const baseValue = mark ? getCorrelation(mark, a.id, b.id) : value;
      const cx = ((i + j + 1) / 2) * cell;
      const cy = roofH - ((j - i) * cell) / 2;
      const h = cell / 2;
      const label = `Correlation “${a.text}” × “${b.text}”: ${CORRELATION_LABEL[value]}`;
      const cycle = () =>
        set((hh) => {
          delete hh.roof[roofKey(a.id, b.id)];
          delete hh.roof[roofKey(b.id, a.id)];
          const next = nextCorrelation(value);
          if (next) hh.roof[orderedRoofKey(hh, a.id, b.id)] = next;
        });
      diamonds.push(
        <g
          key={`${a.id}-${b.id}`}
          className={`roof-cell ${ROOF_CLASS[value]}${changed(mark && baseValue !== value)}${editable ? ' clickable' : ''}`}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          aria-label={label}
          onClick={editable ? cycle : undefined}
          onKeyDown={editable ? (e) => activate(e, cycle) : undefined}
        >
          <title>{mark && baseValue !== value ? `${label} (AI draft: ${CORRELATION_LABEL[baseValue]})` : label}</title>
          <polygon points={`${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`} />
          {value && (
            <text x={cx} y={cy} dominantBaseline="central" textAnchor="middle" fontSize={compact ? 11 : 14}>
              {CORRELATION_SYMBOL[value]}
            </text>
          )}
        </g>,
      );
    }
  }

  return (
    <div className={`hoq${compact ? ' hoq-compact' : ''}${editable ? ' hoq-editable' : ''}`} style={{ gridTemplateColumns, gridTemplateRows }}>
      {/* Roof */}
      <div className="hoq-corner" style={at('1 / span 4', row.roof)}>
        <div className="hoq-legend">
          <strong>Relationship</strong>
          <span>◉ strong (9) · ○ medium (3) · △ weak (1)</span>
          <strong>Roof</strong>
          <span>++ strong positive · + positive · − trade-off · −− strong negative</span>
          {mark && (
            <span className="legend-changed">
              <i /> changed by the team
            </span>
          )}
        </div>
      </div>
      {N > 1 && (
        <svg className="hoq-roof" style={at(`${col.char(0)} / span ${N}`, row.roof)} width={N * cell} height={roofH} viewBox={`0 0 ${N * cell} ${roofH}`}>
          {diamonds}
        </svg>
      )}

      {/* Direction of improvement */}
      <div className="hoq-label right" style={at('1 / span 4', row.dir)}>
        Direction of improvement
      </div>
      {chars.map((c, i) => {
        const toggle = () => set((h) => {
          const x = h.characteristics.find((y) => y.id === c.id);
          if (x) x.direction = x.direction === 'up' ? 'down' : 'up';
        });
        const isChanged = mark && baseChar(c.id) && baseChar(c.id)!.direction !== c.direction;
        const text = c.direction === 'up' ? '▲' : '▼';
        const title = c.direction === 'up' ? 'Higher is better' : 'Lower is better';
        return editable ? (
          <button key={c.id} className={`hoq-dir b bt${i === 0 ? ' bl' : ''}${changed(isChanged)}`} style={at(col.char(i), row.dir)} onClick={toggle} title={`${title} (click to switch)`} aria-label={`${c.text}: ${title}`}>
            {text}
          </button>
        ) : (
          <div key={c.id} className={`hoq-dir b bt${i === 0 ? ' bl' : ''}${changed(isChanged)}`} style={at(col.char(i), row.dir)} title={title}>
            {text}
          </div>
        );
      })}
      {comps.length > 0 && (
        <div className="hoq-label center" style={at(`${col.comp(0)} / span ${comps.length}`, row.dir)}>
          Competitors (1–5)
        </div>
      )}

      {/* Header */}
      <div className="hoq-head b bt bl" style={at(col.idx, row.head)}>#</div>
      <div className="hoq-head b bt left" style={at(col.need, row.head)}>
        Customer needs <span className="muted">(WHATs)</span>
      </div>
      <div className="hoq-head b bt small" style={at(col.imp, row.head)}>Impor&shy;tance (1–5)</div>
      <div className="hoq-head b bt small" style={at(col.share, row.head)}>Share</div>
      {chars.map((c, i) => {
        const bc = baseChar(c.id);
        const isChanged = mark && (!bc || bc.text !== c.text);
        const content = <span className="vtext">{c.text}</span>;
        return editable ? (
          <button key={c.id} className={`hoq-char b${changed(isChanged)}`} style={at(col.char(i), row.head)} onClick={() => onEditCharacteristic?.(c.id)} title="Edit characteristic">
            {content}
          </button>
        ) : (
          <div key={c.id} className={`hoq-char b${changed(isChanged)}`} style={at(col.char(i), row.head)}>
            {content}
          </div>
        );
      })}
      {comps.map((c, j) => (
        <div key={c.id} className={`hoq-comp-head b bt${j === 0 ? ' bl' : ''}${c.id === 'meili' ? ' own' : ''}`} style={at(col.comp(j), row.head)}>
          <span className="vtext">{c.name}</span>
        </div>
      ))}

      {/* Needs */}
      {needs.map((n, k) => {
        const bn = baseNeed(n.id);
        const r = row.need(k);
        const isNew = mark && !bn;
        return (
          <div key={n.id} className="hoq-row" style={{ display: 'contents' }}>
            <div className="hoq-idx b bl" style={at(col.idx, r)}>
              <span>{k + 1}</span>
              {editable && (
                <button
                  className="row-remove"
                  aria-label={`Remove need “${n.text}”`}
                  title="Remove need"
                  onClick={() => set((h) => { h.needs = h.needs.filter((x) => x.id !== n.id); })}
                >
                  ×
                </button>
              )}
            </div>
            <div className={`hoq-need b${changed(mark && (isNew || bn!.text !== n.text))}`} style={at(col.need, r)} title={n.source ? `Source: ${n.source}` : undefined}>
              {editable ? (
                <input
                  value={n.text}
                  title={n.text}
                  aria-label={`Customer need ${k + 1}`}
                  onChange={(e) => set((h) => {
                    const x = h.needs.find((y) => y.id === n.id);
                    if (x) x.text = e.target.value;
                  })}
                />
              ) : (
                <span>{n.text}</span>
              )}
              {n.origin === 'ai' && !isNew && <span className="pill pill-ai" title={n.source ? `AI · ${n.source}` : 'Set by AI draft'}>AI</span>}
              {isNew && <span className="pill pill-team">Team</span>}
            </div>
            <div
              className={`hoq-imp b${changed(mark && bn && bn.importance !== n.importance)}`}
              style={at(col.imp, r)}
              title={mark && bn && bn.importance !== n.importance ? `AI draft: ${bn.importance}` : undefined}
            >
              {editable ? (
                <select
                  value={n.importance}
                  aria-label={`Importance of “${n.text}”`}
                  onChange={(e) => set((h) => {
                    const x = h.needs.find((y) => y.id === n.id);
                    if (x) x.importance = Number(e.target.value);
                  })}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              ) : (
                n.importance
              )}
            </div>
            <div className="hoq-share b" style={at(col.share, r)}>{pct(scores.needShare[n.id])}</div>
            {chars.map((c, i) => {
              const key = relKey(n.id, c.id);
              const value = (house.relationships[key] ?? 0) as Strength;
              const baseValue = (mark?.relationships[key] ?? 0) as Strength;
              const isChanged = mark && baseValue !== value;
              const label = `“${n.text}” × “${c.text}”: ${value || 'none'}`;
              const title = isChanged ? `${label} (AI draft: ${baseValue || 'none'})` : label;
              const cls = `hoq-rel b s${value}${changed(isChanged)}`;
              return editable ? (
                <button
                  key={c.id}
                  className={cls}
                  style={at(col.char(i), r)}
                  aria-label={label}
                  title={`${title}. Click to change, or type 9 / 3 / 1 / 0`}
                  onClick={() => set((h) => {
                    const next = nextStrength(value);
                    if (next) h.relationships[key] = next;
                    else delete h.relationships[key];
                  })}
                  onKeyDown={(e) => onStrengthKey(e, key)}
                >
                  {STRENGTH_SYMBOL[value]}
                </button>
              ) : (
                <div key={c.id} className={cls} style={at(col.char(i), r)} title={title}>
                  {STRENGTH_SYMBOL[value]}
                </div>
              );
            })}
            {comps.map((comp, j) => {
              const key = ratingKey(n.id, comp.id);
              const value = house.ratings[key];
              const isChanged = mark && mark.ratings[key] !== value;
              const label = `${comp.name} on “${n.text}”: ${value ?? 'not rated'}`;
              const cls = `hoq-rating b${j === 0 ? ' bl' : ''} r${value ?? 0}${comp.id === 'meili' ? ' own' : ''}${changed(isChanged)}`;
              return editable ? (
                <button
                  key={comp.id}
                  className={cls}
                  style={at(col.comp(j), r)}
                  aria-label={label}
                  title={`${label}. Click to change`}
                  onClick={() => set((h) => {
                    const next = nextRating(value);
                    if (next === undefined) delete h.ratings[key];
                    else h.ratings[key] = next;
                  })}
                >
                  {value ?? ''}
                </button>
              ) : (
                <div key={comp.id} className={cls} style={at(col.comp(j), r)} title={label}>
                  {value ?? ''}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Technical importance */}
      <div className="hoq-label right strong b bl" style={at('1 / span 4', row.score)}>
        Technical importance <span className="muted">(Σ importance × relationship)</span>
      </div>
      {chars.map((c, i) => (
        <div key={c.id} className={`hoq-score b${scores.top.has(c.id) ? ' top' : ''}`} style={at(col.char(i), row.score)}>
          {scores.charScore[c.id]}
        </div>
      ))}
      <div className="hoq-label right b bl" style={at('1 / span 4', row.share)}>
        Share of technical importance
      </div>
      {chars.map((c, i) => (
        <div key={c.id} className={`hoq-score b${scores.top.has(c.id) ? ' top' : ''}`} style={at(col.char(i), row.share)}>
          {pct(scores.charShare[c.id])}
        </div>
      ))}
      <div className="hoq-label right b bl" style={at('1 / span 4', row.rank)}>
        Rank <span className="muted">(orange = top 3)</span>
      </div>
      {chars.map((c, i) => (
        <div key={c.id} className={`hoq-score rank b${scores.top.has(c.id) ? ' top' : ''}`} style={at(col.char(i), row.rank)}>
          {scores.charScore[c.id] ? scores.rank[c.id] : '–'}
        </div>
      ))}
    </div>
  );
}
