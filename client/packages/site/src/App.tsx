import {Route, Routes} from "react-router-dom";

import {Footer} from "./components/Footer";
import {Nav} from "./components/Nav";
import {Docs} from "./routes/Docs";
import {Landing} from "./routes/Landing";
import {NotFound} from "./routes/NotFound";
import {Playground} from "./routes/Playground";

export function App() {
    return (
        <div className="site-shell">
            <Nav />
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
