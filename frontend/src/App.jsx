import { useEffect, useState } from "react";
import api from "./services/api.js";

export default function App() {
  const [health, setHealth] = useState("Checking API…");

  useEffect(() => {
    api.get("/health")
      .then((response) => setHealth(response.data.message))
      .catch(() => setHealth("API not connected yet. Start the backend."));
  }, []);

  return (
    <div className="app-shell">
      <nav className="navbar">
        <a className="brand" href="/">FairWork<span>AI</span></a>
        <span className="nav-label">Freelance work, with clarity.</span>
      </nav>

      <main className="hero">
        <p className="eyebrow">AGREEMENT · MILESTONES · TRUST</p>
        <h1>Good work deserves<br /><span>fair agreements.</span></h1>
        <p className="intro">
          Turn project briefs into clear milestones, keep scope changes transparent,
          and document every delivery.
        </p>
        <div className="hero-actions">
          <button onClick={() => alert("Project creation is the next MVP feature.")}>
            Create a project
          </button>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className="status-card">
          <span className="status-dot" />
          <div>
            <strong>Backend status</strong>
            <p>{health}</p>
          </div>
        </div>
        <section id="how-it-works" className="feature-grid">
          <article><span>01</span><h2>Lock the scope</h2><p>Turn vague requests into reviewable deliverables.</p></article>
          <article><span>02</span><h2>Track milestones</h2><p>Submit work and evidence against agreed criteria.</p></article>
          <article><span>03</span><h2>Resolve fairly</h2><p>Keep change requests and disputes documented.</p></article>
        </section>
      </main>
    </div>
  );
}
