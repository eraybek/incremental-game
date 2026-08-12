const cache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): HTMLImageElement {
  const existing = cache.get(src);
  if (existing) return existing;
  const img = new Image();
  img.src = src;
  cache.set(src, img);
  return img;
}

export function preload(paths: string[]): Promise<void> {
  return Promise.all(
    paths.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = loadImage(src);
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve());
          img.addEventListener('error', () => resolve());
        }),
    ),
  ).then(() => undefined);
}
