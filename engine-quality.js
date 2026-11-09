/**
 * Babylon.js rendering direction for a metre-scale, outdoor walking scene.
 * No geometry, historic claims, texture generation, or scene loading lives here.
 * All effects are native Babylon features; no large screen-space AO radius or
 * sharpen pass is used, since both made the previous scene look outlined.
 *
 * configureGameRendering(BABYLON, {
 *   scene, engine, camera, sun, hemisphere,
 *   quality: 'high' | 'balanced' | 'low' | 'auto', adaptive: true
 * });
 *
 * Call update(dtSeconds) each frame, setShadowCasters(meshes) after an era swap,
 * and setTimeOfDay('day' | 'evening') when the light control changes.
 */

const QUALITY = {
  high: { pixelRatio: 1.6, minPixelRatio: 1.15, shadowSize: 2048, cascades: 3, shadowDistance: 115, samples: 2 },
  balanced: { pixelRatio: 1.25, minPixelRatio: 0.9, shadowSize: 2048, cascades: 2, shadowDistance: 100, samples: 1 },
  low: { pixelRatio: 1, minPixelRatio: 0.8, shadowSize: 1024, cascades: 1, shadowDistance: 75, samples: 1 },
};

export function configureGameRendering(B, {
  scene,
  engine,
  camera,
  sun,
  hemisphere = null,
  quality = 'auto',
  adaptive = true,
  fog = true,
} = {}) {
  if (!B || !scene || !engine || !camera || !sun) {
    throw new Error('configureGameRendering requires Babylon, scene, engine, camera, and sun.');
  }

  const viewportWidth = engine.getRenderingCanvas?.()?.clientWidth || 1280;
  const requested = quality === 'auto' ? (viewportWidth < 700 ? 'low' : 'high') : quality;
  const profile = QUALITY[requested] || QUALITY.balanced;
  const deviceRatio = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  let pixelRatio = Math.min(profile.pixelRatio, Math.max(1, deviceRatio));
  let disposed = false;
  let phase = 'day';
  let slowSeconds = 0;
  let fastSeconds = 0;
  let elapsed = 0;
  let averageFrameTime = 1 / 60;
  let shadowGenerator = null;
  let pipeline = null;
  const ownsHemisphere = !hemisphere;

  camera.minZ = 0.12;
  // The far bank remains visible, while the shadow frustum covers the walkable
  // square. The two distances intentionally serve different purposes.
  camera.maxZ = Math.max(800, camera.maxZ || 0);

  if (!hemisphere) {
    hemisphere = new B.HemisphericLight('burgplatz-sky-fill', new B.Vector3(0, 1, 0), scene);
  }
  hemisphere.diffuse = B.Color3.FromHexString('#c7d7df');
  hemisphere.groundColor = B.Color3.FromHexString('#918475');
  hemisphere.specular = B.Color3.Black();

  const imageProcessing = scene.imageProcessingConfiguration;
  if (imageProcessing) {
    imageProcessing.toneMappingEnabled = true;
    imageProcessing.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL
      ?? B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    imageProcessing.contrast = 1.04;
    imageProcessing.vignetteEnabled = false;
    imageProcessing.colorCurvesEnabled = false;
    imageProcessing.colorGradingEnabled = false;
  }

  // CSM gives the near camera region materially more shadow detail than one
  // 230-metre shadow map. Stable cascades avoid crawling edges during walking.
  if (B.CascadedShadowGenerator && engine.webGLVersion >= 2 && profile.cascades > 1) {
    shadowGenerator = new B.CascadedShadowGenerator(profile.shadowSize, sun);
    shadowGenerator.numCascades = profile.cascades;
    shadowGenerator.lambda = 0.72;
    shadowGenerator.shadowMaxZ = profile.shadowDistance;
    shadowGenerator.cascadeBlendPercentage = 0.12;
    shadowGenerator.stabilizeCascades = true;
    shadowGenerator.autoCalcDepthBounds = false;
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM;
    shadowGenerator.splitFrustum();
  } else if (B.ShadowGenerator) {
    shadowGenerator = new B.ShadowGenerator(profile.shadowSize, sun);
    shadowGenerator.usePoissonSampling = true;
    // Do not enable VSM for thin cloth/hair cards: its light bleeding is a
    // worse compromise here than a modest PCF kernel.
  }
  if (shadowGenerator) {
    shadowGenerator.bias = 0.00035;
    shadowGenerator.normalBias = 0.018;
    shadowGenerator.transparencyShadow = true;
    shadowGenerator.setDarkness(0);
  }

  if (B.DefaultRenderingPipeline) {
    try {
      pipeline = new B.DefaultRenderingPipeline('burgplatz-native-pipeline', true, scene, [camera]);
      pipeline.samples = profile.samples;
      pipeline.fxaaEnabled = profile.samples < 2;
      pipeline.bloomEnabled = false;
      pipeline.depthOfFieldEnabled = false;
      pipeline.chromaticAberrationEnabled = false;
      pipeline.sharpenEnabled = false;
      pipeline.grainEnabled = false;
      pipeline.imageProcessingEnabled = true;
    } catch {
      // PBR colour management above remains valid if a device cannot allocate
      // the HDR render target needed by the post-process pipeline.
      pipeline?.dispose();
      pipeline = null;
    }
  }

  if (fog) {
    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.00155;
    scene.fogColor = B.Color3.FromHexString('#bfcacb');
  }

  function applyResolution() {
    engine.setHardwareScalingLevel(1 / pixelRatio);
    engine.resize();
  }

  function setTimeOfDay(value = 'day') {
    phase = value === 'evening' ? 'evening' : 'day';
    const evening = phase === 'evening';
    // DirectionalLight.direction describes the direction in which rays travel,
    // not the direction from the square to the sun (the inverse convention).
    sun.direction = new B.Vector3(...(evening ? [0.86, -0.31, -0.22] : [0.64, -0.69, 0.34])).normalize();
    sun.position = sun.direction.scale(-150);
    sun.diffuse = B.Color3.FromHexString(evening ? '#ffd0a0' : '#fff0d7');
    sun.specular = sun.diffuse.clone();
    sun.intensity = evening ? 2.1 : 2.8;
    hemisphere.intensity = evening ? 0.3 : 0.42;
    scene.environmentIntensity = evening ? 0.42 : 0.62;
    if (imageProcessing) imageProcessing.exposure = evening ? 0.9 : 1.05;
    if (fog) {
      scene.fogColor = B.Color3.FromHexString(evening ? '#cbb7a0' : '#bfcacb');
      scene.fogDensity = evening ? 0.0019 : 0.00155;
    }
    shadowGenerator?.splitFrustum?.();
  }

  function setShadowCasters(meshes = []) {
    const map = shadowGenerator?.getShadowMap();
    if (!map) return;
    map.renderList = [];
    const unique = new Set();
    for (const mesh of meshes) {
      if (!mesh || mesh.isDisposed?.() || unique.has(mesh)) continue;
      unique.add(mesh);
      shadowGenerator.addShadowCaster(mesh, false);
    }
  }

  function prepareMaterials(meshes = []) {
    const visited = new Set();
    for (const mesh of meshes) {
      const materials = mesh?.material?.subMaterials || [mesh?.material];
      for (const material of materials) {
        if (!material || visited.has(material)) continue;
        visited.add(material);
        // Do not give matte stone/skin the metallic response of glass or bronze.
        // This function preserves authored metallic/roughness values rather than
        // overwriting glTF materials or copying colour textures into normal maps.
        for (const property of ['albedoTexture', 'emissiveTexture']) {
          if (material[property]) material[property].gammaSpace = true;
        }
        for (const property of ['bumpTexture', 'metallicTexture', 'ambientTexture', 'microSurfaceTexture']) {
          if (material[property]) material[property].gammaSpace = false;
        }
        for (const texture of material.getActiveTextures?.() || []) {
          texture.anisotropicFilteringLevel = requested === 'low' ? 4 : 8;
        }
      }
    }
  }

  function update(dt = engine.getDeltaTime() / 1000) {
    if (disposed || !adaptive || !Number.isFinite(dt) || dt <= 0 || dt > 0.25) return;
    elapsed += dt;
    averageFrameTime += (dt - averageFrameTime) * Math.min(1, dt * 2);
    if (elapsed < 5) return; // Do not react to shader compilation / initial GLB upload.
    const fps = 1 / averageFrameTime;
    slowSeconds = fps < 42 ? slowSeconds + dt : Math.max(0, slowSeconds - dt * 0.5);
    fastSeconds = fps > 57 ? fastSeconds + dt : 0;
    if (slowSeconds > 2 && pixelRatio > profile.minPixelRatio + 0.01) {
      pixelRatio = Math.max(profile.minPixelRatio, pixelRatio - 0.12);
      slowSeconds = fastSeconds = 0;
      applyResolution();
    } else if (fastSeconds > 12 && pixelRatio < Math.min(profile.pixelRatio, deviceRatio) - 0.01) {
      pixelRatio = Math.min(profile.pixelRatio, deviceRatio, pixelRatio + 0.08);
      slowSeconds = fastSeconds = 0;
      applyResolution();
    }
  }

  applyResolution();
  setTimeOfDay('day');

  return {
    pipeline,
    shadowGenerator,
    update,
    setTimeOfDay,
    setShadowCasters,
    prepareMaterials,
    stats: () => ({
      quality: requested,
      pixelRatio,
      phase,
      averageFps: 1 / averageFrameTime,
      cascades: shadowGenerator?.numCascades || (shadowGenerator ? 1 : 0),
      shadowDistance: profile.shadowDistance,
      shadowSize: profile.shadowSize,
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      pipeline?.dispose();
      shadowGenerator?.dispose();
      if (ownsHemisphere) hemisphere.dispose();
    },
  };
}
