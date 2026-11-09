import { useProjects } from './lib/store';
import { useRoute } from './lib/router';
import { ProjectList } from './components/ProjectList';
import { ProjectView } from './components/ProjectView';

export function App() {
  const store = useProjects();
  const route = useRoute();

  return (
    <>
      <header className="app-head no-print">
        <a className="brand" href="#/">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>
            <strong>HoQ AI Matchmaker</strong>
            <span className="brand-sub">DTU × Meili Robots · student project mockup</span>
          </span>
        </a>
        <span className="demo-flag" title="Fictitious data, simulated AI">Demo data · AI simulated</span>
      </header>

      {store.saveError && <p className="alert alert-error banner no-print">{store.saveError}</p>}

      <main>
        {route.page === 'project' ? <ProjectView store={store} id={route.id} tab={route.tab} /> : <ProjectList store={store} />}
      </main>

      <footer className="app-foot no-print">
        <span>
          Mockup for the DTU course 38108 Technology & Innovation Management. Not an official Meili Robots product. Projects are
          stored only in this browser.
        </span>
        <button
          className="btn btn-link"
          onClick={() => window.confirm('Replace all projects in this browser with the example projects?') && store.resetDemo()}
        >
          Reset to example data
        </button>
      </footer>
    </>
  );
}
