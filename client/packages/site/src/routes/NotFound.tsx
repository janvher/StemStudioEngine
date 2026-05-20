import {Link} from "react-router-dom";

export function NotFound() {
    return (
        <div className="container notfound">
            <h1>404</h1>
            <p>That page doesn&apos;t exist.</p>
            <Link to="/" className="btn btn-primary">
                Back to home
            </Link>
        </div>
    );
}
