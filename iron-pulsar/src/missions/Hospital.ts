import {
  Box3, BoxGeometry, CylinderGeometry, DoubleSide, Group, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, PlaneGeometry, PointLight, Vector3, Color, SphereGeometry, RepeatWrapping
} from 'three';
import { NavGraph } from '../physics/Nav';
import type { EnemySpawn, Level, LevelDeps, LevelFrame, Objective, Pickup } from './Mission';

const v = (x: number, z: number, y = 0) => new Vector3(x, y, z);

/**
 * Operação 1: HOSPITAL — reconstrução gráfica AAA (Etapa 2).
 * Geometria composta, materiais PBR procedurais, iluminação fluorescente,
 * equipamentos hospitalares detalhados, arquitetura com espessura e acabamentos.
 * Jogabilidade, colisão, nav e objetivos preservados.
 */
export async function buildHospital(deps: LevelDeps): Promise<Level> {
  const M = deps.materials;
  const group = new Group();
  const solids: Box3[] = [];
  const solidMeshes: Mesh[] = [];
  const lights: PointLight[] = [];

  // ─── Materials (PBR com texturas externas + fallback procedural) ──────────
  const wallMap = await M.resolveMap('textures/hospital/wall_paint.png', true, () => M.wallPaint());
  wallMap.repeat.set(4, 2); wallMap.wrapS = wallMap.wrapT = RepeatWrapping;
  const wallNrm = M.normalFromNoise(1.2, 0.35);
  const wallMat = M.get('hospital_wall', {
    color: 0xc8d2cd,
    roughness: 0.82,
    metalness: 0.02,
    map: wallMap,
    normalMap: wallNrm,
  });
  wallMat.normalScale.set(0.4, 0.4);

  const floorMap = await M.resolveMap('textures/hospital/floor_tiles.png', true, () => M.tiles(12, 15));
  floorMap.repeat.set(12, 15); floorMap.wrapS = floorMap.wrapT = RepeatWrapping;
  const floorNrm = M.normalFromNoise(2.5, 0.45);
  const floorMat = M.get('hospital_floor', {
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.04,
    map: floorMap,
    normalMap: floorNrm,
  });
  floorMat.normalScale.set(0.6, 0.6);

  const ceilMat = M.get('hospital_ceiling', {
    color: 0xdce2de,
    roughness: 0.88,
    metalness: 0.0,
  });

  const metalMat = M.get('hospital_metal', {
    color: 0x8a949c,
    roughness: 0.35,
    metalness: 0.85,
    roughnessMap: M.metalRough(),
  });

  const darkMetal = M.get('hospital_darkmetal', {
    color: 0x3a4046,
    roughness: 0.4,
    metalness: 0.9,
  });

  const plasticMat = M.get('hospital_plastic', {
    color: 0xe8eef2,
    roughness: 0.55,
    metalness: 0.05,
  });

  const bedMat = M.get('hospital_bed', {
    color: 0xf0f4f6,
    roughness: 0.65,
    metalness: 0.08,
  });

  const glassMat = M.get('hospital_glass', {
    color: 0xa8c8d8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
  });
  glassMat.side = DoubleSide;

  const lampMat = M.get('hospital_lamp', {
    color: 0xfff8e8,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0xffe8b0,
    emissiveIntensity: 0.85,
  });

  const accentMat = M.get('hospital_accent', {
    color: 0x2a6b5a,
    roughness: 0.5,
    metalness: 0.2,
  });

  const screenMat = M.get('hospital_screen', {
    color: 0x0a1a12,
    roughness: 0.3,
    metalness: 0.2,
    map: M.monitorScreen(),
    emissive: 0x1a4a30,
    emissiveIntensity: 0.7,
  });

  const baseboardMat = M.get('hospital_baseboard', {
    color: 0x5a6560,
    roughness: 0.7,
    metalness: 0.15,
  });

  // ─── Helpers ────────────────────────────────────────────────────────────
  const addBox = (
    cx: number, cz: number, w: number, h: number, d: number,
    mat: MeshStandardMaterial, y0 = 0, cast = true, solid = true
  ) => {
    const m = new Mesh(new BoxGeometry(w, h, d), mat);
    m.position.set(cx, y0 + h / 2, cz);
    m.castShadow = cast;
    m.receiveShadow = true;
    group.add(m);
    if (solid) {
      solidMeshes.push(m);
      solids.push(new Box3(
        new Vector3(cx - w / 2, y0, cz - d / 2),
        new Vector3(cx + w / 2, y0 + h, cz + d / 2)
      ));
    }
    return m;
  };

  const addCyl = (
    cx: number, cy: number, cz: number, rTop: number, rBot: number, h: number,
    mat: MeshStandardMaterial, segs = 12, cast = true
  ) => {
    const m = new Mesh(new CylinderGeometry(rTop, rBot, h, segs), mat);
    m.position.set(cx, cy, cz);
    m.castShadow = cast;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  /** Wall with thickness + optional baseboard. */
  const wall = (x0: number, z0: number, x1: number, z1: number, thick = 0.28) => {
    const H = 3.2;
    if (Math.abs(x0 - x1) < 0.01) {
      const len = Math.abs(z1 - z0);
      addBox(x0, (z0 + z1) / 2, thick, H, len + thick * 0.5, wallMat);
      // baseboard
      addBox(x0, (z0 + z1) / 2, thick + 0.04, 0.12, len + thick * 0.5, baseboardMat, 0, false, false);
    } else {
      const len = Math.abs(x1 - x0);
      addBox((x0 + x1) / 2, z0, len + thick * 0.5, H, thick, wallMat);
      addBox((x0 + x1) / 2, z0, len + thick * 0.5, 0.12, thick + 0.04, baseboardMat, 0, false, false);
    }
  };

  /** Door frame + optional door leaf (open by default for gameplay). */
  const doorFrame = (cx: number, cz: number, alongX: boolean) => {
    const H = 2.35, W = 1.15, T = 0.12;
    if (alongX) {
      addBox(cx - W / 2 - 0.06, cz, 0.12, H, 0.22, metalMat, 0, true, false);
      addBox(cx + W / 2 + 0.06, cz, 0.12, H, 0.22, metalMat, 0, true, false);
      addBox(cx, cz, W + 0.24, 0.1, 0.22, metalMat, H, true, false);
    } else {
      addBox(cx, cz - W / 2 - 0.06, 0.22, H, 0.12, metalMat, 0, true, false);
      addBox(cx, cz + W / 2 + 0.06, 0.22, H, 0.12, metalMat, 0, true, false);
      addBox(cx, cz, 0.22, 0.1, W + 0.24, metalMat, H, true, false);
    }
  };

  /** Hospital bed — multi-part (frame, mattress, rails, headboard). */
  const hospitalBed = (cx: number, cz: number, rotY = 0) => {
    const g = new Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;

    // Frame
    const frame = new Mesh(new BoxGeometry(2.15, 0.12, 0.95), metalMat);
    frame.position.y = 0.45;
    frame.castShadow = true;
    g.add(frame);

    // Legs
    for (const [lx, lz] of [[-0.95, -0.38], [0.95, -0.38], [-0.95, 0.38], [0.95, 0.38]]) {
      const leg = new Mesh(new BoxGeometry(0.06, 0.45, 0.06), darkMetal);
      leg.position.set(lx, 0.225, lz);
      leg.castShadow = true;
      g.add(leg);
    }

    // Mattress
    const matt = new Mesh(new BoxGeometry(2.0, 0.18, 0.88), bedMat);
    matt.position.y = 0.58;
    matt.castShadow = true;
    g.add(matt);

    // Headboard
    const hb = new Mesh(new BoxGeometry(0.08, 0.55, 0.95), plasticMat);
    hb.position.set(-1.05, 0.75, 0);
    hb.castShadow = true;
    g.add(hb);

    // Side rails (raised)
    for (const side of [-1, 1]) {
      const rail = new Mesh(new BoxGeometry(1.6, 0.06, 0.04), metalMat);
      rail.position.set(0.1, 0.85, side * 0.48);
      rail.castShadow = true;
      g.add(rail);
      for (const px of [-0.6, 0.2, 0.8]) {
        const post = new Mesh(new CylinderGeometry(0.015, 0.015, 0.32, 6), metalMat);
        post.position.set(px, 0.7, side * 0.48);
        g.add(post);
      }
    }

    // Pillow
    const pillow = new Mesh(new BoxGeometry(0.45, 0.1, 0.55), plasticMat);
    pillow.position.set(-0.7, 0.72, 0);
    g.add(pillow);

    group.add(g);
    // Collision approx
    solids.push(new Box3(
      new Vector3(cx - 1.1, 0, cz - 0.55),
      new Vector3(cx + 1.1, 0.9, cz + 0.55)
    ));
  };

  /** IV pole / serum stand. */
  const ivStand = (cx: number, cz: number) => {
    addCyl(cx, 0.9, cz, 0.025, 0.025, 1.8, metalMat, 8);
    addCyl(cx, 0.05, cz, 0.22, 0.22, 0.04, darkMetal, 10, false);
    // Cross bar
    const bar = new Mesh(new BoxGeometry(0.5, 0.03, 0.03), metalMat);
    bar.position.set(cx, 1.75, cz);
    group.add(bar);
    // Bag
    const bag = new Mesh(new BoxGeometry(0.12, 0.22, 0.08), plasticMat);
    bag.position.set(cx + 0.2, 1.55, cz);
    group.add(bag);
  };

  /** Medical monitor on a stand. */
  const medMonitor = (cx: number, cz: number, rotY = 0) => {
    const g = new Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;
    // Stand
    const pole = new Mesh(new CylinderGeometry(0.03, 0.04, 1.1, 8), metalMat);
    pole.position.y = 0.55;
    pole.castShadow = true;
    g.add(pole);
    const base = new Mesh(new CylinderGeometry(0.28, 0.3, 0.05, 12), darkMetal);
    base.position.y = 0.025;
    g.add(base);
    // Screen body
    const body = new Mesh(new BoxGeometry(0.42, 0.32, 0.08), darkMetal);
    body.position.set(0, 1.25, 0);
    body.castShadow = true;
    g.add(body);
    const screen = new Mesh(new BoxGeometry(0.36, 0.26, 0.02), screenMat);
    screen.position.set(0, 1.25, 0.05);
    g.add(screen);
    group.add(g);
  };

  /** Simple chair. */
  const chair = (cx: number, cz: number, rotY = 0) => {
    const g = new Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotY;
    const seat = new Mesh(new BoxGeometry(0.45, 0.06, 0.45), plasticMat);
    seat.position.y = 0.42;
    seat.castShadow = true;
    g.add(seat);
    const back = new Mesh(new BoxGeometry(0.45, 0.5, 0.05), plasticMat);
    back.position.set(0, 0.7, -0.2);
    back.castShadow = true;
    g.add(back);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const leg = new Mesh(new CylinderGeometry(0.02, 0.02, 0.42, 6), metalMat);
      leg.position.set(lx, 0.21, lz);
      g.add(leg);
    }
    group.add(g);
  };

  /** Cabinet / locker. */
  const cabinet = (cx: number, cz: number, w = 0.9, d = 0.45) => {
    addBox(cx, cz, w, 1.6, d, plasticMat, 0);
    // Door lines
    const line = new Mesh(new BoxGeometry(0.01, 1.4, 0.01), darkMetal);
    line.position.set(cx, 0.85, cz + d / 2 + 0.01);
    group.add(line);
    // Handle
    const h = new Mesh(new BoxGeometry(0.04, 0.08, 0.03), metalMat);
    h.position.set(cx + w * 0.3, 0.85, cz + d / 2 + 0.02);
    group.add(h);
  };

  /** Trash bin. */
  const trash = (cx: number, cz: number) => {
    addCyl(cx, 0.28, cz, 0.18, 0.2, 0.55, accentMat, 10);
    addCyl(cx, 0.55, cz, 0.2, 0.2, 0.04, darkMetal, 10, false);
  };

  /** Ceiling fluorescent fixture (emissive). */
  const fluoro = (cx: number, cz: number) => {
    const body = new Mesh(new BoxGeometry(1.2, 0.06, 0.22), metalMat);
    body.position.set(cx, 3.12, cz);
    group.add(body);
    const tube = new Mesh(new BoxGeometry(1.1, 0.04, 0.12), lampMat);
    tube.position.set(cx, 3.08, cz);
    group.add(tube);
  };

  // ─── Floor & Ceiling ────────────────────────────────────────────────────
  const floor = new Mesh(new PlaneGeometry(40, 50), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  solidMeshes.push(floor);

  const ceil = new Mesh(new PlaneGeometry(40, 50), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.2;
  group.add(ceil);

  // ─── Outer walls & main layout (40×50, center origin-ish, lobby south) ──
  // Outer shell (paredes segmentadas em torno dos vãos das janelas)
  wall(-20, -25, 20, -25); // sul (cheia)
  wall(-20, 25, 20, 25);   // norte (cheia)
  // Oeste e leste com aberturas reais para janelas
  const wallSeg = (x: number, z0: number, z1: number) => {
    if (z1 <= z0) return;
    const len = z1 - z0;
    addBox(x, (z0 + z1) / 2, 0.28, 3.2, len + 0.28 * 0.5, wallMat);
    addBox(x, (z0 + z1) / 2, 0.32, 0.12, len + 0.28 * 0.5, baseboardMat, 0, false, false);
  };
  const WX = -20, EX = 20;
  wallSeg(WX, -25, -21); wallSeg(WX, -19, -1); wallSeg(WX, 1, 14); wallSeg(WX, 16, 25);
  wallSeg(EX, -25, -21); wallSeg(EX, -19, -1); wallSeg(EX, 1, 14); wallSeg(EX, 16, 25);
  // Batentes de janela (metal, nas aberturas)
  const winFrame = (x: number, z: number) => {
    addBox(x, z, 0.06, 1.5, 0.22, metalMat, winY - 0.75, true, false);
    addBox(x, z, 0.22, 1.5, 0.06, metalMat, winY - 0.75, true, false);
    addBox(x, z, 0.22, 0.1, 0.22, metalMat, winY - 0.7, true, false); // peitoril inferior
  };

  // Central corridor walls (approx width 4 m)
  // Lobby (z 18..25) open to corridor
  wall(-6, 10, -6, 18); // west corridor mid
  wall(6, 10, 6, 18);
  wall(-6, -10, -6, 8);
  wall(6, -10, 6, 8);

  // North surgery wing divider
  wall(-12, 18, 12, 18);
  // Leave doorway at center
  // Rooms on sides
  wall(-20, 0, -6, 0);
  wall(6, 0, 20, 0);
  wall(-20, 10, -6, 10);
  wall(6, 10, 20, 10);

  // Door frames at key openings
  doorFrame(0, 18, true);
  doorFrame(-6, 5, false);
  doorFrame(6, 5, false);
  doorFrame(-6, 14, false);
  doorFrame(6, 14, false);
  doorFrame(0, -8, true);

  // ─── Props & equipment ──────────────────────────────────────────────────
  // Lobby (south)
  hospitalBed(-8, 21, 0);
  hospitalBed(8, 21, Math.PI);
  chair(-4, 22, 0.3);
  chair(4, 22, -0.3);
  trash(-12, 22);
  trash(12, 22);
  cabinet(-15, 20, 1.2, 0.5);
  cabinet(15, 20, 1.2, 0.5);
  medMonitor(-10, 19, 0.4);
  medMonitor(10, 19, -0.4);
  ivStand(-7, 20);
  ivStand(7, 20);

  // Corridor props
  trash(-4, 12);
  trash(4, 12);
  cabinet(-5, 8, 0.8, 0.4);
  chair(3, 6, 1.2);

  // Side rooms (west)
  hospitalBed(-13, 5, Math.PI / 2);
  hospitalBed(-13, -5, Math.PI / 2);
  ivStand(-11, 6);
  ivStand(-11, -4);
  medMonitor(-15, 3, 1);
  chair(-15, 7, 0.5);
  cabinet(-17, 5, 0.7, 0.4);
  trash(-12, 8);

  // Side rooms (east)
  hospitalBed(13, 5, -Math.PI / 2);
  hospitalBed(13, -5, -Math.PI / 2);
  ivStand(11, 6);
  medMonitor(15, 3, -1);
  cabinet(17, 5, 0.7, 0.4);
  chair(15, 7, -0.5);
  trash(12, 8);

  // Surgery room (north)
  hospitalBed(0, 22.5, 0); // operating table position-ish
  for (let i = -1; i <= 1; i++) {
    medMonitor(i * 3.5, 23.5, Math.PI);
    ivStand(i * 2.5, 21);
  }
  cabinet(-8, 22, 1.4, 0.55);
  cabinet(8, 22, 1.4, 0.55);
  chair(-5, 21, 0.8);
  chair(5, 21, -0.8);
  // Extra equipment boxes
  addBox(-6, 24, 0.6, 0.9, 0.5, metalMat, 0);
  addBox(6, 24, 0.6, 0.9, 0.5, metalMat, 0);
  addBox(0, 24.5, 1.2, 0.7, 0.6, plasticMat, 0);

  // Windows (vãos reais nas paredes oeste/leste – vidro nas aberturas)
  const winY = 1.6;
  for (const z of [-20, 0, 15]) {
    winFrame(WX, z); winFrame(EX, z);
    const glass = new Mesh(new PlaneGeometry(2.2, 1.4), glassMat);
    glass.position.set(-19.92, winY, z);
    glass.rotation.y = Math.PI / 2;
    group.add(glass);
    const glass2 = glass.clone();
    glass2.position.x = 19.92;
    glass2.rotation.y = -Math.PI / 2;
    group.add(glass2);
  }

  // ─── Lighting (fluorescent + point lights) ──────────────────────────────
  // Ambient is handled by Game; here local sources
  const addPoint = (x: number, y: number, z: number, intensity = 4, dist = 14, color = 0xfff4e0) => {
    const l = new PointLight(color, intensity, dist, 1.6);
    l.position.set(x, y, z);
    l.castShadow = false; // many lights; main sun handles key shadows
    group.add(l);
    lights.push(l);
  };

  // Corridor line of fluorescents + points (luz neutra)
  for (let z = -18; z <= 17; z += 5) {
    fluoro(0, z); addPoint(0, 2.9, z, 3.0, 12);
  }
  // Sala de Cirurgia (norte): luz clínica, mais fria e intensa
  for (const z of [22]) { fluoro(0, z); addPoint(0, 2.9, z, 5.0, 16, 0xdce9ff); }
  // Salas laterais: luz mais baixa, sombreada
  for (const [x, z] of [[-13, 5], [-13, -5], [13, 5], [13, -5]]) {
    fluoro(x, z); addPoint(x, 2.9, z, 2.2, 9, 0xfff0e0);
  }
  // Lobby sul / extração: luz quente e acolhedora
  fluoro(0, -20); addPoint(0, 2.8, -20, 5.0, 18, 0xfff0d0);
  addPoint(-10, 2.7, -21, 3.0, 11, 0xfff0d0);
  addPoint(10, 2.7, -21, 3.0, 11, 0xfff0d0);
  addPoint(-14, 2.6, -4, 2.0, 8, 0xffecd6);
  addPoint(14, 2.6, -4, 2.0, 8, 0xffecd6);
  // Áreas de apoio (camas e estações)
  addPoint(-8, 2.9, 21, 2.6, 10, 0xfff0e0);
  addPoint(8, 2.9, 21, 2.6, 10, 0xfff0e0);
  addPoint(0, 2.9, -18, 2.8, 10);

  // Extraction ring (visual)
  const ringGeo = new CylinderGeometry(2.8, 2.8, 0.05, 32, 1, true);
  const ringMat = M.get('extract_ring', {
    color: 0x2ecc71,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0x1a8a4a,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.75,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.set(0, 0.03, -20);
  ring.visible = false;
  group.add(ring);

  // ─── Navigation ─────────────────────────────────────────────────────────
  const nav = new NavGraph([
    v(0, 22), v(0, 15), v(0, 8), v(0, 0), v(0, -8), v(0, -18),
    v(-10, 5), v(-10, -5), v(10, 5), v(10, -5),
    v(-10, 14), v(10, 14), v(-4, 20), v(4, 20),
    v(-13, 5), v(13, 5), v(-13, -5), v(13, -5),
  ], solids);

  // ─── Enemy spawns ───────────────────────────────────────────────────────
  const enemySpawns: EnemySpawn[] = [
    { pos: v(-12, 6), yaw: 1.2, patrol: [v(-12, 6), v(-10, 2), v(-12, -2)] },
    { pos: v(12, 6), yaw: -1.2, patrol: [v(12, 6), v(10, 2), v(12, -2)] },
    { pos: v(0, 12), yaw: 0, patrol: [v(0, 12), v(-3, 10), v(3, 10)] },
    { pos: v(-8, 20), yaw: 0.5, patrol: [v(-8, 20), v(-4, 18)] },
    { pos: v(8, 20), yaw: -0.5, patrol: [v(8, 20), v(4, 18)] },
    { pos: v(0, -12), yaw: Math.PI, patrol: [v(0, -12), v(-4, -10), v(4, -10)] },
  ];

  // ─── Pickups ────────────────────────────────────────────────────────────
  const pickups: Pickup[] = [];
  const mkPickup = (type: 'health' | 'ammo' | 'intel', x: number, z: number, y = 0.4) => {
    const mat = type === 'intel'
      ? M.get('pickup_intel', { color: 0x3498db, roughness: 0.3, metalness: 0.6, emissive: 0x1a5a8a, emissiveIntensity: 0.5 })
      : type === 'health'
        ? M.get('pickup_hp', { color: 0xe74c3c, roughness: 0.4, metalness: 0.2, emissive: 0x8a1a1a, emissiveIntensity: 0.4 })
        : M.get('pickup_ammo', { color: 0xf1c40f, roughness: 0.4, metalness: 0.3, emissive: 0x8a6a0a, emissiveIntensity: 0.35 });
    const mesh = new Mesh(new BoxGeometry(0.35, 0.25, 0.35), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    pickups.push({ type, pos: new Vector3(x, y, z), mesh, active: true });
  };
  mkPickup('health', -14, 4);
  mkPickup('health', 14, -3);
  mkPickup('ammo', -3, 14);
  mkPickup('ammo', 5, -6);
  mkPickup('intel', 0, 23.2); // surgery

  // ─── Objectives ─────────────────────────────────────────────────────────
  const objectives: Objective[] = [
    { id: 'kill', text: 'Neutralizar todas as ameaças', done: false },
    { id: 'intel', text: 'Recuperar o disco de dados (Sala de Cirurgia)', done: false },
    { id: 'extract', text: 'Retornar à zona de extração (lobby)', done: false },
  ];
  let intel = false;

  const level: Level = {
    group,
    solids,
    solidMeshes,
    nav,
    lights,
    spawn: { pos: v(0, -20), yaw: Math.PI },
    enemySpawns,
    pickups,
    objectives,
    complete: false,
    onPickup(t) {
      if (t === 'intel') intel = true;
    },
    update(f: LevelFrame) {
      objectives[0].text = `Neutralizar todas as ameaças (${f.enemiesTotal - f.enemiesAlive}/${f.enemiesTotal})`;
      objectives[0].done = f.enemiesAlive === 0;
      objectives[1].done = intel;
      ring.visible = objectives[0].done && objectives[1].done;
      for (const p of pickups) if (p.active) p.mesh.rotation.y += f.dt * 2;
      if (ring.visible && Math.hypot(f.player.pos.x - ring.position.x, f.player.pos.z - ring.position.z) < 3) {
        objectives[2].done = true;
        level.complete = true;
      }
    },
  };
  return level;
}
