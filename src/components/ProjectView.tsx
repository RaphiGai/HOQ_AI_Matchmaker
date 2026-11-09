import type { Project } from '../types';
import type { ProjectStore } from '../lib/store';
import { openQuestions, projectStatus } from '../lib/hoq';
import { downloadJson, slug } from '../lib/format';
import { navigate, projectHref } from '../lib/router';
import { StatusBadge } from './StatusBadge';
import { RequestTab } from './RequestTab';
import { DraftTab } from './DraftTab';
import { HouseTab } from './HouseTab';
import { ReportTab } from './ReportTab';
import { House2Tab } from './House2Tab';

export interface TabProps {
  project: Project;
  update: (fn: (p: Project) => Project) => void;
}

export function ProjectView({ store, id, tab }: { store: ProjectStore; id: string; tab: string }) {
  const project = store.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="page empty">
        <p>This project does not exist in this browser.</p>
        <a className="btn btn-primary" href="#/">Back to projects</a>
      </div>
    );
  }

  const update = (fn: (p: Project) => Project) => store.update(project.id, fn);
  const open = openQuestions(project);
  const tabs = [
    { id: 'request', label: '1 · Request & documents', badge: project.documents.length || undefined },
    { id: 'draft', label: '2 · AI draft & questions', badge: open || undefined, alert: open > 0 },
    { id: 'house', label: '3 · House of Quality', disabled: !project.house },
    { id: 'report', label: '4 · Report & PDF', disabled: !project.house },
    { id: 'house2', label: 'House 2 · Partner technologies', planned: true },
  ];
  const active = tabs.find((t) => t.id === tab && !t.disabled) ? tab : 'request';

  const remove = () => {
    if (window.confirm(`Delete “${project.name}” from this browser? This cannot be undone.`)) {
      store.remove(project.id);
      navigate('#/');
    }
  };

  return (
    <div className="page">
      <div className="project-head no-print">
        <a className="back" href="#/">← All projects</a>
        <div className="project-title">
          <div>
            <h1>{project.name}</h1>
            <p className="muted">
              {project.customer} · {project.vertical} · {project.region}
            </p>
          </div>
          <div className="project-actions">
            <StatusBadge status={projectStatus(project)} />
            {project.example && <span className="pill pill-example">Example</span>}
            <button className="btn btn-secondary btn-sm" onClick={() => downloadJson(`${slug(project.name)}.hoq.json`, project)}>
              Export JSON
            </button>
            <button className="btn btn-danger-ghost btn-sm" onClick={remove}>Delete</button>
          </div>
        </div>
        <nav className="tabs" aria-label="Project steps">
          {tabs.map((t) =>
            t.disabled ? (
              <span key={t.id} className="tab disabled" title="Create a draft first">{t.label}</span>
            ) : (
              <a key={t.id} className={`tab${active === t.id ? ' active' : ''}${t.planned ? ' planned' : ''}`} href={projectHref(project.id, t.id)} aria-current={active === t.id ? 'page' : undefined}>
                {t.label}
                {t.badge !== undefined && <span className={`tab-badge${t.alert ? ' alert' : ''}`}>{t.badge}</span>}
                {t.planned && <span className="tab-badge planned">planned</span>}
              </a>
            ),
          )}
        </nav>
      </div>

      {active === 'request' && <RequestTab project={project} update={update} />}
      {active === 'draft' && <DraftTab project={project} update={update} />}
      {active === 'house' && <HouseTab project={project} update={update} />}
      {active === 'report' && <ReportTab project={project} update={update} />}
      {active === 'house2' && <House2Tab />}
    </div>
  );
}
