/**
 * Evidence-led reconstruction controls for the Burgplatz scene.
 * Local frame: +X east, +Z south, metres are SCENE UNITS, not a survey.
 * Source-visible facts must not be confused with inferred metric placement.
 * Research cutoff: 2026-11-08. See RECONSTRUCTION_NOTES.md.
 */

export const HISTORICAL_SOURCES = Object.freeze({
  lambertusArchitecture: {
    url: 'https://www.baukunst-nrw.de/index.php/objekte/2236-st-lambertus-duesseldorf',
    title: 'baukunst-nrw: St. Lambertus Düsseldorf',
    type: 'institutional-architecture-description',
    details: 'Westturm; fünf Geschosse; Backsteinkern mit Tuffverblendung; vier Schiefertürmchen; Grundriss von 1894.',
  },
  museum: {
    url: 'https://www.schifffahrtmuseum.de/museum/geschichte-schloss',
    title: 'SchifffahrtMuseum Düsseldorf: Ein Schloss am Rhein',
    type: 'institutional-history',
  },
  postcard1908: {
    url: 'https://commons.wikimedia.org/wiki/File:Burgplatz_Duesseldorf.jpg',
    title: 'Burgplatz mit Schlossturm und Galeriegebäude, 1908',
    author: 'Albert Juch (Postkarte)',
    holdingInstitution: 'Stadtmuseum Düsseldorf',
    image: 'assets/1908.jpg',
    imageSize: [1500, 918],
    type: 'historical-image',
  },
  castle1869: {
    url: 'https://commons.wikimedia.org/wiki/File:Altes_Schloss_in_D%C3%BCsseldorf_im_Jahre_1869,_wiederaufgebaut_als_Versammlungshaus_der_rheinischen_St%C3%A4nde._St%C3%A4ndehaus_(links)_Galeriegeb%C3%A4ude_(Mitte)_und_Schlo%C3%9Fturm_(rechts).jpg',
    title: 'Altes Schloss in Düsseldorf im Jahre 1869',
    image: 'assets/1869.jpg',
    type: 'historical-image',
  },
  school1883: {
    url: 'https://www.duesseldorf.de/denkmalschutz/qr-codes/denkmal-burgplatz',
    title: 'Landeshauptstadt Düsseldorf: Baudenkmal Burgplatz 1',
    type: 'municipal-monument-description',
  },
  radkeDrawing: {
    url: 'https://commons.wikimedia.org/wiki/File:D%C3%BCsselschl%C3%B6%C3%9Fchen_in_D%C3%BCsseldorf,_Entwurf_Baurat_Radke,_1902,_Zeichnung.jpg',
    title: 'Düsselschlösschen: Entwurf Baurat Radke, 1902',
    image: 'assets/radke.jpg',
    type: 'historical-architectural-drawing',
    view: 'Rheinseite, nicht die vom Burgplatz sichtbare Gegenseite',
  },
  officialHistoricMaps: {
    url: 'https://maps.duesseldorf.de/',
    title: 'Düsseldorf Maps: historische Stadtpläne 1878 und 1906',
    type: 'municipal-map-portal',
    status: 'available-for-further-georeferencing; not metrically traced in this file',
  },
  promenade: {
    url: 'https://www.duesseldorf.de/amt-fuer-bruecken-tunnel-und-stadtbahnbau/tunnel/rheinufertunnel',
    title: 'Landeshauptstadt Düsseldorf: Rheinufertunnel',
    type: 'municipal-history',
  },
});

