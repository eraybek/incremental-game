/**
 * Resolves a path inside `public/` against the deploy base.
 *
 * Asset URLs are built at runtime (`new Image().src = ...`), so Vite cannot
 * rewrite them the way it rewrites paths in HTML and imports. On GitHub Pages
 * the site lives under a repository subpath, so a root-absolute `/assets/x.png`
 * would resolve outside the site. Everything must go through this helper.
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
