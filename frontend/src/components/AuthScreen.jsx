export default function AuthScreen({
  mode,
  form,
  error,
  submitting,
  onModeChange,
  onFieldChange,
  onSubmit
}) {
  const isRegistering = mode === "register";

  return (
    <main className="auth-page">
      <header className="topbar">
        <a className="brand" href="/">FairWork<span>AI</span></a>
        <span className="topbar-note">Freelance work, with clarity.</span>
      </header>

      <section className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">AGREEMENT · MILESTONES · TRUST</p>
          <h1>Good work deserves <span>fair agreements.</span></h1>
          <p className="intro-copy">
            Make expectations clear, keep project details in one place, and build better working relationships.
          </p>
          <div className="trust-note">
            <span className="trust-icon" aria-hidden="true">✦</span>
            <p>Clear terms. Shared expectations. Better freelance work.</p>
          </div>
        </div>

        <section className="auth-card" aria-labelledby="form-title">
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegistering}
              className={`auth-tab${!isRegistering ? " is-active" : ""}`}
              onClick={() => onModeChange("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegistering}
              className={`auth-tab${isRegistering ? " is-active" : ""}`}
              onClick={() => onModeChange("register")}
            >
              Create account
            </button>
          </div>

          <div className="form-heading">
            <p className="eyebrow">{isRegistering ? "GET STARTED" : "WELCOME BACK"}</p>
            <h2 id="form-title">{isRegistering ? "Create your account" : "Log in to FairWork"}</h2>
            <p>{isRegistering ? "Choose how you’ll use FairWork." : "Enter your details to continue."}</p>
          </div>

          <form onSubmit={onSubmit}>
            {isRegistering && (
              <>
                <label className="field-label" htmlFor="name">Full name</label>
                <input
                  autoComplete="name"
                  className="form-input"
                  id="name"
                  maxLength={100}
                  name="name"
                  onChange={onFieldChange}
                  placeholder="Your name"
                  required
                  value={form.name}
                />
              </>
            )}

            <label className="field-label" htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              className="form-input"
              id="email"
              name="email"
              onChange={onFieldChange}
              placeholder="you@example.com"
              required
              type="email"
              value={form.email}
            />

            <label className="field-label" htmlFor="password">Password</label>
            <input
              autoComplete={isRegistering ? "new-password" : "current-password"}
              className="form-input"
              id="password"
              minLength={8}
              name="password"
              onChange={onFieldChange}
              placeholder={isRegistering ? "At least 8 characters" : "Your password"}
              required
              type="password"
              value={form.password}
            />

            {isRegistering && (
              <fieldset className="role-picker">
                <legend>I’m joining as a</legend>
                <label className={`role-option${form.role === "client" ? " is-selected" : ""}`}>
                  <input
                    checked={form.role === "client"}
                    name="role"
                    onChange={onFieldChange}
                    type="radio"
                    value="client"
                  />
                  <span className="role-symbol" aria-hidden="true">◈</span>
                  <span><strong>Client</strong><small>Hiring for a project</small></span>
                </label>
                <label className={`role-option${form.role === "freelancer" ? " is-selected" : ""}`}>
                  <input
                    checked={form.role === "freelancer"}
                    name="role"
                    onChange={onFieldChange}
                    type="radio"
                    value="freelancer"
                  />
                  <span className="role-symbol" aria-hidden="true">✳</span>
                  <span><strong>Freelancer</strong><small>Working on projects</small></span>
                </label>
              </fieldset>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="button button-primary submit-button" disabled={submitting} type="submit">
              {submitting ? "Please wait…" : isRegistering ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="switch-prompt">
            {isRegistering ? "Already have an account?" : "New to FairWork?"}{" "}
            <button
              className="text-button"
              onClick={() => onModeChange(isRegistering ? "login" : "register")}
              type="button"
            >
              {isRegistering ? "Log in" : "Create an account"}
            </button>
          </p>
        </section>
      </section>
      <footer className="page-footer">Built for fair, transparent freelance work.</footer>
    </main>
  );
}