export const ERA_EVIDENCE = Object.freeze({
  '1869': {
    label: '1869 · Annäherung',
    accuracy: 'strongly-interpretative',
    sourceIds: ['castle1869', 'museum'],
    documented: [
      'Schlossflügel stehen noch; der Nordflügel wurde im 19. Jahrhundert als Ständehaus wiederaufgebaut.',
      'Das Schloss wird unter anderem von Kunstakademie und Provinziallandtag genutzt.',
      'Das zusätzliche Aussichtsgeschoss des Turms gehört zum preußischen Wiederaufbau.',
    ],
    exclusions: ['dusselschloesschen', 'school1883', 'modernFreitreppe', 'radschlaegerbrunnen', 'kuhnaMauer', 'modernBridge'],
    controls: { towerPortal1892: false, castleWings: true, schoolMansard: false },
    caution: 'Der vorhandene alte Schlossgrundriss zeigt einen älteren Zustand. Seine Konturen dürfen nicht als exaktes Bauaufmaß von 1869 ausgegeben werden.',
  },
  '1908': {
    label: 'Um 1908 · nach Bildquellen',
    accuracy: 'image-constrained-interpretation',
    sourceIds: ['postcard1908', 'museum', 'school1883', 'radkeDrawing'],
    documented: [
      'Der Schlossturm steht frei; das Portal mit Balkon besteht seit 1892.',
      'Die Postkarte zeigt eine offene Attika und eine filigrane Turmbekrönung.',
      'Die Postkarte belegt Marktstände, Sonnenschirme, Passanten und einen Straßenbahnwagen.',
      'Das Düsselschlösschen liegt westlich des Turms am Übergang zur tieferen Uferanlage.',
      'Die Kunstgewerbeschule von 1883 steht auf der Südseite des Platzes.',
    ],
    exclusions: ['castleNorthWing', 'modernFreitreppe', 'radschlaegerbrunnen', 'kuhnaMauer', 'modernCableStayedBridge'],
    controls: { towerPortal1892: true, openTowerAttic: true, modernTentRoof: false, schoolMansard: true },
    caution: 'Die Datierung der Postkarte ist kein Nachweis für das exakte Aufnahmedatum jedes Details. Farben und nicht sichtbare Seiten bleiben Rekonstruktion.',
  },
  heute: {
    label: 'Gegenwart · vereinfachtes Raummodell',
    accuracy: 'contemporary-interpretation',
    sourceIds: ['museum', 'school1883', 'promenade'],
    controls: { towerPortal1892: true, openTowerAttic: false, modernTentRoof: true, schoolMansard: false },
    caution: 'Historische Häuserfronten dürfen nicht unverändert als gegenwärtiger Bestand bezeichnet werden. Der heutige Zustand enthält Nachkriegsänderungen.',
  },
});

export const HISTORICAL_LAYOUT = Object.freeze({
  coordinateFrame: {
    x: 'east', z: 'south', units: 'approximate scene metres',
    anchor: { id: 'schlossturm', position: [-13, 0, -19] },
    measuredSurvey: false,
  },
  church: {
    /**
     * Corrects the erroneous north–south nave in the existing generator.
     * A church's liturgical east end is not, by itself, metric evidence.
     * This placement is an INFERRED working correction, not surveyed geometry.
     */
    confidence: 'inferred-layout',
    legacyWestTowerXZ: [17, -60],
    correctedWestTowerXZ: [7, -81],
    rotationY: -Math.PI / 2,
    correctedNaveCenterXZ: [30, -81],
    naveAxis: 'east-west',
    westTowerToward: 'Rhine',
    orientationEvidence: 'Institutional description explicitly locates the square tower at the west side of the nave.',
    visibleTowerCladding: 'buff/tuff stone, NOT bare red brick',
    towerStoreys: 5,
    cornerTurrets: 4,
    sourceId: 'lambertusArchitecture',
    needs: 'Verify and trace the municipal 1906 plan or cadastral footprints before claiming metre accuracy.',
  },
  tower: {
    position: [-13, 0, -19],
    confidence: 'source-visible-form; inferred-dimensions',
    lanternBaysPerOctagonalFace: 2,
    lowerWindows: 'narrow openings, not large domestic sash windows',
    before1892: { entrancePortalAndBalcony: false },
    image1908: { openAtticBalustrade: true, filigreeRoofSupport: true, modernTentRoof: false },
  },
  dusselschloesschen: {
    confidence: 'source-visible-relative-placement; inferred-dimensions',
    relationToTower: 'west, on the Rhine quay; not another freestanding house in the middle of the square',
    retainWorkingXZ: [-40, -23],
    upperQuayY: 0,
    lowerQuayYEstimate: -2.2,
    drawingView: 'Rhine-facing elevation',
    caution: 'Do not paste the Rhine-facing drawing unchanged onto the land-facing facade visible from the square.',
  },
  school1883: {
    confidence: 'documented-building-type; footprint-not-yet-traced',
    sideOfSquare: 'south',
    built: 1883,
    storeys: 3,
    upperStoreys: 'yellowish clinker',
    groundStorey: 'rusticated natural stone',
    historicalRoof: 'mansard with separate dormers',
    currentRoof: 'changed after wartime damage',
    sourceId: 'school1883',
    caution: 'Keep the historic Galeriegebäude and the Kunstgewerbeschule distinct until their individual footprints are mapped.',
  },
  bridge1908: {
    confidence: 'source-visible-form; position-not-surveyed',
    appearance: 'arched/trussed bridge structure behind the tower toward the north-west',
    cableStayed: false,
    caution: 'The postcard constrains apparent direction and form, not an exact scene-Z distance. Do not label the present z=-220 as surveyed.',
  },
  castle1869: {
    confidence: 'strongly-interpretative-footprint',
    warning: 'The older Clemen plan is not an 1869 as-built plan; do not repeat a generic townhouse facade atlas as documentary palace elevations.',
  },
});

