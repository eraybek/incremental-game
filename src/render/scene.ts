import * as THREE from 'three';
import { BOBBER_SPRITE, FISH, ZONES } from '../game/content';
import { BITE_WINDOW, clamp } from '../game/state';
import type { Game } from '../game/state';
import type { Rod } from '../game/types';
import { loadSheets, sheetTexture, type SpriteRef } from './atlas';

/** Su yuzeyinin ekrandaki dikey yeri (dunya birimi; ekran yuksekligi = 1). */
const SURFACE_Y = 0.34;
const BOTTOM_Y = -0.5;
/** Oltanin geldigi nokta: ekranin sol ust disi. */
const ORIGIN = new THREE.Vector2(-0.62, 0.44);

const DECOR_COUNT = 16;
const BUBBLE_COUNT = 90;

/** Bir sprite icin duz, isiktan etkilenmeyen dikdortgen. */
function spriteMesh(ref: SpriteRef, size: number): THREE.Mesh {
  const tex = sheetTexture(ref);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.02,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(size);
  return mesh;
}

interface Decor {
  mesh: THREE.Mesh;
  depth: number;
  speed: number;
  /** Yuzme salinimi icin faz. */
  phase: number;
  /** Bu sprite hangi derinlik icin secildi; bant degisince yenilenir. */
  band: number;
}

interface FloatText {
  el: HTMLDivElement;
  life: number;
  x: number;
  y: number;
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.OrthographicCamera;
  readonly scene = new THREE.Scene();

  /** Ekranda gorunen en buyuk derinlik; maxDepth'i yumusak takip eder. */
  private visibleDepth = 40;
  private aspect = 1;

  private water!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;
  private sky!: THREE.Mesh;
  private beams!: THREE.Mesh;
  private bubbles!: THREE.Points;
  private decor: Decor[] = [];

  private lines: THREE.Line[] = [];
  private bobbers: THREE.Mesh[] = [];
  private catches: THREE.Mesh[] = [];
  private aimRing!: THREE.Mesh;
  private aimFill!: THREE.Mesh;

