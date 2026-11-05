import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Side,
  Texture,
  TextureLoader,
} from 'three';

export interface MatDef {
  color: number;
  roughness: number;
  metalness: number;
  map?: Texture;
  normalMap?: Texture;
  roughnessMap?: Texture;
  metalnessMap?: Texture;
  aoMap?: Texture;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: Side;
}

export interface MapUrls {
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;
}

/** Central PBR material registry with procedural high-quality textures. */
export class MaterialLibrary {
  private mats = new Map<string, MeshStandardMaterial>();
  private texLoader = new TextureLoader();
  private procCache = new Map<string, Texture>();
  private externalCache = new Map<string, Promise<Texture | null>>();
  anisotropy = 4;

  /** Carrega uma textura externa de public/assets/textures/; retorna null se falhar. */
  loadExternal(url: string, srgb: boolean = true): Promise<Texture | null> {
    let p = this.externalCache.get(url);
    if (!p) {
      p = new Promise((resolve) => {
        this.texLoader.load(
          url,
          (t) => { if (srgb) t.colorSpace = SRGBColorSpace; resolve(t); },
          undefined,
          () => resolve(null)
        );
      });
      this.externalCache.set(url, p);
    }
    return p;
  }

  /** Resolve um mapa: tenta externa, cai no procedural se houver falha. */
  async resolveMap(url: string | undefined, srgb: boolean, fallback: () => Texture): Promise<Texture> {
    if (!url) return fallback();
    const t = await this.loadExternal(url, srgb);
    return t ?? fallback();
  }

  get(name: string, def: MatDef): MeshStandardMaterial {
    let m = this.mats.get(name);
    if (!m) {
      m = new MeshStandardMaterial({
        color: def.color,
        roughness: def.roughness,
        metalness: def.metalness,
        map: def.map ?? null,
        normalMap: def.normalMap ?? null,
        roughnessMap: def.roughnessMap ?? null,
        metalnessMap: def.metalnessMap ?? null,
        aoMap: def.aoMap ?? null,
        transparent: def.transparent ?? false,
        opacity: def.opacity ?? 1,
      });
      if (def.emissive !== undefined) {
        m.emissive = new Color(def.emissive);
        m.emissiveIntensity = def.emissiveIntensity ?? 1;
      }
      if (def.side !== undefined) m.side = def.side;
      m.name = name;
      this.mats.set(name, m);
    }
    return m;
  }

  setMaps(name: string, urls: MapUrls): void {
    const m = this.mats.get(name);
    if (!m) return;
    const load = (u: string, srgb: boolean) => {
      const t = this.texLoader.load(u);
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = this.anisotropy;
      if (srgb) t.colorSpace = SRGBColorSpace;
      return t;
    };
    if (urls.map) m.map = load(urls.map, true);
    if (urls.normalMap) m.normalMap = load(urls.normalMap, false);
    if (urls.roughnessMap) m.roughnessMap = load(urls.roughnessMap, false);
    if (urls.metalnessMap) m.metalnessMap = load(urls.metalnessMap, false);
    if (urls.aoMap) m.aoMap = load(urls.aoMap, false);
    m.needsUpdate = true;
  }