/** Transform existing church points without importing a renderer or engine. */
export function transformLegacyChurchPoint([x, y, z]) {
  const c = HISTORICAL_LAYOUT.church;
  const dx = x - c.legacyWestTowerXZ[0], dz = z - c.legacyWestTowerXZ[1];
  const co = Math.cos(c.rotationY), si = Math.sin(c.rotationY);
  return [c.correctedWestTowerXZ[0] + co * dx + si * dz, y,
    c.correctedWestTowerXZ[1] - si * dx + co * dz];
}

/**
 * Manually selected SOURCE-IMAGE quadrilaterals, in [top-left, top-right,
 * bottom-right, bottom-left] order. Points are approximate pixel picks.
 * Keep source credit and the postcard's original monochrome/printed character.
 * These are not geometric measurements of the buildings.
 */
export const SOURCE_FACADE_QUADS = Object.freeze([
  { id: 'east-row-near-white', sourceId: 'postcard1908', image: 'assets/1908.jpg', size: [1500, 918],
    quad: [[1361,337],[1481,304],[1481,686],[1361,637]],
    scope: 'source-visible facade register, closest pale house at image right',
    confidence: 'manual-pixel-pick', note: 'Small edge portions and the base may include neighboring material/occlusion.' },
  { id: 'east-row-middle', sourceId: 'postcard1908', image: 'assets/1908.jpg', size: [1500, 918],
    quad: [[1244,357],[1334,330],[1334,631],[1244,603]],
    scope: 'source-visible middle facade register', confidence: 'manual-pixel-pick' },
  { id: 'east-row-far', sourceId: 'postcard1908', image: 'assets/1908.jpg', size: [1500, 918],
    quad: [[1143,379],[1198,364],[1198,596],[1143,582]],
    scope: 'small distant facade; low pixel resolution', confidence: 'manual-pixel-pick',
    note: 'Use only at a distance. Do not enlarge into invented sharp detail.' },
  { id: 'gallery-upper-register', sourceId: 'postcard1908', image: 'assets/1908.jpg', size: [1500, 918],
    quad: [[91,93],[456,163],[456,415],[91,350]],
    scope: 'upper facade register only; not an entire building elevation', confidence: 'manual-pixel-pick',
    note: 'Exclude the market-obscured lower register and do not treat the drawing as a full footprint.' },
]);

/** Unit-square -> source-image projective homography, row-major 3×3. */
export function quadHomography(quad) {
  const [p0,p1,p2,p3] = quad;
  const dx1=p1[0]-p2[0], dx2=p3[0]-p2[0], dy1=p1[1]-p2[1], dy2=p3[1]-p2[1];
  const sx=p0[0]-p1[0]+p2[0]-p3[0], sy=p0[1]-p1[1]+p2[1]-p3[1];
  const den=dx1*dy2-dx2*dy1;
  let g=0,h=0;
  if (Math.abs(sx)+Math.abs(sy)>1e-9 && Math.abs(den)>1e-9) {
    g=(sx*dy2-dx2*sy)/den; h=(dx1*sy-sx*dy1)/den;
  }
  return [p1[0]-p0[0]+g*p1[0],p3[0]-p0[0]+h*p3[0],p0[0],
    p1[1]-p0[1]+g*p1[1],p3[1]-p0[1]+h*p3[1],p0[1],g,h,1];
}

export function sourceFacadeUV(entry,u,v) {
  const m=quadHomography(entry.quad),d=m[6]*u+m[7]*v+1;
  const x=(m[0]*u+m[1]*v+m[2])/d, y=(m[3]*u+m[4]*v+m[5])/d;
  return [x/entry.size[0],1-y/entry.size[1]];
}
