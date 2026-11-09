/**
 * Optional, genuine 3D period accessories for the native Babylon GLB crowd.
 * The base characters are modern CC0 anatomical assets, not scans of historical
 * Düsseldorf residents. These accessories are plausible c. 1908 wardrobe,
 * not a claim that a particular individual wore a particular garment.
 *
 * Nothing here replaces a textured head, body, skeleton or animation with a
 * billboard or procedural human. Only hats and per-instance fabric tinting are
 * added to the existing, rigged human model.
 */

export const PERIOD_WARDROBE_NOTES = Object.freeze({
  period: 'um 1908',
  status: 'plausible Ergänzung, nicht individuell historisch belegt',
  hats: {
    bowler: 'Dunkler steifer runder Filzhut (Melone).',
    homburg: 'Dunkler Filzhut mit höherer Krone und eingefasster Krempe.',
    flatcap: 'Weiche flache Schirmmütze aus gedecktem Wollstoff.',
  },
  baseOutfit: 'Zeitgenössisch angelegter 3D-Geschäftsanzug als Annäherung. Schnitt, Details und Schuhe sind kein exakter Kleidungsscan von 1908.',
  faces: 'Fiktive, unterschiedliche MakeHuman-Figuren. Keine historischen Personenporträts.',
});

const HAT_COLOURS = ['#272824', '#4b4338', '#373c38', '#5b5142'];

// Measured in the head bone's local coordinates from the skinned GLB meshes.
// At Y=.080, scalp width×depth in rig units is about 142×193 mm (Jordan),
// 144×177 mm (Harper), and 140×198 mm (Sam). Allow for oblique contours.
const HEAD_FIT = {
  jordan: { y: .080, z: .0057, halfWidth: .0775, halfDepth: .1035 },
  harper: { y: .080, z: .0082, halfWidth: .0785, halfDepth: .0965 },
  sam: { y: .080, z: .0032, halfWidth: .077, halfDepth: .108 },
};

// [height above brim, width multiplier, depth multiplier, forward shift].
const CROWN_PROFILE = {
  bowler: [
    [0, 1, 1, 0], [.018, 1.02, 1.018, 0], [.042, .988, .995, 0],
    [.066, .884, .900, 0], [.086, .698, .720, 0], [.101, .421, .450, 0],
    [.108, .17, .19, 0], [.110, 0, 0, 0],
  ],
  homburg: [
    [0, 1, 1, 0], [.019, 1.014, 1.012, 0], [.048, .956, .974, 0],
    [.077, .892, .932, 0], [.100, .802, .853, 0], [.111, .652, .706, 0],
    [.114, .410, .519, 0], [.107, .165, .315, 0], [.104, 0, 0, 0],
  ],
  flatcap: [
    [0, 1, 1, 0], [.012, 1.045, 1.062, .004], [.027, 1.072, 1.09, .007],
    [.042, 1.005, 1.047, .007], [.055, .853, .886, .005],
    [.064, .637, .666, .003], [.071, .349, .418, .001], [.075, 0, 0, 0],
  ],
};

function modelFit(npc, options) {
  const id = options.model || options.style;
  if (Object.hasOwn(HEAD_FIT, id)) return HEAD_FIT[id];
  for (const mesh of npc.meshes || []) {
    const match = `${mesh.name} ${mesh.material?.name || ''}`.match(/\b(jordan|harper|sam)\b/i);
    if (match) return HEAD_FIT[match[1].toLowerCase()];
  }
  return HEAD_FIT.jordan;
}

function endsIn(name, token) {
  return new RegExp(`(?:^|[.\\s|_-])${token}$`, 'i').test(name || '');
}

function findRigNode(npc, token) {
  for (const skeleton of npc.skeletons || []) {
    const bone = skeleton.bones?.find(b => endsIn(b.name, token));
    const node = bone?.getTransformNode?.();
    if (node) return node;
  }
  return npc.root?.getChildTransformNodes?.(false).find(n => endsIn(n.name, token)) || null;
}

