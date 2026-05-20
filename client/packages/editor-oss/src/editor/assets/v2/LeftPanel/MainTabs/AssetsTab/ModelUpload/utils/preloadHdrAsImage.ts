// Preload hack without <link>: request as <img> (sec-fetch-dest=image),
// then HDRLoader will typically hit the cache.
export const preloadHdrAsImage = (url: string) =>
    new Promise<void>(resolve => {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = img.onerror = () => resolve();
            img.src = url;
        } catch {
            resolve();
        }
    });
    