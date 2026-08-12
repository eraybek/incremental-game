import * as THREE from 'three';
import { BOBBER_SPRITE, FISH, ZONES } from '../game/content';
import { clamp } from '../game/state';
import type { Game } from '../game/state';
import type { Rod } from '../game/types';
import { loadSheets, sheetTexture, type SpriteRef } from './atlas';

/**
 * Su yuzeyi ekranin en ustunde; sahnenin tamami su alti. Gokyuzu serit
 * cizilmez - oyunun tamami su altinda gectigi icin dikey alani yiyordu.
 */
const SURFACE_Y = 0.5;
const BOTTOM_Y = -0.5;
/** Normalize x (-1..1) -> dunya x carpani. Balik ve kanca ayni olcegi paylasir. */
const X_MAP = 0.9;

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
  private beams!: THREE.Mesh;
  private bubbles!: THREE.Points;

  /** Yuzen balik/cop gorselleri; game.swimmers ile esitlenir. */
  private swimmerMeshes: THREE.Mesh[] = [];

  private lines: THREE.Line[] = [];
  private hooks: THREE.Mesh[] = [];
  private catches: THREE.Mesh[] = [];
  private grabRings: THREE.Mesh[] = [];
  private boats: THREE.Mesh[] = [];
  private focusRing!: THREE.Mesh;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -100, 100);
    this.camera.position.z = 10;
  }

  async init(): Promise<void> {
    await loadSheets(new THREE.TextureLoader());
    this.buildWater();
    this.buildBeams();
    this.buildBubbles();
    this.buildFocusRing();
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

  /** Normalize x (-1..1) -> dunya x. */
  normToWorldX(x: number): number {
    return x * this.halfWidth * X_MAP;
  }

  /** Ekran pikselinden nisan noktasi (x: -1..1, depth: metre). */
  pointerToAim(clientX: number, clientY: number): { x: number; depth: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    const worldX = (nx - 0.5) * this.aspect;
    const worldY = 0.5 - ny;
    return {
      x: clamp(worldX / (this.halfWidth * X_MAP), -1, 1),
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

  private buildWater(): void {
    const colors = ZONES.map((z) => new THREE.Color(z.water));
    this.waterMat = new THREE.ShaderMaterial({
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uReach: { value: 0.85 },
        uC0: { value: colors[0] },
        uC1: { value: colors[1] },
        uC2: { value: colors[2] },
        uC3: { value: colors[3] },
        uC4: { value: colors[4] },
        uC5: { value: colors[5] },
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

        vec3 zoneColor(float d) {
          if (d < 25.0)   return mix(uC0, uC1, smoothstep(0.0, 25.0, d));
          if (d < 70.0)   return mix(uC1, uC2, smoothstep(25.0, 70.0, d));
          if (d < 180.0)  return mix(uC2, uC3, smoothstep(70.0, 180.0, d));
          if (d < 450.0)  return mix(uC3, uC4, smoothstep(180.0, 450.0, d));
          if (d < 1200.0) return mix(uC4, uC5, smoothstep(450.0, 1200.0, d));
          return uC5;
        }

        void main() {
          float t = 1.0 - vUv.y;
          float depth = t * uDepthSpan;
          vec3 col = zoneColor(depth);
          col *= mix(1.18, 0.72, smoothstep(0.0, 0.55, t));
          float beyond = smoothstep(uReach, uReach + 0.04, t);
          col = mix(col, col * 0.35, beyond);
          float edge = smoothstep(0.006, 0.0, abs(t - uReach));
          col += edge * 0.20;
          col += 0.012 * sin(vUv.x * 26.0 + uTime * 0.7 + t * 8.0);
          float wave = 0.004 * sin(vUv.x * 34.0 - uTime * 1.6)
                     + 0.003 * sin(vUv.x * 61.0 + uTime * 2.3);
          float surf = smoothstep(0.030 + wave, 0.0, t);
          col = mix(col, vec3(0.86, 0.95, 1.0), surf * 0.55);
          float foam = smoothstep(0.012 + wave, 0.004 + wave, t)
                     * smoothstep(0.0, 0.006, t);
          col += foam * 0.35;
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

  private buildFocusRing(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe08a, transparent: true, opacity: 0.9, depthTest: false,
    });
    this.focusRing = new THREE.Mesh(new THREE.RingGeometry(0.026, 0.032, 24), mat);
    this.focusRing.renderOrder = 22;
    this.focusRing.visible = false;
    this.scene.add(this.focusRing);
  }

  /** Olta sayisi degistiginde hat/kanca/yakalama nesnelerini esitler. */
  private syncRods(count: number): void {
    while (this.lines.length < count) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(), new THREE.Vector3(),
      ]);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xeaf4fa, transparent: true, opacity: 0.5, depthTest: false }),
      );
      line.renderOrder = 8;
      line.visible = false;
      this.scene.add(line);
      this.lines.push(line);

      const hook = spriteMesh(BOBBER_SPRITE, 0.036);
      hook.renderOrder = 10;
      hook.visible = false;
      this.scene.add(hook);
      this.hooks.push(hook);

      const katch = spriteMesh(FISH[0].sprite, 0.06);
      katch.renderOrder = 11;
      katch.visible = false;
      this.scene.add(katch);
      this.catches.push(katch);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x8fe0ff, transparent: true, opacity: 0.35, depthTest: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 28), ringMat);
      ring.renderOrder = 9;
      ring.visible = false;
      this.scene.add(ring);
      this.grabRings.push(ring);

      // Tekne: yuzeyde ufak bir gorsel imleç (techizat sprite'i).
      const boat = spriteMesh({ sheet: 'gear', i: 1 }, 0.05);
      boat.renderOrder = 12;
      boat.visible = false;
      this.scene.add(boat);
      this.boats.push(boat);
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
    const waterH = SURFACE_Y - BOTTOM_Y;
    this.water.scale.set(fullW, waterH, 1);
    this.water.position.set(0, (SURFACE_Y + BOTTOM_Y) / 2, 0);
    this.beams.scale.copy(this.water.scale);
    this.beams.position.copy(this.water.position);
  }

  // --- Cerceve -------------------------------------------------------------

  render(game: Game, dt: number): void {
    this.time += dt;
    this.syncRods(game.rods.length);

    const target = game.maxDepth * 1.18;
    this.visibleDepth += (target - this.visibleDepth) * Math.min(1, dt * 2.2);

    this.waterMat.uniforms.uTime.value = this.time;
    this.waterMat.uniforms.uDepthSpan.value = this.visibleDepth;
    this.waterMat.uniforms.uReach.value = clamp(game.maxDepth / this.visibleDepth, 0.05, 0.995);
    (this.beams.material as THREE.ShaderMaterial).uniforms.uTime.value = this.time;

    this.updateBubbles(dt);
    this.updateSwimmers(game);
    this.updateRods(game);
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

  /** Yuzen balik/cop gorsellerini game.swimmers'a gore konumlar. */
  private updateSwimmers(game: Game): void {
    // Havuzu esitle.
    while (this.swimmerMeshes.length < game.swimmers.length) {
      const mesh = spriteMesh(FISH[0].sprite, 0.05);
      mesh.renderOrder = -14;
      this.scene.add(mesh);
      this.swimmerMeshes.push(mesh);
    }
    for (let i = 0; i < this.swimmerMeshes.length; i++) {
      const mesh = this.swimmerMeshes[i];
      const s = game.swimmers[i];
      if (!s) { mesh.visible = false; continue; }
      const want = s.species.sprite;
      const key = `${want.sheet}:${want.i}`;
      if (mesh.userData.spriteKey !== key) {
        mesh.userData.spriteKey = key;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.map = sheetTexture(want);
        mat.needsUpdate = true;
      }
      const bob = Math.sin(this.time * 0.9 + s.phase) * 0.008;
      const y = this.depthToY(s.depth) + bob;
      mesh.position.set(this.normToWorldX(s.x), y, 0);
      const size = 0.036 + s.species.size * 0.022;
      // Sprite'lar saga bakiyor; sola giderken yatay cevir.
      mesh.scale.set(size * (s.vx < 0 ? -1 : 1), size, 1);
      mesh.visible = y < SURFACE_Y - 0.01;
    }
  }

  private updateRods(game: Game): void {
    this.focusRing.visible = false;
    for (let i = 0; i < this.lines.length; i++) {
      const rod = game.rods[i];
      const line = this.lines[i];
      const hook = this.hooks[i];
      const katch = this.catches[i];
      const ring = this.grabRings[i];
      const boat = this.boats[i];
      if (!rod) {
        line.visible = hook.visible = katch.visible = ring.visible = boat.visible = false;
        continue;
      }

      const bx = this.normToWorldX(rod.homeX);
      const hx = this.normToWorldX(rod.hookX);

      // Tekne her zaman yuzeyde gorunur.
      boat.visible = true;
      boat.position.set(bx, SURFACE_Y - 0.03 + Math.sin(this.time * 1.6 + i) * 0.006, 0);

      // Odak halkasi: en son manuel odaklanan oltanin teknesinde.
      if (i === game.focusIndex) {
        this.focusRing.visible = true;
        this.focusRing.position.copy(boat.position);
      }

      if (rod.phase === 'idle') {
        line.visible = hook.visible = katch.visible = ring.visible = false;
        continue;
      }

      const hookY = this.depthToY(rod.depth);
      const wobble = Math.sin(this.time * 2.4 + i) * 0.003;
      hook.visible = true;
      hook.position.set(hx, hookY + wobble, 0);

      // Misina: tekneden (yuzey) kancaya (hook sutunu) uzanir.
      const geo = line.geometry as THREE.BufferGeometry;
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      p.setXYZ(0, bx, SURFACE_Y - 0.02, 0);
      p.setXYZ(1, hx, hookY, 0);
      p.needsUpdate = true;
      geo.computeBoundingSphere();
      line.visible = true;

      // Kapma yariçapi halkasi yalnizca inerken gorunur.
      if (rod.phase === 'dropping') {
        const r = game.grabRadius * this.halfWidth * X_MAP;
        ring.visible = true;
        ring.position.set(hx, hookY, 0);
        ring.scale.setScalar(r);
      } else {
        ring.visible = false;
      }

      // Yakalanan sey yukari sarilirken gorunur.
      if (rod.phase === 'reeling' && rod.hooked) {
        const mat = katch.material as THREE.MeshBasicMaterial;
        const want = rod.hooked.species.sprite;
        const key = `${want.sheet}:${want.i}`;
        if (katch.userData.spriteKey !== key) {
          katch.userData.spriteKey = key;
          mat.map?.dispose();
          mat.map = sheetTexture(want);
          mat.needsUpdate = true;
        }
        katch.visible = true;
        katch.position.set(hx, hookY - 0.03, 0);
        const s = 0.03 + rod.hooked.species.size * 0.022;
        katch.scale.set(s, s, 1);
        katch.rotation.z = Math.sin(this.time * 9) * 0.25;
      } else {
        katch.visible = false;
      }
    }
  }

  // --- Yuzen yazilar -------------------------------------------------------

  spawnFloat(text: string, className: string, worldX: number, worldY: number): void {
    const el = document.createElement('div');
    el.className = `float ${className}`;
    el.textContent = text;
    this.floatLayer.appendChild(el);
    this.floats.push({ el, life: 0, x: worldX, y: worldY });
  }

  /** Bir oltanin su anki kanca konumunda yazi olusturur. */
  spawnFloatAtRod(rod: Rod, text: string, className: string): void {
    const wx = this.normToWorldX(rod.hookX);
    const y = Math.min(this.depthToY(rod.depth), SURFACE_Y - 0.12) - (rod.index % 3) * 0.03;
    this.spawnFloat(text, className, wx, y);
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
}
