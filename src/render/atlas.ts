import * as THREE from 'three';

/**
 * Sprite sayfalari. Hepsi 32x32 hucreli, satir-oncelikli indekslenen atlaslar.
 * Oyun icerigi sadece {sheet, i} ciftini bilir; boylece atlas degistiginde
 * oyun mantigi degismez.
 */
/**
 * Varlik yollari dagitim tabanina goredir; oyun hem kokte hem de GitHub
 * Pages'in /<repo>/ alt yolunda ayni sekilde calisir.
 */
const BASE = import.meta.env.BASE_URL;

export const SHEETS = {
  fish: { url: `${BASE}assets/fishes.png`, cell: 32, cols: 12, rows: 12 },
  obj: { url: `${BASE}assets/objects.png`, cell: 32, cols: 5, rows: 4 },
  gear: { url: `${BASE}assets/fishing_gear.png`, cell: 32, cols: 6, rows: 6 },
} as const;

export type SheetName = keyof typeof SHEETS;

export interface SpriteRef {
  sheet: SheetName;
  i: number;
}

const textures = new Map<SheetName, THREE.Texture>();

export function loadSheets(loader: THREE.TextureLoader): Promise<void> {
  const jobs = (Object.keys(SHEETS) as SheetName[]).map(
    (name) =>
      new Promise<void>((resolve) => {
        loader.load(SHEETS[name].url, (tex) => {
          // Pixel art: yumusatma yok, mipmap yok.
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          textures.set(name, tex);
          resolve();
        }, undefined, () => resolve());
      }),
  );
  return Promise.all(jobs).then(() => undefined);
}

/**
 * Bir atlas hucresi icin kendi UV penceresine sahip doku klonu.
 * Klonlar ayni GPU dokusunu paylasir; sadece offset/repeat farklidir.
 */
export function sheetTexture(ref: SpriteRef): THREE.Texture | null {
  const base = textures.get(ref.sheet);
  if (!base) return null;
  const meta = SHEETS[ref.sheet];
  const rows = meta.rows;
  const col = ref.i % meta.cols;
  const row = Math.floor(ref.i / meta.cols);
  const tex = base.clone();
  tex.needsUpdate = true;
  tex.repeat.set(1 / meta.cols, 1 / rows);
  // UV'nin sol-alt kokenli olmasi nedeniyle satir tersten sayilir.
  tex.offset.set(col / meta.cols, 1 - (row + 1) / rows);
  return tex;
}

/** Ayni sprite'i DOM tarafinda gostermek icin CSS kurallari. */
export function spriteCss(ref: SpriteRef, sizePx: number): string {
  const meta = SHEETS[ref.sheet];
  const col = ref.i % meta.cols;
  const row = Math.floor(ref.i / meta.cols);
  return [
    `background-image:url(${meta.url})`,
    // Tum sayfayi hucre orani kadar buyut, sonra istenen hucreye kaydir.
    `background-size:${meta.cols * sizePx}px ${meta.rows * sizePx}px`,
    `background-position:${-col * sizePx}px ${-row * sizePx}px`,
    `background-repeat:no-repeat`,
    `width:${sizePx}px`,
    `height:${sizePx}px`,
    `image-rendering:pixelated`,
  ].join(';');
}
