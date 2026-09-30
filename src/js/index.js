import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createMediaStudio } from './media-studio'
import { createShapeFX } from './shape-fx'
import { createExportHub } from './export-hub'
import { createMediaObject } from './media-runtime'

const $ = (id) => document.getElementById(id)
const shapes = [
  {
    id: 'torus-knot',
    name: 'Torus knot',
    geometry: 'TorusKnotGeometry(1, 0.32, 160, 24)',
    icon: '<path d="M12 12C34-3 43 23 24 34S-1 22 12 12Z"/><path d="M28 10C8-2-1 23 18 34S43 22 28 10Z"/>',
  },
  {
    id: 'sphere',
    name: 'Sphere',
    geometry: 'SphereGeometry(1.3, 48, 32)',
    icon: '<circle cx="20" cy="20" r="16"/><ellipse cx="20" cy="20" rx="8" ry="16"/><ellipse cx="20" cy="20" rx="16" ry="6"/>',
  },
  {
    id: 'cube',
    name: 'Cube',
    geometry: 'BoxGeometry(1.9, 1.9, 1.9)',
    icon: '<path d="M20 3 36 12v17L20 38 4 29V12ZM4 12l16 9 16-9M20 21v17M20 3v17"/>',
  },
  {
    id: 'torus',
    name: 'Torus',
    geometry: 'TorusGeometry(1.1, 0.43, 32, 100)',
    icon: '<ellipse cx="20" cy="20" rx="17" ry="13"/><ellipse cx="20" cy="18" rx="9" ry="6"/><path d="M4 19c4 18 28 18 32 0"/>',
  },
  {
    id: 'icosahedron',
    name: 'Icosahedron',
    geometry: 'IcosahedronGeometry(1.5, 0)',
    icon: '<path d="M20 2 36 13 32 31 14 38 3 23 7 8ZM7 8l20 6 5 17-18 7 1-19L7 8Zm8 11 12-5-7-12M3 23l12-4 17 12M27 14l9-1"/>',
  },
  {
    id: 'cone',
    name: 'Cone',
    geometry: 'ConeGeometry(1.2, 2.6, 64)',
    icon: '<path d="m20 3-16 29c0 8 32 8 32 0L20 3ZM4 32c0-7 32-7 32 0M20 3v25"/>',
  },
]
const starter = (shape) => `// ${shape.name} — change the geometry and press Run.
// THREE and the inspector's material are available here.

const geometry = new THREE.${shape.geometry};

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = 0.2;

return mesh;`
const defaults = {
  color: '#a2b9f7',
  material: 'standard',
  roughness: 0.32,
  metalness: 0.35,
  scale: 1,
  rotation: 0,
  speed: 0.3,
  autoRotate: true,
  grid: true,
  wireframe: false,
}
let stored = {}
try {
  stored = JSON.parse(localStorage.getItem('form-studio-v1') || '{}') || {}
} catch {}
let selected = shapes.some((s) => s.id === stored.selected) ? stored.selected : shapes[0].id
const records = Object.fromEntries(
  shapes.map((shape) => {
    const saved = stored.records?.[shape.id]
    return [
      shape.id,
      {
        draft: typeof saved?.draft === 'string' ? saved.draft : starter(shape),
        applied: typeof saved?.applied === 'string' ? saved.applied : starter(shape),
        settings: { ...defaults, ...saved?.settings },
      },
    ]
  })
)
const record = () => records[selected]
const settings = () => record().settings
function persist() {
  try {
    localStorage.setItem('form-studio-v1', JSON.stringify({ selected, records }))
    $('save-status').textContent = 'Saved locally'
  } catch {
    $('save-status').textContent = 'Storage unavailable · export to save'
  }
}
function status(message, error = false) {
  $('status').textContent = message
  $('status').title = message
  $('status').classList.toggle('error', error)
}
function lines() {
  $('line-numbers').textContent = $('code')
    .value.split('\n')
    .map((_, i) => i + 1)
    .join('\n')
  $('dirty').textContent = record().draft !== record().applied ? '●' : ''
}
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
const orbit = new OrbitControls(camera, renderer.domElement)
orbit.enableDamping = true
orbit.minDistance = 3
orbit.maxDistance = 20
function resetCamera() {
  camera.position.set(4.7, 3.1, 6.8)
  orbit.target.set(0, 0, 0)
  orbit.update()
}
resetCamera()
scene.add(new THREE.HemisphereLight(0xd8e4ff, 0x4c4263, 0.7))
const key = new THREE.DirectionalLight(0xe5edff, 1.7)
key.position.set(3, 5, 4)
scene.add(key)
const rim = new THREE.DirectionalLight(0x8a9eff, 1.4)
rim.position.set(-4, 1, -2)
scene.add(rim)
const fill = new THREE.DirectionalLight(0xffdac9, 0.5)
fill.position.set(0, -1, 4)
scene.add(fill)
const floor = new THREE.GridHelper(30, 60, 0x4a5368, 0x353e50)
floor.position.y = -1.95
floor.material.transparent = true
floor.material.opacity = 0.3
scene.add(floor)
const holder = new THREE.Group()
scene.add(holder)
let object
let shapeFX
function material() {
  const s = settings()
  const common = { wireframe: s.wireframe }
  if (s.material === 'normal') return new THREE.MeshNormalMaterial(common)
  if (s.material === 'basic') return new THREE.MeshBasicMaterial({ ...common, color: s.color })
  return new THREE.MeshStandardMaterial({ ...common, color: s.color, roughness: s.roughness, metalness: s.metalness })
}
function dispose(root) {
  const geometries = new Set(),
    materials = new Set()
  root?.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry)
    if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => materials.add(m))
  })
  geometries.forEach((g) => g.dispose())
  materials.forEach((m) => m.dispose())
}
function applyCode(source, commit = false) {
  const mat = material()
  let candidate
  try {
    candidate = new Function('THREE', 'material', '"use strict";\n' + source)(THREE, mat)
    if (!(candidate instanceof THREE.Object3D)) throw new Error('Return a THREE.Mesh or THREE.Group.')
    // Validate rendering before replacing the currently visible object.
    const probe = new THREE.Scene()
    probe.add(candidate)
    renderer.compile(probe, camera)
    probe.remove(candidate)
    if (object) {
      holder.remove(object)
      dispose(object)
    }
    object = candidate
    holder.add(object)
    holder.rotation.set(0, THREE.MathUtils.degToRad(settings().rotation), 0)
    holder.scale.setScalar(settings().scale)
    shapeFX?.rebuild()
    if (commit) {
      record().applied = source
      persist()
    }
    lines()
    status('✓ Scene updated')
    return true
  } catch (error) {
    if (candidate instanceof THREE.Object3D && candidate !== object) dispose(candidate)
    mat.dispose()
    status(error.message, true)
    return false
  }
}
function updateMaterial() {
  if (!object) return
  const old = new Set()
  const replacement = material()
  object.traverse((node) => {
    if (!node.isMesh) return
    ;(Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => old.add(m))
    node.material = replacement
  })
  old.forEach((m) => m?.dispose())
}
function sync() {
  const s = settings()
  for (const id of ['color', 'material', 'roughness', 'metalness', 'scale', 'rotation', 'speed']) $(id).value = s[id]
  for (const id of ['roughness', 'metalness', 'scale', 'speed']) $(id + '-value').value = Number(s[id]).toFixed(2)
  $('rotation-value').value = s.rotation + '°'
  $('hex').textContent = s.color.toUpperCase()
  $('auto-rotate').checked = s.autoRotate
  $('grid').checked = s.grid
  floor.visible = s.grid
  $('wire').classList.toggle('selected', s.wireframe)
  $('solid').classList.toggle('selected', !s.wireframe)
  $('wire').setAttribute('aria-pressed', s.wireframe)
  $('solid').setAttribute('aria-pressed', !s.wireframe)
  $('pause').textContent = s.autoRotate ? 'Ⅱ' : '▷'
  $('pause').setAttribute('aria-label', s.autoRotate ? 'Pause rotation' : 'Resume rotation')
  $('pause').title = s.autoRotate ? 'Pause rotation' : 'Resume rotation'
  for (const id of ['roughness', 'metalness']) $(id).disabled = s.material !== 'standard'
  $('color').disabled = s.material === 'normal'
}
function select(id) {
  if (object) record().draft = $('code').value
  selected = id
  const shape = shapes.find((s) => s.id === id)
  $('code').value = record().draft
  for (const label of ['scene-name', 'hero-name', 'object-name']) $(label).textContent = shape.name
  $('filename').textContent = shape.id + '.js'
  $('shape-number').textContent = String(shapes.indexOf(shape) + 1).padStart(2, '0') + ' / 06'
  document.querySelectorAll('.element').forEach((button) => {
    button.classList.toggle('active', button.dataset.id === id)
    button.setAttribute('aria-pressed', button.dataset.id === id)
  })
  sync()
  if (!applyCode(record().applied)) {
    applyCode(starter(shape))
    status('Saved code could not run. Showing the starter; your draft is preserved.', true)
  }
  if (record().draft !== record().applied) status('Draft restored · press Run to apply')
  lines()
  persist()
}
for (const shape of shapes) {
  const button = document.createElement('button')
  button.className = 'element'
  button.dataset.id = shape.id
  button.innerHTML =
    '<svg viewBox="0 0 40 40" aria-hidden="true">' + shape.icon + '</svg><span>' + shape.name + '</span>'
  button.onclick = () => select(shape.id)
  $('elements').append(button)
}
for (const color of ['#a2b9f7', '#b8a2ed', '#e3a9ad', '#e5bd8d', '#9cc7b0', '#d8dce4']) {
  const button = document.createElement('button')
  button.className = 'swatch'
  button.style.backgroundColor = color
  button.setAttribute('aria-label', 'Set color ' + color)
  button.onclick = () => {
    settings().color = color
    sync()
    updateMaterial()
    persist()
  }
  $('swatches').append(button)
}
for (const id of ['color', 'material', 'roughness', 'metalness', 'scale', 'rotation', 'speed']) {
  $(id).addEventListener('input', () => {
    settings()[id] = ['color', 'material'].includes(id) ? $(id).value : Number($(id).value)
    if (['color', 'material', 'roughness', 'metalness'].includes(id)) updateMaterial()
    if (id === 'scale') holder.scale.setScalar(settings().scale)
    if (id === 'rotation') holder.rotation.y = THREE.MathUtils.degToRad(settings().rotation)
    sync()
    persist()
  })
}
$('auto-rotate').onchange = () => {
  settings().autoRotate = $('auto-rotate').checked
  sync()
  persist()
}
$('grid').onchange = () => {
  settings().grid = $('grid').checked
  sync()
  persist()
}
$('pause').onclick = () => {
  settings().autoRotate = !settings().autoRotate
  sync()
  persist()
}
$('reset-camera').onclick = resetCamera
for (const id of ['wire', 'solid'])
  $(id).onclick = () => {
    settings().wireframe = id === 'wire'
    updateMaterial()
    sync()
    persist()
  }
