import {Link} from "react-router-dom";

import {FEATURES} from "../content/features";

export function FeatureGrid() {
    return (
        <section className="section" id="features">
            <div className="container">
                <div className="section-head">
                    <h2>Everything you need to ship a 3D scene.</h2>
                    <p>
                        A coherent stack from the editor down to the runtime — designed to
                        scale from a weekend prototype to a published game.
                    </p>
                </div>
                <div className="feature-grid">
                    {FEATURES.map((f) => (
                        <div className="feature" key={f.title}>
                            <div className="feature-icon" aria-hidden>{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.body}</p>
                            {f.href ? (
                                <Link to={f.href} className="feature-link">
                                    Learn more →
                                </Link>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
