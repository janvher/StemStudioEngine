import {Route, Routes, useLocation} from "react-router-dom";

import {Footer} from "./components/Footer";
import {Nav} from "./components/Nav";
import {Docs} from "./routes/Docs";
import {Landing} from "./routes/Landing";
import {NotFound} from "./routes/NotFound";
import {Playground} from "./routes/Playground";

export function App() {
    // The playground route renders its own `playground-bar`, so the marketing
    // nav would just duplicate it. Hide the nav there — the playground bar and
    // the footer both still carry the GitHub link.
    const {pathname} = useLocation();
    const isPlayground = pathname === "/playground" || pathname.startsWith("/playground/");

    return (
        <div className="site-shell">
            {!isPlayground && <Nav />}
            <main className="site-main">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/playground" element={<Playground />} />
                    <Route path="/docs" element={<Docs />} />
                    <Route path="/docs/:slug" element={<Docs />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}
