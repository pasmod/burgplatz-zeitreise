/**
 * Small native Babylon facial-hair meshes for the historical NPC layers.
 * Each fit is sampled from the named source GLB's anatomical skin triangles
 * in head joint bind-local coordinates. Front is +Z and height is +Y.
 * The paired left and right samples differ by at most 0.00001 rig units.
 * Moustache rows hold [absX, topY, bottomY, five front-Z samples].
 * Sideburn rows hold [y, backZ, frontZ, five outer absX samples].
 * Grooming styles are plausible period details for fictional characters.
 */
const FIT = {
  jordan: {
    moustache: [
      [0.004, -0.017, -0.025, [0.11355, 0.1148, 0.11602, 0.11605, 0.11544]],
      [0.01, -0.016, -0.027, [0.11164, 0.11309, 0.1142, 0.11391, 0.1126]],
      [0.017, -0.017, -0.029, [0.10767, 0.10856, 0.10946, 0.1095, 0.10788]],
      [0.024, -0.02, -0.032, [0.1025, 0.103, 0.10319, 0.1028, 0.10146]],
      [0.03, -0.023, -0.032, [0.0978, 0.09784, 0.09777, 0.09762, 0.09735]],
      [0.035, -0.024, -0.025, [0.09313, 0.09313, 0.09311, 0.09309, 0.09306]],
    ],
    sideburns: [
      [0.062, 0.017, 0.033, [0.06904, 0.06803, 0.06693, 0.06578, 0.0647]],
      [0.05, 0.02, 0.034, [0.06915, 0.06809, 0.06698, 0.06597, 0.06502]],
      [0.038, 0.023, 0.035, [0.0693, 0.06829, 0.06733, 0.06651, 0.06579]],
      [0.025, 0.026, 0.037, [0.06862, 0.06796, 0.0674, 0.06689, 0.06639]],
      [0.012, 0.029, 0.038, [0.06718, 0.06682, 0.06645, 0.06608, 0.0657]],
      [-0.001, 0.031, 0.038, [0.06561, 0.06533, 0.06505, 0.06475, 0.06445]],
      [-0.013, 0.034, 0.035, [0.06369, 0.06364, 0.06359, 0.06354, 0.06349]],
    ],
  },
  sam: {
    moustache: [
      [0.004, -0.02, -0.03, [0.10171, 0.10225, 0.10323, 0.10464, 0.10476]],
      [0.01, -0.018, -0.031, [0.0991, 0.09998, 0.10124, 0.10273, 0.10253]],
      [0.017, -0.018, -0.032, [0.09639, 0.09697, 0.09759, 0.0982, 0.09793]],
      [0.024, -0.02, -0.033, [0.09311, 0.09348, 0.09362, 0.09336, 0.09253]],
      [0.03, -0.024, -0.033, [0.08983, 0.08973, 0.08952, 0.08913, 0.0886]],
      [0.035, -0.025, -0.026, [0.08614, 0.08609, 0.08603, 0.08598, 0.08593]],
    ],
    sideburns: [
      [0.064, 0.023, 0.038, [0.06944, 0.06874, 0.06805, 0.06732, 0.06656]],
      [0.051, 0.026, 0.04, [0.069, 0.06834, 0.0677, 0.06707, 0.0665]],
      [0.038, 0.03, 0.042, [0.0684, 0.06794, 0.06757, 0.06724, 0.06692]],
      [0.025, 0.032, 0.044, [0.06832, 0.06806, 0.0678, 0.06752, 0.06721]],
      [0.012, 0.034, 0.044, [0.0677, 0.06752, 0.06733, 0.06709, 0.06675]],
      [-0.001, 0.036, 0.044, [0.06609, 0.06591, 0.06567, 0.06541, 0.0651]],
      [-0.013, 0.038, 0.039, [0.06417, 0.06413, 0.0641, 0.06406, 0.06403]],
    ],
  },
};

const EMPTY = Object.freeze({ meshes: Object.freeze([]), style: 'none', dispose() {} });
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;

function headNode(npc) {
  const isHead = name => /(?:^|[.\s|_-])head$/i.test(name || '');
  for (const skeleton of npc.skeletons || []) {
    const bone = skeleton.bones?.find(item => isHead(item.name));
    const node = bone?.getTransformNode?.();
    if (node) return node;
  }
  return npc.root.getChildTransformNodes?.(false).find(node => isHead(node.name));
}

function point(grid, along, across, sign, front) {
  const row = clamp(along) * (grid.length - 1);
  const i = Math.min(grid.length - 2, Math.floor(row));
  const [a, b] = [grid[i], grid[i + 1]];
  const cross = clamp(across) * 4;
  const j = Math.min(3, Math.floor(cross));
  const sample = samples => mix(samples[j], samples[j + 1], cross - j);
  const u = mix(a[0], b[0], row - i);
  const v = mix(mix(a[1], a[2], across), mix(b[1], b[2], across), row - i);
  const depth = mix(sample(a[3]), sample(b[3]), row - i);
  return front ? [sign * u, v, depth] : [sign * depth, u, v];
}

