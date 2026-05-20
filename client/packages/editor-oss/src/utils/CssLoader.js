
/**
 * Module: CssLoader.js
 * Purpose: Contains logic for css loader.
 */


class CssLoader {
    load(url) {
        var head = document.getElementsByTagName("head")[0];
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        head.appendChild(link);

        return new Promise(resolve => {
            link.onload = event => {
                link.onload = link.onerror = null;
                resolve(link, event);
            };
            link.onerror = event => {
                link.onload = link.onerror = null;
                console.warn(`CssLoader: ${url} loaded failed.`);
                resolve(null, event);
            };
        });
    }
}

export default CssLoader;
