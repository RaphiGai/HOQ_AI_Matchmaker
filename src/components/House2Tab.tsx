/** Placeholder for the second house of the QFD cascade (the matchmaker from the 1st presentation). */
export function House2Tab() {
  return (
    <section className="panel planned-panel">
      <h2>House 2 · Partner technologies <span className="pill pill-planned">planned</span></h2>
      <p>
        QFD works as a cascade of houses. House 1 (this project) translates customer needs into Meili’s technical characteristics.
        House 2 takes the prioritised characteristics as input and links them to partner technologies, which results in a
        recommended technology package for the integrator.
      </p>
      <div className="cascade" aria-label="QFD cascade">
        <div className="cascade-step done">
          <strong>Customer needs</strong>
          <span>from request and documents</span>
        </div>
        <span className="cascade-arrow">→</span>
        <div className="cascade-step done">
          <strong>House 1</strong>
          <span>Meili characteristics, weighted</span>
        </div>
        <span className="cascade-arrow">→</span>
        <div className="cascade-step">
          <strong>House 2</strong>
          <span>Partner technologies: sensing, network, robots, lifts</span>
        </div>
        <span className="cascade-arrow">→</span>
        <div className="cascade-step">
          <strong>Matchmaker output</strong>
          <span>Suggested package, conflicts, open questions</span>
        </div>
      </div>
      <p className="muted">Needs input from Meili: partner categories and which partners are typically combined.</p>
    </section>
  );
}