  setAnisotropy(n: number): void {
    this.anisotropy = n;
    this.mats.forEach((m) => {
      for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap]) {
        if (t) {
          t.anisotropy = n;
          t.needsUpdate = true;
        }
      }
    });
  }

  /** High-quality procedural hospital floor tiles (ceramic with grout, subtle dirt, variation). */
  tiles(repX: number, repY: number): CanvasTexture {
    const key = `tiles_${repX}_${repY}`;
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;

    g.fillStyle = '#e8ece9';
    g.fillRect(0, 0, size, size);

    const tile = 64;
    const grout = 3;

    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const v = 220 + Math.floor(Math.random() * 18) - 9;
        const r = v + Math.floor(Math.random() * 6) - 3;
        const gr = v + Math.floor(Math.random() * 8) - 2;
        const b = v - 4 + Math.floor(Math.random() * 6);
        g.fillStyle = `rgb(${r},${gr},${b})`;
        g.fillRect(x + grout, y + grout, tile - grout * 2, tile - grout * 2);

        g.fillStyle = 'rgba(180,185,180,0.15)';
        g.fillRect(x + grout, y + grout, tile - grout * 2, 2);
        g.fillRect(x + grout, y + tile - grout - 2, tile - grout * 2, 2);
      }
    }

    g.fillStyle = '#9aa29c';
    for (let i = 0; i <= size; i += tile) {
      g.fillRect(i, 0, grout, size);
      g.fillRect(0, i, size, grout);
    }

    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 18;
      g.fillStyle = `rgba(90,95,85,${0.04 + Math.random() * 0.08})`;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    const img = g.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 8;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    g.putImageData(img, 0, 0);

    const tex = new CanvasTexture(c);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(repX, repY);
    tex.anisotropy = this.anisotropy;
    tex.colorSpace = SRGBColorSpace;
    this.procCache.set(key, tex);
    return tex;
  }

  /** Wall paint with subtle plaster noise, scuffs and AO-ish variation. */
  wallPaint(): CanvasTexture {
    const key = 'wall_paint';
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;

    g.fillStyle = '#c5d0cb';
    g.fillRect(0, 0, size, size);

    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 30 + Math.random() * 80;
      const h = 8 + Math.random() * 40;
      g.fillStyle = `rgba(180,190,185,${0.03 + Math.random() * 0.06})`;
      g.fillRect(x, y, w, h);
    }

    const grad = g.createLinearGradient(0, size * 0.7, 0, size);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(40,45,40,0.12)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);

    for (let i = 0; i < 25; i++) {
      g.strokeStyle = `rgba(100,110,100,${0.08 + Math.random() * 0.1})`;
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      const sx = Math.random() * size;
      const sy = Math.random() * size;
      g.moveTo(sx, sy);
      g.lineTo(sx + (Math.random() - 0.5) * 40, sy + (Math.random() - 0.5) * 20);
      g.stroke();
    }

    const tex = new CanvasTexture(c);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(4, 2);
    tex.anisotropy = this.anisotropy;
    tex.colorSpace = SRGBColorSpace;
    this.procCache.set(key, tex);
    return tex;
  }

  /** Simple normal map from height-like noise. */
  normalFromNoise(scale = 1, strength = 0.55): CanvasTexture {
    const key = `normal_${scale}_${strength}`;
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const img = g.createImageData(size, size);
    const d = img.data;

    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = x / size;
        const ny = y / size;
        h[y * size + x] =
          Math.sin(nx * Math.PI * 8 * scale) * Math.cos(ny * Math.PI * 6 * scale) * 0.4 +
          Math.sin(nx * Math.PI * 19 * scale + 1.2) * 0.25 +
          (Math.random() - 0.5) * 0.15;
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const l = h[y * size + ((x - 1 + size) % size)];
        const r = h[y * size + ((x + 1) % size)];
        const u = h[((y - 1 + size) % size) * size + x];
        const dn = h[((y + 1) % size) * size + x];
        let dx = (l - r) * strength * 2;
        let dy = (u - dn) * strength * 2;
        const len = Math.sqrt(dx * dx + dy * dy + 1);
        dx /= len;
        dy /= len;
        const dz = 1 / len;
        const idx = i * 4;
        d[idx] = Math.floor((dx * 0.5 + 0.5) * 255);
        d[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
        d[idx + 2] = Math.floor((dz * 0.5 + 0.5) * 255);
        d[idx + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    const tex = new CanvasTexture(c);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.anisotropy = this.anisotropy;
    this.procCache.set(key, tex);
    return tex;
  }

  /** Metal brushed roughness variation. */
  metalRough(): CanvasTexture {
    const key = 'metal_rough';
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.fillStyle = '#808080';
    g.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const v = 100 + Math.floor(Math.random() * 60);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, size, 1 + (Math.random() > 0.7 ? 1 : 0));
    }
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = `rgba(200,200,200,${0.3 + Math.random() * 0.4})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, Math.random() * size);
      g.lineTo(size, Math.random() * size);
      g.stroke();
    }

    const tex = new CanvasTexture(c);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.anisotropy = this.anisotropy;
    this.procCache.set(key, tex);
    return tex;
  }

  /** Concrete / industrial floor. */
  concrete(rep = 8): CanvasTexture {
    const key = `concrete_${rep}`;
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.fillStyle = '#6a6e6c';
    g.fillRect(0, 0, size, size);

    for (let i = 0; i < 800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 4;
      g.fillStyle = `rgba(${80 + Math.random() * 40},${85 + Math.random() * 30},${80 + Math.random() * 30},${0.15 + Math.random() * 0.25})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    for (let i = 0; i < 8; i++) {
      g.strokeStyle = 'rgba(40,42,40,0.35)';
      g.lineWidth = 1 + Math.random();
      g.beginPath();
      let x = Math.random() * size;
      let y = Math.random() * size;
      g.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    const tex = new CanvasTexture(c);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(rep, rep);
    tex.anisotropy = this.anisotropy;
    tex.colorSpace = SRGBColorSpace;
    this.procCache.set(key, tex);
    return tex;
  }

  /** Simple emissive panel / monitor texture. */
  monitorScreen(): CanvasTexture {
    const key = 'monitor';
    if (this.procCache.has(key)) return this.procCache.get(key) as CanvasTexture;

    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.fillStyle = '#0a1a12';
    g.fillRect(0, 0, size, size);

    g.strokeStyle = '#2ecc71';
    g.lineWidth = 1;
    g.globalAlpha = 0.6;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(8, 16 + i * 12);
      for (let x = 8; x < 120; x += 4) {
        g.lineTo(x, 16 + i * 12 + Math.sin(x * 0.15 + i) * 4);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = '#1a3a2a';
    g.font = '10px monospace';
    g.fillText('VITALS', 10, 14);
    g.fillStyle = '#3ae87a';
    g.fillText('HR 78  SpO2 98%', 10, 118);

    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    this.procCache.set(key, tex);
    return tex;
  }

  dispose(): void {
    this.mats.forEach((m) => m.dispose());
    this.procCache.forEach((t) => t.dispose());
    this.mats.clear();
    this.procCache.clear();
  }
}