function surfaceNormal(grid, along, across, sign, front) {
  const a = point(grid, along - .004, across, sign, front);
  const b = point(grid, along + .004, across, sign, front);
  const c = point(grid, along, across - .008, sign, front);
  const d = point(grid, along, across + .008, sign, front);
  const u = b.map((value, i) => value - a[i]);
  const v = d.map((value, i) => value - c[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const outward = front ? n[2] : n[0] * sign;
  const length = Math.hypot(...n);
  if (length < 1e-10) return front ? [0, 0, 1] : [sign, 0, 0];
  return n.map(value => value * (outward < 0 ? -1 : 1) / length);
}

function strands(grid, front, variant) {
  const positions = [], normals = [], colors = [], indices = [];
  let seed = (1234567 + variant * 9703) >>> 0;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  function vertex(along, across, sign, lift, tint) {
    const p = point(grid, along, across, sign, front);
    const n = surfaceNormal(grid, along, across, sign, front);
    positions.push(...p.map((value, i) => value + n[i] * lift));
    normals.push(...n);
    colors.push(tint, tint, tint, 1);
  }

  function ribbon(sign, steps, sample) {
    const start = positions.length / 3;
    for (let step = 0; step <= steps; step++) {
      const [along, across, halfWidth, lift, tint] = sample(step / steps);
      if (front) {
        vertex(along - halfWidth, across, sign, lift, tint);
        vertex(along + halfWidth, across, sign, lift, tint);
      } else {
        vertex(along, across - halfWidth, sign, lift, tint);
        vertex(along, across + halfWidth, sign, lift, tint);
      }
      if (step) {
        const p = start + (step - 1) * 2;
        indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
      }
    }
  }

  for (const sign of [-1, 1]) {
    // A narrow fitted core keeps the shape readable at walking distance.
    const rows = 5;
    const columns = 14;
    const start = positions.length / 3;
    for (let i = 0; i <= columns; i++) {
      const along = mix(.025, .97, i / columns);
      const roundedEdge = Math.sin(Math.PI * (i / columns)) ** .35;
      for (let j = 0; j <= rows; j++) {
        const across = .5 + ((j / rows) - .5) * (.25 + .57 * roundedEdge);
        vertex(along, across, sign, .00095, .79 + rand() * .16);
        if (i && j) {
          const q = start + i * (rows + 1) + j;
          indices.push(q - rows - 2, q - rows - 1, q, q - rows - 2, q, q - 1);
        }
      }
    }

    const count = front ? 125 : 105;
    for (let hair = 0; hair < count; hair++) {
      const along = mix(.025, .94, rand());
      const across = mix(.055, .89, rand());
      const growth = front ? mix(.08, .23, rand()) : mix(.08, .20, rand());
      const bend = (rand() - .46) * (front ? .16 : .22);
      const width = front ? mix(.0035, .008, rand()) : mix(.013, .028, rand());
      const tint = rand() > .82 ? mix(.98, 1.22, rand()) : mix(.72, .98, rand());
      ribbon(sign, 4, fraction => {
        const curve = Math.sin(fraction * Math.PI);
        const end = Math.min(.995, along + growth * fraction);
        const drift = front ? .24 * fraction : .025 * fraction;
        return [end, clamp(across + drift + curve * bend), width * (1 - .84 * fraction), .0014 + curve * .00042, tint];
      });
    }
  }
  return { positions, normals, colors, indices };
}

/** Build a removable head-bone accessory on a native actor. */
export function createPeriodGrooming(game, npc, { era, model, variant = 0 } = {}) {
  const { B, scene } = game || {};
  const id = (typeof model === 'string' ? model : model?.id || '').toLowerCase();
  const profile = FIT[id];
  if (!B || !scene || !npc?.root || !profile || (era !== '1908' && era !== '1869')) return EMPTY;
  const head = headNode(npc);
  if (!head || head.isDisposed?.()) return EMPTY;

  const front = era === '1908';
  const style = front ? 'moustache' : 'sideburns';
  const safeVariant = Math.abs(Math.trunc(Number(variant) || 0)) % 10000;
  const data = strands(profile[style], front, safeVariant);
  const mesh = new B.Mesh(`period-${style}-${id}-${safeVariant}`, scene);
  Object.assign(new B.VertexData(), data).applyToMesh(mesh);
  mesh.parent = head;
  mesh.isPickable = false;
  mesh.receiveShadows = true;

  const material = new B.PBRMaterial(`period-grooming-${id}-${safeVariant}`, scene);
  const shades = id === 'jordan' ? ['#302721', '#382d26', '#3d332e'] : ['#514139', '#5e4f44', '#62544d'];
  material.albedoColor = B.Color3.FromHexString(shades[safeVariant % shades.length]).toLinearSpace();
  material.metallic = 0;
  material.roughness = .91;
  material.environmentIntensity = .5;
  material.backFaceCulling = false;
  mesh.material = material;

  // These sub-millimetre strands receive light and shade. Adding them to a
  // metre-scale cascaded shadow map would produce facial self-shadow acne.
  let disposed = false;
  return {
    meshes: [mesh],
    style,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (!mesh.isDisposed()) mesh.dispose(false, false);
      material.dispose(false, false);
    },
  };
}
