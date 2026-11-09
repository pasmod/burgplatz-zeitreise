import { configureGameRendering } from './engine-quality.js';

/** Babylon.js 9.35 backend. Three is only the scene-authoring interchange here. */
const BUNDLE = './assets/babylon/babylon.js';
const LOADERS = './assets/babylon/babylonjs.loaders.min.js';
let runtimePromise;
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Engine asset unavailable: ${url}`));
    document.head.append(script);
  });
}
async function runtime() {
  if (!runtimePromise) runtimePromise = (async () => {
    if (!window.BABYLON) await loadScript(BUNDLE);
    await loadScript(LOADERS);
    return window.BABYLON;
  })();
  return runtimePromise;
}
function multiplyMatrices(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
    let value = 0;
    for (let k = 0; k < 4; k++) value += a[k * 4 + row] * b[col * 4 + k];
    out[col * 4 + row] = value;
  }
  return out;
}
const rgba = (B, c, alpha = 1) => new B.Color4(c?.r ?? 1, c?.g ?? 1, c?.b ?? 1, alpha);
const rgb = (B, c, fallback = 1) => new B.Color3(c?.r ?? fallback, c?.g ?? fallback, c?.b ?? fallback);

/** Exported separately so NullEngine tests can verify the interchange. */
export function createWorldConverter(B, scene, { headless = false } = {}) {
  const geometries = new Map(), materials = new Map(), textures = new Map();
  let meshes = [], shadowCasters = [];
  function texture(source, linear = false) {
    if (!source || headless) return null;
    const key = `${source.uuid}:${linear}`;
    if (textures.has(key)) return textures.get(key);
    const image = source.image || source.source?.data;
    let target;
    if (image?.src || image?.currentSrc) {
      target = new B.Texture(image.currentSrc || image.src, scene, false, source.flipY !== false, B.Texture.TRILINEAR_SAMPLINGMODE);
    } else if (image?.getContext) {
      target = new B.DynamicTexture(`canvas-${source.uuid}`, { width: image.width, height: image.height }, scene, true, B.Texture.TRILINEAR_SAMPLINGMODE);
      target.getContext().drawImage(image, 0, 0);
      target.update(source.flipY !== false);
    } else return null;
    target.gammaSpace = !linear;
    target.hasAlpha = true;
    target.uScale = source.repeat?.x ?? 1;
    target.vScale = source.repeat?.y ?? 1;
    target.uOffset = source.offset?.x ?? 0;
    target.vOffset = source.offset?.y ?? 0;
    target.wrapU = source.wrapS === 1000 ? B.Texture.WRAP_ADDRESSMODE : source.wrapS === 1002 ? B.Texture.MIRROR_ADDRESSMODE : B.Texture.CLAMP_ADDRESSMODE;
    target.wrapV = source.wrapT === 1000 ? B.Texture.WRAP_ADDRESSMODE : source.wrapT === 1002 ? B.Texture.MIRROR_ADDRESSMODE : B.Texture.CLAMP_ADDRESSMODE;
    target.anisotropicFilteringLevel = 8;
    textures.set(key, target);
    return target;
  }
  function material(source) {
    if (!source) return null;
    if (Array.isArray(source)) {
      const key = source.map(s => s?.uuid).join('|');
      if (materials.has(key)) return materials.get(key);
      const multi = new B.MultiMaterial(`multi-${key}`, scene);
      multi.subMaterials = source.map(material);
      materials.set(key, multi);
      return multi;
    }
    if (materials.has(source.uuid)) return materials.get(source.uuid);
    const target = new B.PBRMaterial(`pbr-${source.uuid}`, scene);
    target.albedoColor = rgb(B, source.color);
    target.alpha = source.opacity ?? 1;
    target.metallic = source.metalness ?? 0;
    target.roughness = source.roughness ?? .85;
    target.albedoTexture = texture(source.map);
    target.bumpTexture = texture(source.normalMap || source.bumpMap, true);
    if (target.bumpTexture) {
      target.bumpTexture.level = source.normalMap ? (source.normalScale?.x ?? 1) : Math.max(.05, source.bumpScale ?? .1);
      // Poly Haven OpenGL tangent normal maps use positive green/up.
      target.invertNormalMapY = false;
    }
    target.ambientTexture = texture(source.aoMap, true);
    target.ambientTextureStrength = source.aoMapIntensity ?? .5;
    target.useAmbientInGrayScale = true;
    target.metallicTexture = texture(source.roughnessMap || source.metalnessMap, true);
    target.useRoughnessFromMetallicTextureGreen = Boolean(source.roughnessMap);
    target.useRoughnessFromMetallicTextureAlpha = false;
    target.useMetallnessFromMetallicTextureBlue = Boolean(source.metalnessMap);
    target.emissiveColor = rgb(B, source.emissive, 0).scale(source.emissiveIntensity ?? 1);
    target.emissiveTexture = texture(source.emissiveMap);
    target.backFaceCulling = source.side !== 2;
    target.twoSidedLighting = source.side === 2;
    target.sideOrientation = B.Material.CounterClockWiseSideOrientation;
    target.useVertexColors = Boolean(source.vertexColors);
    if (source.alphaTest > 0) {
      target.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHATEST;
      target.alphaCutOff = source.alphaTest;
      target.useAlphaFromAlbedoTexture = true;
    } else if (source.transparent) {
      target.transparencyMode = B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
      target.useAlphaFromAlbedoTexture = true;
      target.disableDepthWrite = source.depthWrite === false;
    }
    materials.set(source.uuid, target);
    return target;
  }
  function geometry(source) {
    if (geometries.has(source.uuid)) return geometries.get(source.uuid);
    const positions = source.attributes?.position;
    if (!positions) return null;
    const data = new B.VertexData();
    data.positions = Array.from(positions.array);
    data.indices = source.index ? Array.from(source.index.array) : Array.from({ length: positions.count }, (_, i) => i);
    if (source.attributes.normal) data.normals = Array.from(source.attributes.normal.array);
    else { data.normals = []; B.VertexData.ComputeNormals(data.positions, data.indices, data.normals); }
    if (source.attributes.uv) data.uvs = Array.from(source.attributes.uv.array);
    if (source.attributes.uv1 || source.attributes.uv2) data.uvs2 = Array.from((source.attributes.uv1 || source.attributes.uv2).array);
    else if (data.uvs) data.uvs2 = [...data.uvs];
    const colors = source.attributes.color;
    if (colors) {
      data.colors = [];
      for (let i = 0; i < colors.count; i++) data.colors.push(colors.getX(i), colors.getY(i), colors.getZ(i), colors.itemSize > 3 ? colors.getW(i) : 1);
    }
    const result = new B.Geometry(`geometry-${source.uuid}`, scene, data, false);
    geometries.set(source.uuid, result);
    return result;
  }
  function clear() {
    for (const mesh of meshes) mesh.dispose(false, false);
    meshes = []; shadowCasters = [];
    for (const geo of geometries.values()) if (!geo.isDisposed()) geo.dispose();
    geometries.clear();
  }
  function rebuild(world) {
    clear();
    if (!world) return { meshes, shadowCasters };
    world.updateMatrixWorld(true);
    world.traverse(source => {
      if (!source.isMesh || !source.visible || !source.geometry || source.material?.isShaderMaterial) return;
      // Old flat people are specifically omitted; native rigged GLBs are loaded separately.
      const geo = geometry(source.geometry);
      if (!geo) return;
      const mesh = new B.Mesh(source.name || `world-${source.uuid}`, scene);
      // Thin-instance matrices are vertex buffers owned by Babylon Geometry.
      // Different Three batches often share boxGeo/planeGeo, but must not share
      // these per-batch matrix attributes or later batches overwrite earlier ones.
      const meshGeometry = source.isInstancedMesh ? geo.copy(`batch-geometry-${source.uuid}`) : geo;
      meshGeometry.applyToMesh(mesh);
      mesh.material = material(source.material);
      mesh.receiveShadows = Boolean(source.receiveShadow);
      mesh.isPickable = false;
      mesh.metadata = { sourceUuid: source.uuid, historicApproximation: true };
      if (source.isInstancedMesh) {
        const data = new Float32Array(source.count * 16);
        for (let i = 0; i < source.count; i++) {
          const local = source.instanceMatrix.array.subarray(i * 16, i * 16 + 16);
          data.set(multiplyMatrices(source.matrixWorld.elements, local), i * 16);
        }
        mesh.thinInstanceSetBuffer('matrix', data, 16, true);
        mesh.thinInstanceRefreshBoundingInfo(true);
      } else {
        const m = B.Matrix.FromArray(source.matrixWorld.elements);
        const scale = new B.Vector3(), rotation = new B.Quaternion(), position = new B.Vector3();
        m.decompose(scale, rotation, position);
        mesh.scaling.copyFrom(scale); mesh.rotationQuaternion = rotation; mesh.position.copyFrom(position);
      }
      if (Array.isArray(source.material) && source.geometry.groups?.length) {
        mesh.subMeshes = [];
        for (const group of source.geometry.groups) new B.SubMesh(group.materialIndex, 0, mesh.getTotalVertices(), group.start, group.count, mesh);
      }
      mesh.computeWorldMatrix(true);
      meshes.push(mesh);
      const radius = mesh.getBoundingInfo().boundingSphere.radiusWorld;
      const isPlane = source.geometry.type === 'PlaneGeometry';
      if (source.castShadow && radius > .3 && !isPlane && !(source.material?.transparent && !source.material?.alphaTest)) shadowCasters.push(mesh);
    });
    return { meshes, shadowCasters };
  }
  return { rebuild, clear, get meshes() { return meshes; }, dispose() { clear(); for (const m of materials.values()) m.dispose(false, false); for (const t of textures.values()) t.dispose(); materials.clear(); textures.clear(); } };
}

export async function createGameEngine({ canvas, camera: sourceCamera, assetsBase = './assets/', onProgress = () => {}, B: injectedB, engine: injectedEngine, headless = false, quality = 'auto' } = {}) {
  const B = injectedB || await runtime();
  const engine = injectedEngine || new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, powerPreference: 'high-performance' });
  const scene = new B.Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = new B.Color4(.69, .76, .79, 1);
  scene.ambientColor = B.Color3.Black();
  const camera = new B.FreeCamera('burgplatz-player', new B.Vector3(13, 1.72, 25), scene);
  camera.minZ = .12; camera.maxZ = 1500; camera.fov = (sourceCamera?.fov ?? 61) * Math.PI / 180;
  camera.rotationQuaternion = new B.Quaternion();
  scene.activeCamera = camera;
  const sun = new B.DirectionalLight('burgplatz-sun', new B.Vector3(.64, -.69, .34), scene);
  const hemisphere = new B.HemisphericLight('burgplatz-fill', new B.Vector3(0, 1, 0), scene);
  const rendering = headless ? { update() {}, setTimeOfDay() {}, setShadowCasters() {}, prepareMaterials() {}, dispose() {} } : configureGameRendering(B, { scene, engine, camera, sun, hemisphere, quality });
  const converter = createWorldConverter(B, scene, { headless });
  let worldCasters = [], npcCasters = [], npcObjects = new Set(), disposed = false;
  const npcContainers = new Map();
  let npcSequence = 0;
  function updateCasters() { rendering.setShadowCasters([...worldCasters, ...npcCasters.filter(m => !m.isDisposed())]); }
  if (!headless) {
    try {
      onProgress('Natürliches Licht wird geladen …');
      const environment = new B.HDRCubeTexture(`${assetsBase}pbr/daylight.hdr`, scene, 256, false, true, false, true);
      scene.environmentTexture = environment;
      const sky = scene.createDefaultSkybox(environment, true, 1200, .05, false);
      if (sky) { sky.isPickable = false; sky.infiniteDistance = true; }
    } catch (error) { console.warn('HDR environment unavailable', error); }
  }
  const river = B.MeshBuilder.CreateGround('rhein-water', { width: 340, height: 1600, subdivisions: 1 }, scene);
  river.position.set(-220, -2.3, 0);
  river.isPickable = false;
  const riverMaterial = new B.PBRMaterial('rhein-reflections', scene);
  riverMaterial.albedoColor = B.Color3.FromHexString('#527d7d');
  riverMaterial.metallic = .16; riverMaterial.roughness = .22;
  riverMaterial.environmentIntensity = .9;
  let riverRipples = null;
  if (!headless) {
    // A real tangent-space ripple normal map, with flow in the native PBR material.
    const size = 128, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
      const dx = .18 * Math.cos(u * 5 + v * 2) + .08 * Math.cos(u * 13 - v * 7);
      const dy = .12 * Math.cos(u * 3 + v * 6) + .07 * Math.cos(u * 9 - v * 11);
      const n = new B.Vector3(dx, dy, 1).normalize(), p = (y * size + x) * 4;
      pixels[p] = Math.round((n.x * .5 + .5) * 255); pixels[p + 1] = Math.round((n.y * .5 + .5) * 255); pixels[p + 2] = Math.round((n.z * .5 + .5) * 255); pixels[p + 3] = 255;
    }
    riverRipples = B.RawTexture.CreateRGBATexture(pixels, size, size, scene, true, false, B.Texture.TRILINEAR_SAMPLINGMODE);
    riverRipples.gammaSpace = false; riverRipples.wrapU = riverRipples.wrapV = B.Texture.WRAP_ADDRESSMODE;
    riverRipples.uScale = 48; riverRipples.vScale = 128; riverRipples.level = .45;
    riverMaterial.bumpTexture = riverRipples;
    riverMaterial.clearCoat.isEnabled = true; riverMaterial.clearCoat.intensity = .35; riverMaterial.clearCoat.roughness = .12;
  }
  river.material = riverMaterial;
  function syncCamera(threeCamera) {
    if (!threeCamera) return;
    threeCamera.updateMatrixWorld?.(true);
    camera.position.set(threeCamera.position.x, threeCamera.position.y, threeCamera.position.z);
    const q = threeCamera.quaternion;
    if (q) camera.rotationQuaternion.set(q.x, q.y, q.z, q.w);
    camera.fov = (threeCamera.fov ?? 61) * Math.PI / 180;
    camera.getViewMatrix(true);
  }
  async function loadNpc({ url, position = [0, 0, 0], rotationY = 0, scale = 1, height, animationName, animationSpeed = 1 } = {}) {
    if (!url) throw new Error('NPC model URL is required.');
    if (!npcContainers.has(url)) {
      const split = url.lastIndexOf('/');
      const pending = B.SceneLoader.LoadAssetContainerAsync(split >= 0 ? url.slice(0, split + 1) : '', split >= 0 ? url.slice(split + 1) : url, scene);
      npcContainers.set(url, pending);
      pending.catch(() => { if (npcContainers.get(url) === pending) npcContainers.delete(url); });
    }
    const container = await npcContainers.get(url);
    if (disposed) throw new Error('Engine disposed during NPC import.');
    // Clones share source geometry and textures, but have independent skeletons
    // and animation groups. A 23 MB human is decoded once per source URL.
    const id = ++npcSequence;
    const entries = container.instantiateModelsToScene(name => `npc-${id}-${name}`, false, { doNotInstantiate: true });
    const root = new B.TransformNode(`npc-root-${id}`, scene);
    for (const node of entries.rootNodes) if (!node.parent) node.parent = root;
    const result = { meshes: root.getChildMeshes(false), skeletons: entries.skeletons, animationGroups: entries.animationGroups };
    root.computeWorldMatrix(true);
    let feet = 0;
    if (height > 0) {
      const bounds = root.getHierarchyBoundingVectors(true);
      const h = bounds.max.y - bounds.min.y;
      if (h > .01) { scale *= height / h; feet = bounds.min.y * scale; }
    }
    root.scaling.setAll(scale);
    root.position.set(position[0], position[1] - feet, position[2]);
    root.rotation.y = rotationY;
    const meshes = result.meshes.filter(m => m.getTotalVertices?.() > 0);
    for (const mesh of meshes) { mesh.receiveShadows = true; mesh.isPickable = false; }
    npcCasters.push(...meshes); rendering.prepareMaterials(meshes); updateCasters();
    function startAnimation(name = animationName) {
      result.animationGroups.forEach(a => a.stop());
      const match = result.animationGroups.find(a => a.name.toLowerCase() === name?.toLowerCase()) || result.animationGroups.find(a => name && a.name.toLowerCase().includes(name.toLowerCase())) || result.animationGroups.find(a => /idle|walk/i.test(a.name)) || result.animationGroups[0];
      if (match) match.start(true, animationSpeed);
      return match || null;
    }
    const npc = { root, meshes, skeletons: result.skeletons, animationGroups: result.animationGroups, startAnimation, dispose() { npcObjects.delete(npc); npcCasters = npcCasters.filter(m => !meshes.includes(m)); result.animationGroups.forEach(a => a.dispose()); root.dispose(false, false); result.skeletons.forEach(s => s.dispose()); updateCasters(); } };
    npcObjects.add(npc); startAnimation(animationName);
    return npc;
  }
  function registerNpcAccessories(npc, accessories = []) {
    if (!npcObjects.has(npc)) return () => {};
    const added = [...new Set(accessories)].filter(mesh => mesh && !mesh.isDisposed?.() && !npc.meshes.includes(mesh));
    for (const mesh of added) {
      mesh.receiveShadows = true;
      mesh.isPickable = false;
      npc.meshes.push(mesh);
    }
    npcCasters.push(...added);
    rendering.prepareMaterials(added);
    updateCasters();
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      for (const mesh of added) {
        const index = npc.meshes.indexOf(mesh);
        if (index >= 0) npc.meshes.splice(index, 1);
      }
      npcCasters = npcCasters.filter(mesh => !added.includes(mesh));
      updateCasters();
    };
  }
  syncCamera(sourceCamera);
  return {
    B, engine, scene, camera, rendering, loadNpc, registerNpcAccessories,
    rebuild(world) { const result = converter.rebuild(world); worldCasters = result.shadowCasters; rendering.prepareMaterials(result.meshes); updateCasters(); return result; },
    render(dt = 1 / 60, time = 0, threeCamera = sourceCamera) { if (disposed) return; syncCamera(threeCamera); if (riverRipples) { riverRipples.uOffset = time * .007; riverRipples.vOffset = time * .011; } rendering.update(dt); scene.render(); },
    resize(width, height) { if (width && height) engine.setSize(Math.round(width), Math.round(height)); engine.resize(); },
    setEvening(value) { rendering.setTimeOfDay(value ? 'evening' : 'day'); },
    stats() { return { engine: 'Babylon.js', version: B.Engine.Version, staticMeshes: converter.meshes.length, npcCount: npcObjects.size, ...rendering.stats?.() }; },
    dispose() { if (disposed) return; disposed = true; for (const npc of [...npcObjects]) npc.dispose(); converter.dispose(); for (const pending of npcContainers.values()) pending.then(container => container.dispose()).catch(() => {}); npcContainers.clear(); rendering.dispose(); scene.dispose(); if (!injectedEngine) engine.dispose(); },
  };
}

export { multiplyMatrices };