/**
 * Add one period hat and optional independent wool tint to an imported GLB.
 *
 * @param {object} game Native Babylon adapter, exposes B and scene.
 * @param {object} npc Result of game.loadNpc(); exposes root, meshes, skeletons.
 * @param {object} options {era,model,style,variant,hatColour,fabricColour,headOffset}
 * style: bowler | homburg | flatcap | none. Default varies with variant.
 * headOffset: optional [x,y,z] in the source character's rig units.
 * @returns {{meshes:Array,notes:object,update:Function,dispose:Function}}
 */
export function createPeriodWardrobe(game, npc, options = {}) {
  const { B, scene } = game;
  const meshes = [], materials = [], restoredVisibility = [], restoredMaterials = [];
  let disposed = false;
  const empty = { meshes, notes: PERIOD_WARDROBE_NOTES, update() {}, dispose() {} };
  if (!B || !scene || !npc?.root || options.era === 'heute' || options.style === 'none') return empty;

  const variant = Math.abs(Number(options.variant) || 0);
  const styles = ['bowler', 'homburg', 'flatcap'];
  // The Homburg source dates to 1882. Do not use it in the 1869 scene.
  const style = options.era === '1869' ? 'bowler' :
    (styles.includes(options.style) ? options.style : styles[variant % styles.length]);
  const head = findRigNode(npc, 'head');
  if (!head) return empty;

  const fit = modelFit(npc, options);
  const anchor = new B.TransformNode(`period-hat-${variant}`, scene);
  anchor.parent = head;
  const offset = options.headOffset || [0, fit.y, fit.z];
  anchor.position.set(offset[0], offset[1], offset[2]);

  const felt = new B.PBRMaterial(`period-felt-${variant}`, scene);
  felt.albedoColor = B.Color3.FromHexString(options.hatColour || HAT_COLOURS[variant % HAT_COLOURS.length]);
  felt.metallic = 0;
  felt.roughness = .96;
  felt.environmentIntensity = .5;
  const ribbon = new B.PBRMaterial(`period-ribbon-${variant}`, scene);
  ribbon.albedoColor = style === 'flatcap' ? felt.albedoColor.scale(.75) : B.Color3.FromHexString('#191c1a');
  ribbon.metallic = 0;
  ribbon.roughness = .75;
  materials.push(felt, ribbon);

  function add(mesh, material = felt) {
    mesh.parent = anchor;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    meshes.push(mesh);
    return mesh;
  }

  // Thin surfaces keep the opening free of geometry where it crosses the
  // forehead. Closed rings share their seam vertices for smooth normals.
  function surface(name, rows, sample, material, { sweep = 2 * Math.PI, reverse = false } = {}) {
    const closed = sweep === 2 * Math.PI;
    const segments = closed ? 64 : 32;
    const columns = closed ? segments : segments + 1;
    const positions = [], indices = [], normals = [];
    for (const row of rows) {
      for (let i = 0; i < columns; i++) {
        const angle = i * sweep / segments - (closed ? 0 : sweep / 2);
        positions.push(...sample(row, angle));
      }
    }
    for (let row = 0; row < rows.length - 1; row++) {
      for (let i = 0; i < segments; i++) {
        const a = row * columns + i;
        const b = row * columns + (i + 1) % columns;
        const c = a + columns;
        const d = b + columns;
        if (reverse) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
    B.VertexData.ComputeNormals(positions, indices, normals, { useRightHandedSystem: scene.useRightHandedSystem });
    const vertexData = new B.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    const mesh = new B.Mesh(`${name}-${variant}`, scene);
    vertexData.applyToMesh(mesh);
    return add(mesh, material);
  }

  const { halfWidth, halfDepth } = fit;
  const ellipse = ([height, widthScale, depthScale, forward], angle) => [
    Math.sin(angle) * halfWidth * widthScale,
    height,
    forward + Math.cos(angle) * halfDepth * depthScale,
  ];
  felt.sideOrientation = ribbon.sideOrientation = B.Material.CounterClockWiseSideOrientation;
  felt.backFaceCulling = ribbon.backFaceCulling = false;
  surface('felt-crown', CROWN_PROFILE[style], ellipse, felt);

  if (style === 'flatcap') {
    const peak = (amount, angle) => {
      const extension = Math.cos(angle * Math.PI / 2.3) * .044 * amount;
      return [Math.sin(angle) * (halfWidth + extension * .27), -.004 - amount * .009,
        Math.cos(angle) * (halfDepth + extension)];
    };
    surface('cap-peak', [0, .55, 1], peak, felt, { sweep: 2.3, reverse: true });
    surface('cap-band', [[-.004, .986, .988, 0], [.003, 1.018, 1.023, .001],
      [.010, 1.047, 1.059, .003]], ellipse, ribbon);
  } else {
    const isHomburg = style === 'homburg';
    const sideReach = isHomburg ? .032 : .026;
    const endReach = isHomburg ? .036 : .029;
    const brim = ([amount, height], angle) => {
      const side = Math.sin(angle), end = Math.cos(angle);
      const curl = (isHomburg ? .012 : .008) * side * side - .004 * end * end;
      return [side * (halfWidth * .985 + sideReach * amount), height + curl * amount * amount,
        end * (halfDepth * .985 + endReach * amount)];
    };
    surface('felt-brim', [[0, 0], [.42, -.002], [.8, -.002], [1, 0]], brim, felt, { reverse: true });
    surface('felt-bound-edge', [[.956, .0008], [1.024, .0015], [1.06, -.0012], [1.02, -.0036]],
      brim, ribbon, { reverse: true });
    surface('felt-band', [[.003, 1.009, 1.01, 0], [.012, 1.02, 1.02, 0],
      [.024, 1.024, 1.026, 0]], ellipse, ribbon);
  }

  // The source hair is modern. A period hat should not sit on top of a large
  // modern hairstyle. Preserve original visibility so disposal is reversible.
  for (const mesh of npc.meshes || []) {
    if (/afro01|short01|fine scalp roots/i.test(mesh.name || '')) {
      restoredVisibility.push([mesh, mesh.isVisible]);
      mesh.isVisible = false;
    }
  }

  // Native GLB instances share their base materials. Clone before tinting, so
  // one person's coat colour never changes another character's clothing.
  if (options.fabricColour) {
    for (const mesh of npc.meshes || []) {
      const source = mesh.material;
      const cloth = /tailored business fabric|male_elegantsuit|sam\s*\|\s*original (?:top|bottom)/i;
      if (!source || !cloth.test(`${source.name} ${mesh.name}`)) continue;
      const clone = source.clone(`${source.name}-period-${variant}`);
      if (clone.albedoColor) clone.albedoColor = clone.albedoColor.multiply(B.Color3.FromHexString(options.fabricColour));
      clone.metallic = 0;
      clone.roughness = Math.max(.8, clone.roughness || 0);
      mesh.material = clone;
      restoredMaterials.push([mesh, source]);
      materials.push(clone);
    }
  }

  // Rig parenting follows the native skeletal animation; no fake head tracking
  // or camera-facing sprite update is necessary.
  const unregisterAccessories = game.registerNpcAccessories?.(npc, meshes) || (() => {});
  return {
    meshes,
    notes: PERIOD_WARDROBE_NOTES,
    style,
    anchor,
    update() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      unregisterAccessories();
      for (const [mesh, visible] of restoredVisibility) if (!mesh.isDisposed?.()) mesh.isVisible = visible;
      for (const [mesh, material] of restoredMaterials) if (!mesh.isDisposed?.()) mesh.material = material;
      anchor.dispose(false, false);
      for (const material of materials) material.dispose(false, false);
    },
  };
}