$('code').addEventListener('input', () => {
  record().draft = $('code').value
  lines()
  persist()
  status('Draft saved · press Run to apply')
})
$('code').addEventListener('scroll', () => {
  $('line-numbers').scrollTop = $('code').scrollTop
})
$('code').addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault()
    const editor = $('code')
    editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end')
    editor.dispatchEvent(new Event('input'))
  }
})
function run() {
  record().draft = $('code').value
  applyCode(record().draft, true)
}
$('run').onclick = run
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    run()
  }
})
$('reset-code').onclick = () => {
  if (!confirm('Reset this element’s code to its starter? Your appearance settings will stay.')) return
  record().draft = starter(shapes.find((s) => s.id === selected))
  $('code').value = record().draft
  run()
}
$('export').onclick = () => {
  const s = settings()
  const ctor =
    s.material === 'normal'
      ? 'MeshNormalMaterial'
      : s.material === 'basic'
      ? 'MeshBasicMaterial'
      : 'MeshStandardMaterial'
  const options = { wireframe: s.wireframe }
  if (s.material !== 'normal') options.color = s.color
  if (s.material === 'standard') {
    options.roughness = s.roughness
    options.metalness = s.metalness
  }
  const content = `// Form Studio export. Install three, then import createObject.
// Rotation speed: ${s.speed} rad/s; auto rotate: ${s.autoRotate}
// Add lights for the standard material.
import * as THREE from 'three';

export default function createObject() {
  const material = new THREE.${ctor}(${JSON.stringify(options, null, 2)});
  const object = (() => {
${record()
  .applied.split('\n')
  .map((line) => '    ' + line)
  .join('\n')}
  })();
  const group = new THREE.Group();
  group.add(object);
  group.scale.setScalar(${s.scale});
  group.rotation.y = ${THREE.MathUtils.degToRad(s.rotation)};
  return group;
}
`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/javascript' }))
  const link = document.createElement('a')
  link.href = url
  link.download = selected + '.js'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  status(
    record().draft !== record().applied
      ? 'Exported running version · run your draft to export edits'
      : '✓ Exported element + appearance settings'
  )
}
new ResizeObserver(() => {
  const { width, height } = $('viewport').getBoundingClientRect()
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}).observe($('viewport'))
select(selected)
shapeFX = createShapeFX({
  holder,
  renderer,
  camera,
  orbit,
  getObject: () => object,
  getSettings: settings,
  save: persist,
  setStatus: status,
})
const mediaStudio = createMediaStudio({
  renderer,
  scene,
  camera,
  orbit,
  holder,
  floor,
  resetCamera,
  shapeExport: $('export').onclick,
})
function shapeProject() {
  return {
    kind: 'shape',
    name: selected,
    code: record().applied,
    settings: { ...settings(), fx: { ...shapeFX.settings, phase: shapeFX.phase } },
  }
}
function shapeMesh() {
  const root = new THREE.Group(),
    clone = object.clone(true)
  clone.visible = true
  clone.traverse((node) => {
    if (node.geometry) node.geometry = node.geometry.clone()
    if (node.material) {
      const convert = (m) => {
        const copy = m.isMeshNormalMaterial ? new THREE.MeshStandardMaterial({ color: settings().color }) : m.clone()
        if (copy.map) copy.map = copy.map.clone()
        return copy
      }
      node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material)
    }
  })
  root.add(clone)
  root.scale.copy(holder.scale)
  root.rotation.copy(holder.rotation)
  return root
}
async function mediaMesh() {
  const resource = mediaStudio.resource
  if (!resource) throw new Error('Wait for media to load.')
  const image = resource.video || resource.texture.image
  const canvas = document.createElement('canvas')
  canvas.width = image.videoWidth || image.naturalWidth || image.width
  canvas.height = image.videoHeight || image.naturalHeight || image.height
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.encoding = THREE.sRGBEncoding
  const s = mediaStudio.settings
  const base = createMediaObject(
    THREE,
    texture,
    { ...s, effect: ['sphere', 'cylinder'].includes(s.effect) ? s.effect : 'flat' },
    resource.aspect
  )
  const mesh = new THREE.Mesh(
    base.object.geometry.clone(),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: s.opacity })
  )
  const group = new THREE.Group()
  group.add(mesh)
  group.scale.copy(mediaStudio.current.group.scale)
  group.rotation.copy(mediaStudio.current.group.rotation)
  base.dispose()
  return group
}
createExportHub({
  renderer,
  scene,
  camera,
  getProvider: () =>
    mediaStudio.active
      ? { project: () => mediaStudio.getProject(), mesh: mediaMesh, background: mediaStudio.settings.background }
      : { project: shapeProject, mesh: shapeMesh, background: '#181c25' },
  importProject: async (data) => {
    if (data.kind === 'media') await mediaStudio.importProject(data)
    else {
      if (typeof data.code !== 'string' || data.code.length > 200000) throw new Error('Invalid shape code.')
      const id = shapes.some((s) => s.id === data.name) ? data.name : 'torus-knot'
      // Imported code is staged for review; Run applies it, just like a typed edit.
      mediaStudio.setMode(false)
      select(id)
      record().draft = data.code
      Object.assign(settings(), data.settings)
      $('code').value = data.code
      sync()
      shapeFX.rebuild()
      lines()
      persist()
      status('Project imported · review the code, then press Run')
    }
  },
})
let previous = performance.now(),
  elapsed = 0,
  frames = 0
renderer.setAnimationLoop((now) => {
  const delta = Math.min((now - previous) / 1000, 0.05)
  previous = now
  if (!mediaStudio.active && settings().autoRotate) holder.rotation.y += delta * settings().speed
  orbit.update()
  mediaStudio.update(delta, now)
  shapeFX.update(delta, !mediaStudio.active)
  renderer.render(scene, camera)
  elapsed += delta
  frames++
  if (elapsed >= 0.75) {
    $('fps').textContent = Math.round(frames / elapsed) + ' FPS'
    elapsed = 0
    frames = 0
  }
})