  private floats: FloatText[] = [];
  private floatLayer: HTMLElement;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, floatLayer: HTMLElement) {
    this.floatLayer = floatLayer;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    // Mobilde piksel yogunlugunu sinirla; pixel art zaten keskin.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -100, 100);
    this.camera.position.z = 10;
  }

  async init(): Promise<void> {
    await loadSheets(new THREE.TextureLoader());
    this.buildSky();
    this.buildWater();
    this.buildBeams();
    this.buildBubbles();
    this.buildDecor();
    this.buildAim();
    this.resize();
  }

  // --- Koordinat donusumleri ----------------------------------------------

  private get halfWidth(): number {
    return 0.5 * this.aspect;
  }

  depthToY(depth: number): number {
    const t = clamp(depth / this.visibleDepth, 0, 1.2);
    return SURFACE_Y - t * (SURFACE_Y - BOTTOM_Y);
  }

  yToDepth(y: number): number {
    const t = (SURFACE_Y - y) / (SURFACE_Y - BOTTOM_Y);
    return t * this.visibleDepth;
  }

  /** rod.x (-1..1) -> dunya x. */
  rodToWorldX(x: number): number {
    return x * this.halfWidth * 0.82;
  }

  /** Ekran pikselinden nisan noktasi (x: -1..1, depth: metre). */
  pointerToAim(clientX: number, clientY: number): { x: number; depth: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    const worldX = (nx - 0.5) * this.aspect;
    const worldY = 0.5 - ny;
    return {
      x: clamp(worldX / (this.halfWidth * 0.82), -1, 1),
      depth: Math.max(0, this.yToDepth(worldY)),
    };
  }

  /** Dunya noktasini ekran pikseline cevirir; DOM katmani icin. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + (wx / this.aspect + 0.5) * rect.width,
      y: rect.top + (0.5 - wy) * rect.height,
    };
  }

  // --- Sahne kurulumu ------------------------------------------------------

  private buildSky(): void {
    const mat = new THREE.ShaderMaterial({
      depthTest: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec3 top = vec3(0.29, 0.55, 0.72);
          vec3 horizon = vec3(0.62, 0.80, 0.86);
          gl_FragColor = vec4(mix(horizon, top, pow(vUv.y, 0.7)), 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.sky.renderOrder = -20;
    this.scene.add(this.sky);
  }

  private buildWater(): void {
    // ZONES renklerini shader'a sabit dizi olarak tasi.
    const colors = ZONES.map((z) => new THREE.Color(z.water));
    this.waterMat = new THREE.ShaderMaterial({
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        // Erisilebilir derinligin gorunur derinlige orani.
        uReach: { value: 0.85 },
        uC0: { value: colors[0] },
        uC1: { value: colors[1] },
        uC2: { value: colors[2] },
        uC3: { value: colors[3] },
        uC4: { value: colors[4] },
        uC5: { value: colors[5] },
        /** Gorunur derinligin hangi mutlak derinlige denk geldigi. */
        uDepthSpan: { value: 40 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime, uReach, uDepthSpan;
        uniform vec3 uC0, uC1, uC2, uC3, uC4, uC5;

        // Mutlak derinligi bant renklerine cevirir.
        vec3 zoneColor(float d) {
          if (d < 25.0)   return mix(uC0, uC1, smoothstep(0.0, 25.0, d));
          if (d < 70.0)   return mix(uC1, uC2, smoothstep(25.0, 70.0, d));
          if (d < 180.0)  return mix(uC2, uC3, smoothstep(70.0, 180.0, d));
          if (d < 450.0)  return mix(uC3, uC4, smoothstep(180.0, 450.0, d));
          if (d < 1200.0) return mix(uC4, uC5, smoothstep(450.0, 1200.0, d));
          return uC5;
        }

        void main() {
          float t = 1.0 - vUv.y;               // 0 = yuzey, 1 = en alt
          float depth = t * uDepthSpan;
          vec3 col = zoneColor(depth);

          // Isik yuzeye yakin yerde daha parlak.
          col *= mix(1.18, 0.72, smoothstep(0.0, 0.55, t));

          // Erisilemez bolge: misinanin yetmedigi derinlik kararir.
          float beyond = smoothstep(uReach, uReach + 0.04, t);
          col = mix(col, col * 0.35, beyond);

          // Erisim sinirinda ince bir esik cizgisi.
          float edge = smoothstep(0.006, 0.0, abs(t - uReach));
          col += edge * 0.20;

          // Cok hafif dikey dalgalanma; su durgun gorunmesin.
          col += 0.012 * sin(vUv.x * 26.0 + uTime * 0.7 + t * 8.0);

          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.waterMat);
    this.water.renderOrder = -19;
    this.scene.add(this.water);
  }

  private buildBeams(): void {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          // Egik, yavasca kayan isik huzmeleri.
          float x = vUv.x * 6.0 + vUv.y * 2.2 + uTime * 0.10;
          float beams = pow(max(0.0, sin(x * 3.14159)), 12.0);
          float fade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          gl_FragColor = vec4(vec3(0.75, 0.92, 1.0) * beams * fade * 0.30, beams * fade * 0.30);
        }`,
    });
    this.beams = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    this.beams.renderOrder = -18;
    this.scene.add(this.beams);
  }

  private buildBubbles(): void {
    const positions = new Float32Array(BUBBLE_COUNT * 3);
    const speeds = new Float32Array(BUBBLE_COUNT);
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = Math.random() * (SURFACE_Y - BOTTOM_Y) + BOTTOM_Y;
      positions[i * 3 + 2] = 0;
      speeds[i] = 0.012 + Math.random() * 0.03;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    const mat = new THREE.PointsMaterial({
      color: 0xcfeaf6,
      size: 0.006,
      transparent: true,
      opacity: 0.4,
      depthTest: false,
      sizeAttenuation: false,
    });
    this.bubbles = new THREE.Points(geo, mat);
    this.bubbles.renderOrder = -17;
    this.scene.add(this.bubbles);
  }

  private buildDecor(): void {
    for (let i = 0; i < DECOR_COUNT; i++) {
      const mesh = spriteMesh(FISH[0].sprite, 0.05);
      mesh.renderOrder = -16;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      (mesh.material as THREE.MeshBasicMaterial).transparent = true;
      this.scene.add(mesh);
      this.decor.push({
        mesh,
        depth: 0,
        speed: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.05),
        phase: Math.random() * Math.PI * 2,
        band: -1,
      });
      mesh.position.x = (Math.random() - 0.5) * 2;
    }
  }

  private buildAim(): void {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.75, depthTest: false,
    });
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.030, 0.034, 32), ringMat);
    this.aimRing.renderOrder = 20;
    this.aimRing.visible = false;
    this.scene.add(this.aimRing);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xffe08a, transparent: true, opacity: 0.85, depthTest: false,
    });
    this.aimFill = new THREE.Mesh(new THREE.CircleGeometry(0.028, 32), fillMat);
    this.aimFill.renderOrder = 21;
    this.aimFill.visible = false;
    this.scene.add(this.aimFill);
  }

  /** Olta sayisi degistiginde misina/samandira nesnelerini esitler. */
  private syncRods(count: number): void {
    while (this.lines.length < count) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
      ]);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xeaf4fa, transparent: true, opacity: 0.55, depthTest: false }),
      );
      line.renderOrder = 8;
      line.visible = false;
      this.scene.add(line);
      this.lines.push(line);

      const bobber = spriteMesh(BOBBER_SPRITE, 0.038);
      bobber.renderOrder = 10;
      bobber.visible = false;
      this.scene.add(bobber);
      this.bobbers.push(bobber);

      const katch = spriteMesh(FISH[0].sprite, 0.06);
      katch.renderOrder = 11;
      katch.visible = false;
      this.scene.add(katch);
      this.catches.push(katch);
    }
  }

  // --- Boyutlandirma -------------------------------------------------------

  resize(): void {
    const el = this.renderer.domElement;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    this.aspect = w / h;
    this.renderer.setSize(w, h, false);
    this.camera.left = -this.halfWidth;
    this.camera.right = this.halfWidth;
    this.camera.top = 0.5;
    this.camera.bottom = -0.5;
    this.camera.updateProjectionMatrix();

    const fullW = this.aspect + 0.02;
    this.sky.scale.set(fullW, 0.5 - SURFACE_Y + 0.02, 1);
    this.sky.position.set(0, (0.5 + SURFACE_Y) / 2, 0);

    const waterH = SURFACE_Y - BOTTOM_Y;
    this.water.scale.set(fullW, waterH, 1);
    this.water.position.set(0, (SURFACE_Y + BOTTOM_Y) / 2, 0);
    this.beams.scale.copy(this.water.scale);
    this.beams.position.copy(this.water.position);
  }

  // --- Cerceve -------------------------------------------------------------

  render(game: Game, dt: number, aim: { active: boolean; x: number; depth: number; progress: number }): void {
    this.time += dt;
    this.syncRods(game.rods.length);

    // Gorunur derinlik, erisilebilir derinligi yumusak takip eder.
    const target = game.maxDepth * 1.18;
    this.visibleDepth += (target - this.visibleDepth) * Math.min(1, dt * 2.2);

    this.waterMat.uniforms.uTime.value = this.time;
    this.waterMat.uniforms.uDepthSpan.value = this.visibleDepth;
    this.waterMat.uniforms.uReach.value = clamp(
      (game.maxDepth / this.visibleDepth) * ((SURFACE_Y - BOTTOM_Y) / (SURFACE_Y - BOTTOM_Y)),
      0.05, 0.995,
    );
    (this.beams.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;

    this.updateBubbles(dt);
    this.updateDecor(game, dt);
    this.updateRods(game);
    this.updateAim(aim);
    this.updateFloats(dt);

    this.renderer.render(this.scene, this.camera);
  }

  private updateBubbles(dt: number): void {
    const pos = this.bubbles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const spd = this.bubbles.geometry.getAttribute('aSpeed') as THREE.BufferAttribute;
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      let y = pos.getY(i) + spd.getX(i) * dt;
      let x = pos.getX(i) + Math.sin(this.time * 1.4 + i) * 0.0004;
      if (y > SURFACE_Y) {
        y = BOTTOM_Y;
        x = (Math.random() - 0.5) * this.aspect;
      }
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
  }

  private updateDecor(game: Game, dt: number): void {
    const reach = game.maxDepth;
    for (let i = 0; i < this.decor.length; i++) {
      const d = this.decor[i];
      // Sprite'i oyuncunun ulasabildigi derinlige gore sec; bant degisince yenile.
      const band = Math.floor(Math.log2(Math.max(2, reach)));
      if (d.band !== band) {
        d.band = band;
        d.depth = Math.random() * reach * 1.05;
        const pool = game.speciesAt(d.depth);
        const pick = pool[Math.floor(Math.random() * pool.length)] ?? FISH[0];
        const mat = d.mesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = sheetTexture(pick.sprite);
        mat.needsUpdate = true;
        d.mesh.scale.setScalar(0.035 + pick.size * 0.022);
      }
      d.mesh.position.x += d.speed * dt;
      const limit = this.halfWidth + 0.12;
      if (d.mesh.position.x > limit) d.mesh.position.x = -limit;
      if (d.mesh.position.x < -limit) d.mesh.position.x = limit;
      // Sprite'lar saga bakiyor; yon degisince yatay cevir.
      d.mesh.scale.x = Math.abs(d.mesh.scale.x) * (d.speed > 0 ? 1 : -1);
      const bob = Math.sin(this.time * 0.8 + d.phase) * 0.008;
      d.mesh.position.y = this.depthToY(d.depth) + bob;
      d.mesh.visible = d.mesh.position.y < SURFACE_Y - 0.01;
    }
  }

  private updateRods(game: Game): void {
    for (let i = 0; i < this.lines.length; i++) {
      const rod = game.rods[i];
      const line = this.lines[i];
      const bobber = this.bobbers[i];
      const katch = this.catches[i];
      if (!rod || rod.phase === 'idle') {
        line.visible = false;
        bobber.visible = false;
        katch.visible = false;
        continue;
      }

      const pos = this.rodPosition(rod);
      line.visible = true;
      bobber.visible = true;

      // Samandira suda hafifce salinir; isirmada sert titrer.
      let wobble = Math.sin(this.time * 2.4 + i) * 0.004;
      if (rod.phase === 'bite') {
        wobble = Math.sin(this.time * 40) * 0.012;
      }
      bobber.position.set(pos.x, pos.y + wobble, 0);
      bobber.scale.setScalar(rod.phase === 'bite' ? 0.046 : 0.038);

      // Misina: kaynaktan samandiraya, hafif sarkmali.
      const geo = line.geometry as THREE.BufferGeometry;
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      const ox = ORIGIN.x * this.aspect;
      const midX = (ox + pos.x) / 2;
      const midY = (ORIGIN.y + pos.y) / 2 - 0.03;
      p.setXYZ(0, ox, ORIGIN.y, 0);
      p.setXYZ(1, midX, midY, 0);
      p.setXYZ(2, pos.x, pos.y + wobble, 0);
      p.needsUpdate = true;
      geo.computeBoundingSphere();

      // Yakalanan sey sadece yukari sarilirken gorunur.
      if (rod.phase === 'reeling' && rod.hooked) {
        const mat = katch.material as THREE.MeshBasicMaterial;
        const want = rod.hooked.species.sprite;
        if (katch.userData.spriteKey !== `${want.sheet}:${want.i}`) {
          katch.userData.spriteKey = `${want.sheet}:${want.i}`;
          mat.map?.dispose();
          mat.map = sheetTexture(want);
          mat.needsUpdate = true;
        }
        katch.visible = true;
        katch.position.set(pos.x, pos.y - 0.035, 0);
        const s = 0.03 + rod.hooked.species.size * 0.022;
        katch.scale.set(s, s, 1);
        katch.rotation.z = Math.sin(this.time * 9) * 0.25;
      } else {
        katch.visible = false;
      }
    }
  }

  /** Oltanin su anki dunya konumu; ucus fazinda yay cizer. */
  private rodPosition(rod: Rod): THREE.Vector2 {
    const targetX = this.rodToWorldX(rod.x);
    if (rod.phase === 'flying') {
      const t = clamp(rod.timer / rod.flightTime, 0, 1);
      const ox = ORIGIN.x * this.aspect;
      // Quadratic bezier: kaynak -> tepe -> hedef yuzey noktasi.
      const cx = (ox + targetX) / 2;
      const cy = ORIGIN.y + 0.16;
      const mt = 1 - t;
      return new THREE.Vector2(
        mt * mt * ox + 2 * mt * t * cx + t * t * targetX,
        mt * mt * ORIGIN.y + 2 * mt * t * cy + t * t * SURFACE_Y,
      );
    }
    return new THREE.Vector2(targetX, this.depthToY(rod.depth));
  }

  private updateAim(aim: { active: boolean; x: number; depth: number; progress: number }): void {
    this.aimRing.visible = aim.active;
    this.aimFill.visible = aim.active;
    if (!aim.active) return;
    const x = this.rodToWorldX(aim.x);
    const y = this.depthToY(aim.depth);
    this.aimRing.position.set(x, y, 0);
    this.aimFill.position.set(x, y, 0);
    this.aimFill.scale.setScalar(clamp(aim.progress, 0, 1));
    (this.aimFill.material as THREE.MeshBasicMaterial).opacity = 0.35 + aim.progress * 0.5;
  }

  // --- Yuzen yazilar -------------------------------------------------------

  /** Dunya konumunda yukari suzulen bir yazi olusturur. */
  spawnFloat(text: string, className: string, worldX: number, worldY: number): void {
    const el = document.createElement('div');
    el.className = `float ${className}`;
    el.textContent = text;
    this.floatLayer.appendChild(el);
    this.floats.push({ el, life: 0, x: worldX, y: worldY });
  }

  /**
   * Bir oltanin su anki konumunda yazi olusturur. Ayni anda birden fazla olta
   * yuzeye vardiginda yazilar ust uste binmesin diye indekse gore kaydirilir.
   */
  spawnFloatAtRod(rod: Rod, text: string, className: string): void {
    const p = this.rodPosition(rod);
    const stagger = (rod.index % 3) * 0.035;
    // Yuzeye varan olta gokyuzunde yazi birakmasin; suyun icinde kalsin.
    const y = Math.min(p.y, SURFACE_Y - 0.02) - stagger;
    this.spawnFloat(text, className, p.x, y);
  }

  private updateFloats(dt: number): void {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life += dt;
      f.y += dt * 0.06;
      const s = this.worldToScreen(f.x, f.y);
      f.el.style.transform = `translate(-50%, -50%) translate(${s.x}px, ${s.y}px)`;
      f.el.style.opacity = String(clamp(1 - f.life / 1.4, 0, 1));
      if (f.life > 1.4) {
        f.el.remove();
        this.floats.splice(i, 1);
      }
    }
  }

  /** Isirma penceresinin gorsel ipucu icin: dokunusa en yakin isiran olta. */
  nearestBiting(game: Game, clientX: number, clientY: number): Rod | null {
    const biting = game.bitingRods();
    if (biting.length === 0) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    // Ekranin kisa kenarinin %14'u kadar tolerans; mobilde parmak icin genis.
    const tol = Math.min(rect.width, rect.height) * 0.14;
    let best: Rod | null = null;
    let bestD = Infinity;
    for (const rod of biting) {
      const p = this.rodPosition(rod);
      const s = this.worldToScreen(p.x, p.y);
      const d = Math.hypot(s.x - clientX, s.y - clientY);
      if (d < bestD) {
        bestD = d;
        best = rod;
      }
    }
    return bestD <= tol ? best : null;
  }

  /** Isirma penceresinin kalan orani; UI ipucu icin. */
  static biteProgress(rod: Rod): number {
    return clamp(1 - rod.timer / BITE_WINDOW, 0, 1);
  }
}
