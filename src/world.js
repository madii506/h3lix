// The live H3LIX world behind the home page: the coral voxel drill turns inside the portal ring over a snowy
// island town; cubes stream back out of the ring; snow falls; the camera follows the pointer and the scroll.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function startWorld(canvas, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let seed = 41; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const scene = new THREE.Scene();
  const RC = new THREE.Vector3(12.2, 1.0, 0.0);
  const D = new THREE.Vector3(0.80, 0.56, 0.13).normalize();
  const RING_R = 4.3;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const camBase = new THREE.Vector3(1.2, 6.6, 34), look = new THREE.Vector3(4.6, 1.2, 0);

  // sky texture
  const sky = document.createElement('canvas'); sky.width = 1600; sky.height = 900; const sg = sky.getContext('2d');
  const gr = sg.createLinearGradient(0, 0, 0, 900); gr.addColorStop(0, '#07060f'); gr.addColorStop(0.55, '#140e25'); gr.addColorStop(1, '#251832');
  sg.fillStyle = gr; sg.fillRect(0, 0, 1600, 900);
  const glow = sg.createRadialGradient(1120, 430, 10, 1120, 430, 760); glow.addColorStop(0, 'rgba(255,104,60,0.20)'); glow.addColorStop(0.32, 'rgba(160,52,110,0.12)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = glow; sg.fillRect(0, 0, 1600, 900);
  for (let i = 0; i < 520; i++) { const r = rnd() < 0.06 ? 2 : 1; sg.fillStyle = `rgba(238,236,255,${(0.16 + rnd() * 0.6).toFixed(2)})`; sg.fillRect(Math.round(rnd() * 1600), Math.round(rnd() * 860), r, r); }
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  scene.fog = new THREE.FogExp2(0x1a1230, 0.018);

  scene.add(new THREE.HemisphereLight(0xa99cff, 0x26183a, 1.35));
  const moon = new THREE.DirectionalLight(0xd6dcff, 1.35); moon.position.set(-14, 22, 16); scene.add(moon);
  const ringLight = new THREE.PointLight(0xff6a3d, 55, 30, 1.6); ringLight.position.copy(RC).addScaledVector(D, -0.5).add(new THREE.Vector3(0, -0.5, 3.6)); scene.add(ringLight);
  const tipLight = new THREE.PointLight(0xff7a4a, 14, 14, 1.8); tipLight.position.copy(RC).addScaledVector(D, 6).add(new THREE.Vector3(0, 2.6, 3.2)); scene.add(tipLight);

  const groups = new Map();
  const M = (key, extra) => groups.set(key, { mat: new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.9, metalness: 0, flatShading: true }, extra || {})), list: [] });
  ['snow', 'rock', 'pine', 'trunk', 'wood', 'ice', 'roof'].forEach(k => M(k));
  M('window', { emissive: 0xff9a45, emissiveIntensity: 1.4 });
  M('lamp', { emissive: 0xff6a2a, emissiveIntensity: 1.8 });
  const C3 = new THREE.Color();
  const vox = (key, x, y, z, s, hex, jit = 0.07) => { C3.set(hex); const k = 1 + (rnd() - 0.5) * 2 * jit; groups.get(key).list.push([x, y, z, s, C3.r * k, C3.g * k, C3.b * k]); };
  const SNOW = [0xf1f4fd, 0xe6ebf9, 0xdbe3f5], EDGE = 0xc6d0ea, ROCK = [0x3e3459, 0x342a4f, 0x2b2444], PINE = [0x1c4a3b, 0x22553f, 0x1a4236];
  const lights = [];
  function island(cx, cy, cz, r, depth, v, phase) {
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      const d = Math.hypot(x, z * 1.12), lim = r * (0.8 + 0.2 * Math.sin(x * 1.25 + z * 0.85 + phase));
      if (d > lim) continue;
      const e = d / lim, bump = e < 0.6 && rnd() < 0.12 ? 1 : 0;
      for (let b = 0; b <= bump; b++) vox('snow', cx + x * v, cy + b * v, cz + z * v, v, e > 0.84 ? EDGE : SNOW[(x * 7 + z * 3 + 99) % 3]);
      vox('rock', cx + x * v, cy - v, cz + z * v, v, ROCK[0], 0.05);
      const len = Math.max(1, Math.round(depth * Math.pow(1 - e, 1.2) * (0.75 + 0.5 * rnd())));
      for (let k = 2; k <= len + 1; k++) {
        if (k >= len && rnd() < 0.3) vox('ice', cx + x * v, cy - k * v, cz + z * v, v, 0x9fd6ff, 0.05);
        else vox('rock', cx + x * v, cy - k * v, cz + z * v, v, ROCK[(k + x + z + 30) % 3], 0.06);
      }
    }
  }
  function pine(x, y, z, v0, h) {
    const v = v0 * 0.6; y += v0 * 0.5 - v * 0.5;
    vox('trunk', x, y + v, z, v, 0x4b3528);
    for (let l = 0; l < h; l++) {
      const rr = Math.max(0, Math.floor((h - l) / 2));
      for (let i = -rr; i <= rr; i++) for (let k = -rr; k <= rr; k++) {
        if (Math.abs(i) + Math.abs(k) > rr) continue;
        const edge = Math.abs(i) + Math.abs(k) === rr;
        if (l === h - 1 || (edge && l % 2 === 1)) vox('snow', x + i * v, y + (2 + l) * v, z + k * v, v, SNOW[1]);
        else vox('pine', x + i * v, y + (2 + l) * v, z + k * v, v, PINE[(l + i + 9) % 3]);
      }
    }
  }
  function cabin(x, y, z, v, face = 1, roof = 0xc8462c) {
    for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) for (let h = 1; h <= 2; h++)
      if (h === 1 && k === face && i !== 0) vox('window', x + i * v, y + h * v, z + k * v, v, 0xffc27a, 0.02); else vox('wood', x + i * v, y + h * v, z + k * v, v, 0x3d2b2a, 0.08);
    for (let i = -2; i <= 2; i++) for (let k = -1; k <= 1; k++) vox(rnd() < 0.55 ? 'snow' : 'roof', x + i * v * 0.75, y + 3 * v, z + k * v, v, rnd() < 0.55 ? SNOW[0] : roof);
    vox('roof', x, y + 4 * v, z, v, roof);
    if (!mobile) { const l = new THREE.PointLight(0xffa04d, 3.2, 4.5, 2); l.position.set(x, y + v * 1.5, z + face * v * 2); scene.add(l); lights.push(l); }
  }
  function lamp(x, y, z, v) { vox('wood', x, y + v, z, v * 0.5, 0x3d2b2a); vox('wood', x, y + v * 1.5, z, v * 0.5, 0x3d2b2a); vox('lamp', x, y + v * 2.1, z, v * 0.7, 0xffb070, 0.02); }

  const HX = 13.6, HY = -5.2, HZ = -0.6;
  island(HX, HY, HZ, 12, 10, 0.45, 0.4);
  cabin(HX - 3.4, HY, HZ + 2.4, 0.45); cabin(HX + 2.9, HY, HZ + 2.6, 0.45); cabin(HX + 0.2, HY, HZ - 1.6, 0.45, 1, 0xa83a26); cabin(HX - 0.6, HY, HZ + 4.2, 0.45);
  for (const [dx, dz, h] of [[-4.6, -1.4, 6], [3.4, -2.6, 7], [5.0, 0.2, 5], [-2.0, 3.0, 4], [1.6, 4.4, 5], [-5.2, 1.4, 5], [0.9, -3.8, 6], [-2.6, -3.2, 5], [4.4, 3.0, 4]]) pine(HX + dx, HY, HZ + dz, 0.45, h);
  lamp(HX - 1.7, HY, HZ + 4.9, 0.45); lamp(HX + 1.8, HY, HZ + 5.0, 0.45); lamp(HX + 4.6, HY, HZ + 1.9, 0.45);
  const floaters = [];
  const isl = (args, extra) => { const g0 = groups.get('snow').list.length; island(...args); if (extra) extra(); floaters.push({ y0: args[1], ph: rnd() * 6, amp: 0.12 + rnd() * 0.18 }); };
  isl([25.5, 3.6, -4.5, 5, 6, 0.45, 1.2], () => { cabin(25.3, 3.6, -4.2, 0.45); pine(27.0, 3.6, -5.4, 0.45, 5); lamp(23.8, 3.6, -3.2, 0.45); });
  isl([20.5, 9.2, -10.5, 3, 5, 0.42, 2.4], () => pine(20.4, 9.2, -10.6, 0.42, 5));
  isl([3.6, -5.6, 5.8, 4, 5, 0.42, 3.1], () => { lamp(3.2, -5.6, 6.5, 0.42); pine(2.6, -5.6, 5.0, 0.42, 4); });
  isl([-6.5, 4.6, -9.0, 3, 4, 0.5, 1.7], () => pine(-6.4, 4.6, -9.0, 0.5, 4));
  isl([-14, -4.2, -12, 5, 7, 0.55, 0.7], () => pine(-13.5, -4.2, -12.4, 0.55, 5));
  isl([2.0, 7.4, -22, 5, 7, 0.7, 2.8]);
  isl([31.5, -3.0, 1.5, 3, 4, 0.45, 2.2], () => cabin(31.5, -3.0, 1.6, 0.45));
  isl([-19, 6.5, -20, 4, 5, 0.6, 1.1]);

  const box = new THREE.BoxGeometry(1, 1, 1), o = new THREE.Object3D(), col = new THREE.Color();
  for (const [, g] of groups) {
    if (!g.list.length) continue;
    const mesh = new THREE.InstancedMesh(box, g.mat, g.list.length);
    g.list.forEach(([x, y, z, s, r, gg, bb], i) => { o.position.set(x, y, z); o.quaternion.identity(); o.scale.setScalar(s * 0.985); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, col.setRGB(r, gg, bb)); });
    scene.add(mesh);
  }

  // the drill, in its own group so it can turn on its axis
  const drill = new THREE.Group(); drill.position.copy(RC); drill.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), D); scene.add(drill);
  const spin = new THREE.Group(); drill.add(spin);
  const dm = { drill: [], drillIn: [], bit: [] };
  const vd = 0.22, R = 1.5, TIP = 8.6, BODY0 = -1.4, SH0 = -7.0, PITCH = 3.0;
  for (let s = SH0; s <= TIP + 0.01; s += vd) for (let y = -R; y <= R; y += vd) for (let z = -R; z <= R; z += vd) {
    const r = Math.hypot(y, z);
    const rmax = s > TIP - 2.6 ? R * (TIP - s) / 2.6 : (s < BODY0 ? R * 0.74 : R);
    if (r > rmax || r < rmax - vd * 1.6) continue;
    if (s >= BODY0) {
      const phi = Math.atan2(z, y), ph = ((phi - 2 * Math.PI * s / PITCH) % Math.PI + Math.PI) % Math.PI;
      if (ph < 1.2 && r > R * 0.5) { dm.drillIn.push([s, y * 0.6, z * 0.6, vd, 0x3a0c06]); continue; }
      (s > TIP - 2.6 ? dm.bit : dm.drill).push([s, y, z, vd, s > TIP - 2.6 ? 0xff8a5a : 0xff6a3a]); continue;
    }
    const u = (BODY0 - s) / (BODY0 - SH0);
    if (rnd() < u * 0.55) continue;
    const drift = u * u * 1.6, a = rnd() * Math.PI * 2;
    dm.drill.push([s - u * u * 2.2 * rnd(), y + Math.cos(a) * drift * rnd(), z + Math.sin(a) * drift * rnd(), vd * (1 - 0.45 * u), 0xff6a3a]);
  }
  const dMat = {
    drill: new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.05, emissive: 0xff3c14, emissiveIntensity: 0.05, flatShading: true }),
    drillIn: new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x5a1406, emissiveIntensity: 0.25, flatShading: true }),
    bit: new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xff5a2a, emissiveIntensity: 0.3, flatShading: true }),
  };
  for (const k of Object.keys(dm)) {
    const mesh = new THREE.InstancedMesh(box, dMat[k], dm[k].length);
    dm[k].forEach(([x, y, z, s, hex], i) => { o.position.set(x, y, z); o.quaternion.identity(); o.scale.setScalar(s * 0.985); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); C3.set(hex); const j = 1 + (rnd() - 0.5) * 0.12; mesh.setColorAt(i, col.setRGB(C3.r * j, C3.g * j, C3.b * j)); });
    spin.add(mesh);
  }
  // the stream of loose cubes leaving the shank, flowing back through the ring
  const NS = mobile ? 140 : 260;
  const stream = new THREE.InstancedMesh(box, dMat.drill, NS);
  const sp = []; for (let i = 0; i < NS; i++) sp.push({ t: rnd(), a: rnd() * Math.PI * 2, r: rnd(), sz: 0.7 + 0.5 * rnd(), v: 0.05 + rnd() * 0.05 });
  drill.add(stream);
  // the portal ring
  const RN = D.clone().multiplyScalar(0.5).add(camBase.clone().sub(RC).normalize().multiplyScalar(0.85)).normalize();
  const ring = new THREE.Group(); ring.position.copy(RC); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), RN); scene.add(ring);
  const ringMain = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.15, 18, 280), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.15, 0.72) }));
  const ringOut = new THREE.Mesh(new THREE.TorusGeometry(RING_R + 0.36, 0.045, 8, 280), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.35), transparent: true, opacity: 0.85 }));
  const ringOut2 = new THREE.Mesh(new THREE.TorusGeometry(RING_R + 0.78, 0.025, 8, 280), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.5 }));
  const ringIn = new THREE.Mesh(new THREE.TorusGeometry(RING_R - 0.34, 0.03, 8, 280), new THREE.MeshBasicMaterial({ color: 0xff8a5a, transparent: true, opacity: 0.55 }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(RING_R - 0.1, 160), new THREE.MeshBasicMaterial({ color: 0xff6a3d, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.add(ringMain, ringOut, ringOut2, ringIn, disc);

  // snow
  const NSN = mobile ? 380 : 800, snowPos = new Float32Array(NSN * 3), snowV = new Float32Array(NSN);
  for (let i = 0; i < NSN; i++) { snowPos.set([-22 + rnd() * 60, -9 + rnd() * 24, -18 + rnd() * 28], i * 3); snowV[i] = 0.4 + rnd() * 0.9; }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  scene.add(new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.08, color: 0xdfe3ff, transparent: true, opacity: 0.85 })));
  // embers around the ring
  const NE = 160, emb = new Float32Array(NE * 3), embP = [];
  for (let i = 0; i < NE; i++) embP.push({ a: rnd() * Math.PI * 2, r: 1 + rnd() * 7, s: (rnd() - 0.5) * 10, w: 0.1 + rnd() * 0.3 });
  const egeo = new THREE.BufferGeometry(); egeo.setAttribute('position', new THREE.BufferAttribute(emb, 3));
  scene.add(new THREE.Points(egeo, new THREE.PointsMaterial({ size: 0.09, color: 0xff8a50, transparent: true, opacity: 0.9 })));

  // ---- paired coins: small islands each carrying a voxel coin; their fees spiral into the ring ----
  const coinIsl = [[-9.5, 6.5, -6.5], [9.5, 7.5, -7.5], [-10.5, -3.6, -3.0], [10.5, -1.6, -9.0]].map(([dx, dy, dz]) => new THREE.Vector3(RC.x + dx, RC.y + dy, RC.z + dz));
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc35a, emissive: 0xff8a20, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.4, flatShading: true });
  const coins = [];
  for (const [ci, P] of coinIsl.entries()) {
    const g0 = groups.get('snow').list.length;
    // a tiny island under each coin
    const isl = new THREE.Group(); scene.add(isl);
    const v = 0.34;
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      const d = Math.hypot(x, z); if (d > 3.2) continue;
      const top = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: d > 2.6 ? 0xc6d0ea : 0xeef2fc, roughness: 0.9, flatShading: true }));
      top.position.set(P.x + x * v, P.y - 1.1, P.z + z * v); top.scale.setScalar(v * 0.98); isl.add(top);
      const depth = Math.max(1, Math.round((3.4 - d) * 1.4));
      for (let k = 1; k <= depth; k++) { const r = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: [0x3e3459, 0x342a4f, 0x2b2444][(k + x + z + 9) % 3], roughness: 0.9, flatShading: true })); r.position.set(P.x + x * v, P.y - 1.1 - k * v, P.z + z * v); r.scale.setScalar(v * 0.98); isl.add(r); }
    }
    // the coin: a voxel disc standing up, turning
    const coin = new THREE.Group(); coin.position.copy(P); scene.add(coin);
    const cv = 0.16;
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const d = Math.hypot(x, y); if (d > 6.3) continue;
      const rim = d > 5.0 || (d < 2.6 && d > 1.6);
      const m = new THREE.Mesh(box, rim ? coinMat : new THREE.MeshStandardMaterial({ color: 0xff9a3a, emissive: 0xff6a20, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.3, flatShading: true }));
      m.position.set(x * cv, y * cv, 0); m.scale.set(cv, cv, cv * (rim ? 2.2 : 1.4)); coin.add(m);
    }
    coins.push({ g: coin, isl, ph: ci * 1.7, base: P.clone() });
  }
  // the fee streams: each coin sends cubes along a helix into the ring
  const PER = mobile ? 22 : 40, NF = coinIsl.length * PER;
  const feeMat = new THREE.MeshStandardMaterial({ color: 0xffb070, emissive: 0xff6a2a, emissiveIntensity: 1.1, roughness: 0.4, flatShading: true });
  const fees = new THREE.InstancedMesh(box, feeMat, NF); scene.add(fees);
  const feeP = []; for (let i = 0; i < NF; i++) feeP.push({ c: Math.floor(i / PER), s: (i % PER) / PER + rnd() * 0.02, v: 0.09 + rnd() * 0.05, a: rnd() * Math.PI * 2, sz: 0.09 + rnd() * 0.07 });
  const fp = new THREE.Vector3(), fq = new THREE.Vector3(), ha = new THREE.Vector3(), hb = new THREE.Vector3(), hc = new THREE.Vector3();
  function helixPoint(from, to, s, a, turns, R0, out) {
    // from -> to with a widening-then-closing helix around the line, ease in
    const e = s * s * (3 - 2 * s);
    out.copy(from).lerp(to, e);
    ha.subVectors(to, from).normalize();
    hb.set(0, 1, 0).cross(ha).normalize(); hc.crossVectors(ha, hb);
    const r = R0 * Math.sin(Math.PI * Math.min(1, s * 1.05)), th = a + s * turns * Math.PI * 2;
    return out.addScaledVector(hb, Math.cos(th) * r).addScaledVector(hc, Math.sin(th) * r);
  }
  // ---- the story: one fee, followed from a coin, through the ring, to a holder's door ----
  const heroMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa040, emissiveIntensity: 2.2, roughness: 0.3, flatShading: true });
  const hero = new THREE.Mesh(box, heroMat); hero.scale.setScalar(0.34); hero.visible = false; scene.add(hero);
  const heroLight = new THREE.PointLight(0xff9a50, 0, 6, 1.6); scene.add(heroLight);
  const trailN = 18, trail = new THREE.InstancedMesh(box, feeMat, trailN); trail.visible = false; scene.add(trail);
  const doorAt = new THREE.Vector3(HX + 2.9, HY + 0.7, HZ + 2.6 + 0.9);
  const sideV = new THREE.Vector3().crossVectors(RN, D).normalize();
  const stIn = RC.clone().addScaledVector(sideV, 2.7).addScaledVector(RN, 1.4), stOut = RC.clone().addScaledVector(sideV, 2.7).addScaledVector(RN, -1.8);
  const V1 = RC.clone().addScaledVector(sideV, 5.5).addScaledVector(RN, 12).add(new THREE.Vector3(0, 1.4, 0)), L1 = RC.clone().addScaledVector(sideV, 2.7);
  const V2 = doorAt.clone().add(new THREE.Vector3(6.5, 3.6, 9.5));
  let story = null; const storyHist = [];
  function storyPos(t, out) {
    if (t < 0.5) return helixPoint(coinIsl[1], stIn, t / 0.5, 0.6, 1.6, 2.2, out);
    if (t < 0.6) return out.copy(stIn).lerp(stOut, (t - 0.5) / 0.1);
    const u = (t - 0.6) / 0.4; out.copy(stOut).lerp(doorAt, u * u * (3 - 2 * u));
    return out.add(new THREE.Vector3(0, Math.sin(u * Math.PI) * 3.2, 0));
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.36, 0.42, 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let W = 0, H = 0, baseFov = 30, fovKick = 0;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false); composer.setSize(W, H);
    cam.aspect = W / H;
    // keep the ring and the drill in frame on tall screens
    baseFov = W / H < 1.2 ? 52 : W / H < 1.7 ? 38 : 30; cam.fov = baseFov + fovKick;
    cam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  const SHOTS = {
    hero: { pos: [1.2, 6.6, 34], look: [4.6, 1.2, 0] },
    ring: { pos: [3.2, 3.6, 15.5], look: [12.6, 1.8, 0] },
    town: { pos: [22.5, 0.2, 15.5], look: [10.8, -3.6, -0.8] },
    side: { pos: [-9, 1.5, 15], look: [9.5, 1.6, 0] },
    end: { pos: [11.0, 2.4, 21], look: [12.2, 1.2, 0] },
  };
  const gp = RC.clone().addScaledVector(RN, 23).add(new THREE.Vector3(0, -0.2, 0));
  SHOTS.gate = { pos: [gp.x, gp.y, gp.z], look: [RC.x, RC.y - 0.4, RC.z] };
  let shot = opts.startShot || 'hero';
  const camPos = new THREE.Vector3(...SHOTS[shot].pos), camLook = new THREE.Vector3(...SHOTS[shot].look);
  const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  let ext = null;                                     // {pos:[x,y,z], look:[x,y,z]} from the page's scroll path
  let fly = null;                                     // the fly-in through the ring
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth - 0.5; ptr.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  let scrollK = 0;
  const v3 = new THREE.Vector3(), dq = new THREE.Quaternion(), ax = new THREE.Vector3(1, 0, 0);
  let last = performance.now(), running = true, t = 0, frames = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(loop); } });

  function frame(dt) {
    t += dt;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.5); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.5);
    const portrait = W / H < 1.2, S = ext || SHOTS[shot] || SHOTS.hero;
    tPos.set(...S.pos); tLook.set(...S.look);
    if (story != null) {
      // ride behind the fee to the ring, watch it pass through from outside, then watch it land in town
      storyPos(story, fp); storyPos(Math.min(1, story + 0.03), fq);
      const dir = fq.clone().sub(fp).normalize();
      const follow = fp.clone().addScaledVector(dir, -6.5).add(new THREE.Vector3(0, 2.2, 0)).addScaledVector(sideV, 2.4);
      const a = Math.min(1, Math.max(0, (story - 0.38) / 0.1)), b = Math.min(1, Math.max(0, (story - 0.62) / 0.1));
      tPos.copy(follow).lerp(V1, a).lerp(V2, b);
      tLook.copy(fp).lerp(L1, a * (1 - b)).lerp(fp, b);
    }
    if (portrait) {                                    // tall screens: step back along the view and centre on the ring
      if (!ext && shot === 'hero') { tPos.x += 7.5; tPos.z += 6; tLook.x += 7.5; }
      else if (!ext && shot === 'gate') tPos.sub(tLook).multiplyScalar(1.9).add(tLook);
      else tPos.sub(tLook).multiplyScalar(1.35).add(tLook);
    }
    tPos.x += ptr.x * 2.2; tPos.y -= ptr.y * 1.4;
    if (fly) {
      // through the portal: ease from where we are to the ring's face, then straight through it while the lens widens
      const u = Math.min(1, (performance.now() - fly.t0) / 1000 / fly.dur);
      const e = u < 0.62 ? 0.62 * Math.pow(u / 0.62, 2.2) : u;
      const a = Math.min(1, e / 0.62), b = Math.max(0, (e - 0.62) / 0.38);
      const P = fly.p0.clone().lerp(fly.p1, a * a * (3 - 2 * a)).lerp(fly.p2, b);
      camPos.copy(P); camLook.copy(fly.l0.clone().lerp(fly.p1.clone().addScaledVector(RN, -10), Math.min(1, a * 1.3)).lerp(fly.l2, b));
      fovKick = Math.pow(u, 3) * 55; cam.fov = baseFov + fovKick; cam.updateProjectionMatrix();
      if (u >= 0.86 && !fly.flashed) { fly.flashed = true; fly.onFlash && fly.onFlash(); }
      if (u >= 1) { const done = fly.onDone; fly = null; fovKick = 0; cam.fov = baseFov; cam.updateProjectionMatrix(); camPos.set(...(ext ? ext.pos : SHOTS.hero.pos)); camLook.set(...(ext ? ext.look : SHOTS.hero.look)); done && done(); }
    } else {
      const k = 1 - Math.exp(-dt * (reduce ? 8 : 2.2));
      camPos.lerp(tPos, k); camLook.lerp(tLook, k);
    }
    cam.position.copy(camPos); cam.lookAt(camLook);
    // drill turns on its axis and breathes along it
    spin.rotation.x = -t * (reduce ? 0.2 : 1.1);
    drill.position.copy(RC).addScaledVector(D, Math.sin(t * 0.8) * 0.18);
    // stream
    for (let i = 0; i < NS; i++) {
      const p = sp[i]; if (!reduce) p.t += dt * p.v; if (p.t > 1) { p.t -= 1; p.a = rnd() * Math.PI * 2; p.r = rnd(); }
      const s = -7.0 - p.t * 11, rad = (0.4 + p.t * 2.4) * p.r;
      o.position.set(s, Math.cos(p.a + t * 0.4) * rad, Math.sin(p.a + t * 0.4) * rad);
      o.quaternion.setFromAxisAngle(ax, p.a + t); o.scale.setScalar(vd * (0.95 - 0.6 * p.t) * p.sz); o.updateMatrix(); stream.setMatrixAt(i, o.matrix);
    }
    stream.instanceMatrix.needsUpdate = true;
    // ring pulse
    const pulse = 1 + Math.sin(t * 2.2) * 0.012; ringMain.scale.setScalar(pulse); ringOut.scale.setScalar(1 + Math.sin(t * 2.2 + 1) * 0.02);
    ringOut2.rotation.z = t * 0.05; disc.material.opacity = 0.07 + Math.sin(t * 1.6) * 0.02;
    // snow and embers
    if (!reduce) {
      for (let i = 0; i < NSN; i++) { let y = snowPos[i * 3 + 1] - snowV[i] * dt; if (y < -9) y += 24; snowPos[i * 3 + 1] = y; snowPos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.15; }
      sgeo.attributes.position.needsUpdate = true;
    }
    for (let i = 0; i < NE; i++) { const e = embP[i]; const a = e.a + t * e.w; v3.set(e.s, Math.cos(a) * e.r, Math.sin(a) * e.r).applyQuaternion(drill.quaternion).add(RC); emb.set([v3.x, v3.y, v3.z], i * 3); }
    egeo.attributes.position.needsUpdate = true;
    // coins turn and bob; fee cubes spiral into the ring
    for (const c of coins) { c.g.rotation.y = t * 0.9 + c.ph; const b = Math.sin(t * 0.9 + c.ph) * 0.18; c.g.position.y = c.base.y + b; c.isl.position.y = b; }
    for (let i = 0; i < NF; i++) {
      const f = feeP[i]; if (!reduce) f.s += dt * f.v; if (f.s > 1) f.s -= 1;
      helixPoint(coins[f.c].g.position, RC, f.s, f.a, 1.4, 1.6, fp);
      o.position.copy(fp); o.quaternion.setFromAxisAngle(ax, f.a + t * 2); o.scale.setScalar(f.sz * (1 - f.s * 0.7)); o.updateMatrix(); fees.setMatrixAt(i, o.matrix);
    }
    fees.instanceMatrix.needsUpdate = true;
    // story mode
    if (story != null) {
      storyPos(story, fp); hero.visible = true; trail.visible = true; hero.position.copy(fp); hero.rotation.set(t * 2, t * 3, 0);
      const enc = story > 0.55; heroMat.color.set(enc ? 0xff5a32 : 0xffe2b0); heroMat.emissive.set(enc ? 0xff3010 : 0xffa040);
      heroLight.position.copy(fp); heroLight.intensity = 18;
      storyHist.unshift(fp.clone()); if (storyHist.length > trailN) storyHist.pop();
      for (let i = 0; i < trailN; i++) { const q = storyHist[Math.min(i, storyHist.length - 1)]; o.position.copy(q); o.quaternion.identity(); o.scale.setScalar(0.2 * (1 - i / trailN)); o.updateMatrix(); trail.setMatrixAt(i, o.matrix); }
      trail.instanceMatrix.needsUpdate = true;
      const flare = Math.max(0, 1 - Math.abs(story - 0.55) / 0.08);
      ringMain.material.color.setRGB(2.4 + flare * 3, 1.15 + flare * 1.6, 0.72 + flare * 1.2);
      disc.material.opacity = 0.07 + flare * 0.35;
      if (lights[1]) lights[1].intensity = 3.2 + Math.max(0, (story - 0.9) / 0.1) * 30;
    } else if (hero.visible) {
      hero.visible = false; trail.visible = false; heroLight.intensity = 0; ringMain.material.color.setRGB(2.4, 1.15, 0.72); if (lights[1]) lights[1].intensity = 3.2; storyHist.length = 0;
    }
    composer.render();
    frames++;
    if (frames === 2 && opts.onReady) opts.onReady();
  }
  let lastDraw = 0;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    // behind the content bands the world only needs a slow heartbeat
    const lvl = opts.active ? opts.active() : 1;
    if (lvl < 1 && now - lastDraw < 1000 / 10) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; lastDraw = now;
    frame(dt);
  }
  requestAnimationFrame(loop);
  // a frame even if rAF is throttled (background tab, headless)
  setTimeout(() => { if (frames === 0) frame(0.016); }, 1500);
  function flyIn(opts2 = {}) {
    // pass through the ring beside the drill, not through it
    const side = new THREE.Vector3().crossVectors(RN, D).normalize().multiplyScalar(2.7);
    const front = RC.clone().add(side).addScaledVector(RN, 7.5), through = RC.clone().add(side).addScaledVector(RN, -9);
    fly = { t0: performance.now(), dur: reduce ? 0.3 : (opts2.dur || 2.6), p0: camPos.clone(), p1: front, p2: through, l0: camLook.clone(), l2: RC.clone().add(side).addScaledVector(RN, -30), onFlash: opts2.onFlash, onDone: opts2.onDone };
  }
  return { frame, flyIn, setStory: v => { story = v; }, setTarget: (pos, look) => { ext = pos ? { pos, look } : null; }, shots: SHOTS, setShot: (n, snap) => { if (!SHOTS[n]) return; shot = n; if (snap) { camPos.set(...SHOTS[n].pos); camLook.set(...SHOTS[n].look); } } };
}
