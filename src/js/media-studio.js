import * as THREE from 'three'
import { createMediaObject, particleMediaEffects } from './media-runtime'
import runtimeSource from './media-runtime.js?raw'

const defaults = {
  intensity: 1.4,
  turbulence: 0.2,
  duration: 5,
  phase: 0,
  loop: true,
  effect: 'wave',
  wave: 0.22,
  bend: 0.38,
  frequency: 1.5,
  speed: 1.1,
  hover: 0.65,
  scatter: 0,
  density: 160,
  pointSize: 3,
  opacity: 1,
  scale: 1,
  tiltX: -6,
  tiltY: -18,
  autoRotate: false,
  playing: true,
  grid: false,
  wireframe: false,
  background: '#181c25',
}
const effects = [
  { id: 'explode', name: 'Supernova', icon: '✹', description: 'Break apart. Pull it all back together.' },
  { id: 'vortex', name: 'Vortex', icon: '◌', description: 'A swirling field of living color.' },
  { id: 'galaxy', name: 'Galaxy', icon: '✧', description: 'Your image, scattered among the stars.' },
  { id: 'glitch', name: 'Glitch slices', icon: '▤', description: 'Digital cuts. Unpredictable movement.' },
  { id: 'ripple', name: 'Shockwave', icon: '≋', description: 'Ripples across a living surface.' },
  { id: 'flat', name: 'Flat card', icon: '▱', description: 'A floating, interactive canvas' },
  { id: 'wave', name: 'Silk banner', icon: '≈', description: 'Soft waves. A little motion.' },
  { id: 'particles', name: 'Particle flag', icon: '⠿', description: 'Thousands of points. One image.' },
  { id: 'cylinder', name: 'Cylinder', icon: '◉', description: 'Wrap your media around a form' },
  { id: 'sphere', name: 'Sphere', icon: '◎', description: 'An image with a new perspective' },
]
const $ = (id) => document.getElementById(id)
const range = (id, label, min, max, step, suffix = '') =>
  `<label class="range-label" for="m-${id}">${label}<output id="m-${id}-value"></output></label><input id="m-${id}" data-setting="${id}" data-suffix="${suffix}" type="range" min="${min}" max="${max}" step="${step}">`
const toggle = (id, label) =>
  `<label class="toggle-row">${label}<input id="m-${id}" data-setting="${id}" type="checkbox" role="switch"></label>`
const mediaId = () => 'asset-' + crypto.randomUUID()

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('form-studio-media', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function dbAction(action, value) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('assets', action === 'getAll' ? 'readonly' : 'readwrite')
      const request = tx.objectStore('assets')[action](value)
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error || new Error('Storage write cancelled'))
    })
  } finally {
    db.close()
  }
}
function demoArtwork() {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1000
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 1600, 1000)
  gradient.addColorStop(0, '#f4e7cf')
  gradient.addColorStop(0.55, '#e9d9ba')
  gradient.addColorStop(1, '#f7f0df')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1600, 1000)
  ctx.save()
  ctx.translate(1080, 490)
  ctx.rotate(-0.45)
  for (let i = 30; i >= 0; i--) {
    ctx.beginPath()
    ctx.ellipse(0, 0, 80 + i * 13, 55 + i * 8, 0, 0, Math.PI * 2)
    ctx.strokeStyle = i % 3 === 0 ? '#a5b5cd' : '#1d4c9b'
    ctx.lineWidth = 5
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = '#1b3e77'
  ctx.font = '600 25px Arial'
  ctx.fillText('FORM STUDIO   /   EXPERIMENT 001', 85, 90)
  ctx.font = '900 177px Arial'
  ctx.fillText('MAKE', 77, 425)
  ctx.fillText('WAVES.', 77, 590)
  ctx.font = '24px Arial'
  ctx.fillText('A new dimension for your ideas.', 88, 680)
  ctx.fillRect(85, 865, 1430, 2)
  ctx.font = '19px Arial'
  ctx.fillText('IMAGE → MOTION → PLAY', 85, 920)
  ctx.fillText('DROP SOMETHING IN. MAKE IT MOVE.', 1060, 920)
  return canvas
}
function blobDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
function textureFor(asset) {
  if (asset.demo) return Promise.resolve({ texture: new THREE.CanvasTexture(asset.canvas), aspect: 1.6, cleanup() {} })
  const url = URL.createObjectURL(asset.blob)
  return new Promise((resolve, reject) => {
    const element = document.createElement(asset.type === 'video' ? 'video' : 'img')
    const cleanup = () => {
      if (asset.type === 'video') {
        element.pause()
        element.removeAttribute('src')
        element.load()
      }
      URL.revokeObjectURL(url)
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Media took too long to load. Try another file.'))
    }, 15000)
    element.onerror = () => {
      clearTimeout(timer)
      cleanup()
      reject(new Error('This file could not be decoded. Try PNG, JPEG, WebP, MP4 or WebM.'))
    }
    if (asset.type === 'video') {
      element.muted = true
      element.loop = true
      element.playsInline = true
      element.preload = 'auto'
      element.onloadeddata = () => {
        clearTimeout(timer)
        resolve({
          texture: new THREE.VideoTexture(element),
          video: element,
          aspect: element.videoWidth / element.videoHeight,
          cleanup,
        })
      }
    } else {
      element.onload = () => {
        clearTimeout(timer)
        const texture = new THREE.Texture(element)
        texture.needsUpdate = true
        resolve({ texture, aspect: element.naturalWidth / element.naturalHeight, cleanup })
      }
    }
    element.src = url
    if (asset.type === 'video') element.load()
  })
}
export function createMediaStudio({ renderer, scene, camera, orbit, holder, floor, resetCamera, shapeExport }) {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem('form-studio-media-settings') || '{}') || {}
  } catch {}
  const settings = { ...defaults, ...saved.settings }
  if (!effects.some((e) => e.id === settings.effect)) settings.effect = 'wave'
  const demo = { id: 'demo', name: 'Make waves', type: 'image', demo: true, canvas: demoArtwork() }
  const assets = [demo]
  let selected = demo,
    resource,
    current,
    active = false,
    serial = 0,
    time = 0,
    reveal = 1,
    hoverTarget = 0,
    uploadPending = 0
  let originalCamera, originalTarget
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(3, 3),
    pointerGoal = new THREE.Vector2(0.5, 0.5)

  const modeSwitcher = document.createElement('nav')
  modeSwitcher.className = 'mode-switcher'
  modeSwitcher.setAttribute('aria-label', 'Workspace mode')
  modeSwitcher.innerHTML =
    '<button id="mode-media">▧ Media studio</button><button id="mode-shapes">◈ Shape lab</button>'
  document.querySelector('header').insertBefore(modeSwitcher, document.querySelector('.project'))
  document.querySelector('.project').classList.add('hide-project')

  const library = document.createElement('aside')
  library.className = 'media-library'
  library.innerHTML = `<div class="eyebrow">YOUR WORKSPACE <span>02</span></div><h2 class="media-heading">Media studio</h2><p class="media-intro">Give your images a new dimension.</p><button id="import-media" class="import-button"><b>＋</b><span>Add image or video<small>PNG, JPG, WebP, GIF · MP4, WebM</small></span></button><input id="media-files" type="file" accept="image/*,video/*" multiple hidden><div class="asset-heading">MEDIA LIBRARY <span id="asset-count">1</span></div><div id="media-assets"></div><div class="note"><b>↗</b><strong>Your media. In motion.</strong><p>Drop a file into the scene.<br>Pick an effect. Make it yours.</p><a href="https://robinpayot.com/" target="_blank" rel="noopener">Effect inspiration: Robin Payot ↗</a></div>`
  document.querySelector('main').insertBefore(library, document.querySelector('.center'))

  const inspector = document.createElement('aside')
  inspector.className = 'media-inspector'
  inspector.innerHTML = `<div class="eyebrow">MEDIA INSPECTOR <span>◉</span></div><h3>Surface</h3><label for="m-effect">Wrap or deform</label><select id="m-effect">${effects
    .map((e) => '<option value="' + e.id + '">' + e.name + '</option>')
    .join('')}</select><section class="controls planar-controls"><h3>Deformation</h3>${range(
    'wave',
    'Wave amplitude',
    0,
    0.8,
    0.01
  )}${range('bend', 'Bend', -1.5, 1.5, 0.01)}${range('frequency', 'Wave frequency', 0.3, 4, 0.1)}${range(
    'speed',
    'Motion speed',
    0,
    3,
    0.05
  )}${range(
    'hover',
    'Pointer force',
    0,
    2,
    0.05
  )}</section><section class="controls particle-controls"><h3>Particles</h3>${range(
    'density',
    'Density',
    50,
    240,
    10
  )}${range('pointSize', 'Point size', 1, 8, 0.1)}${range(
    'scatter',
    'Scatter',
    0,
    2,
    0.02
  )}<button id="reveal-media" class="button">↻ Replay reveal</button></section><section class="controls"><h3>Transform</h3>${range(
    'scale',
    'Scale',
    0.4,
    1.8,
    0.01
  )}${range('tiltX', 'Tilt X', -80, 80, 1, '°')}${range('tiltY', 'Tilt Y', -180, 180, 1, '°')}${range(
    'opacity',
    'Opacity',
    0.1,
    1,
    0.01
  )}${toggle('autoRotate', 'Auto rotate')}${toggle('grid', 'Floor grid')}${toggle(
    'wireframe',
    'Wireframe'
  )}<div class="color-row"><label for="m-background">Background</label><input type="color" id="m-background" value="#181c25"></div><button id="reset-media-settings" class="text-button">Reset effect settings</button></section><div class="tip">LOCAL BY DESIGN<p>Your files stay in this browser. Export code, interactive scenes, models and clips.</p></div>`
  document.querySelector('main').append(inspector)
  const dock = document.createElement('section')
  dock.className = 'media-dock'
  dock.innerHTML = `<div class="media-dock-head"><div><span class="js-badge">✧</span> Choose your surface</div><span>10 SURFACES & SIMULATIONS</span></div><div id="effect-cards">${effects
    .map((e) => `<button class="effect-card" data-effect="${e.id}"><b>${e.icon}</b><span>${e.name}</span></button>`)
    .join(
      ''
    )}</div><div class="media-bottom"><div><span id="media-badge">IMAGE</span><span id="media-name">Make waves</span></div><div class="media-player"><button id="video-toggle" hidden>Ⅱ Pause video</button><button id="media-motion">Ⅱ Pause motion</button><button id="media-reset-view">⌖ Reset view</button></div></div><div id="media-status" role="status">Ready · move your pointer over the banner</div>`
  document.querySelector('.center').append(dock)

  let burstPhase = settings.phase || 0,
    reassembling = false
  const dramatic = document.createElement('section')
  dramatic.className = 'controls dramatic-controls'
  dramatic.innerHTML =
    '<h3>Simulation</h3>' +
    range('intensity', 'Effect strength', 0.2, 3.5, 0.05) +
    range('turbulence', 'Turbulence', 0, 1.5, 0.05) +
    range('duration', 'Cycle length (seconds)', 2, 12, 0.5) +
    toggle('loop', 'Loop explosion')
  inspector.insertBefore(dramatic, inspector.querySelector('.planar-controls'))
  const transport = document.createElement('div')
  transport.className = 'media-simulation fx-transport'
  transport.innerHTML =
    '<button id="media-blast" class="blast-button">✹ Explode</button><button id="media-reassemble">↶ Reassemble</button><label for="media-phase">PHASE</label><input id="media-phase" type="range" min="0" max="1" step="0.001"><output id="media-phase-value">0%</output>'
  dock.insertBefore(transport, dock.querySelector('.media-bottom'))
  function message(text, error = false) {
    $('media-status').textContent = text
    $('media-status').classList.toggle('error', error)
  }
  function persist() {
    try {
      localStorage.setItem('form-studio-media-settings', JSON.stringify({ settings, selected: selected.id, active }))
      $('save-status').textContent = 'Saved locally'
    } catch {
      $('save-status').textContent = 'Settings not saved · export to keep'
    }
  }
  function renderAssets() {
    $('media-assets').replaceChildren()
    for (const asset of assets) {
      const button = document.createElement('button')
      button.className = 'media-asset'
      button.classList.toggle('active', asset.id === selected.id)
      button.setAttribute('aria-pressed', asset.id === selected.id)
      const icon = document.createElement('span')
      icon.className = 'asset-icon'
      icon.textContent = asset.type === 'video' ? '▷' : '▧'
      const text = document.createElement('span')
      text.className = 'asset-text'
      text.textContent = asset.name
      const small = document.createElement('small')
      small.textContent = asset.demo
        ? 'Built-in artwork'
        : asset.type.toUpperCase() + ' · ' + (asset.blob.size / 1048576).toFixed(1) + ' MB'
      text.append(small)
      button.append(icon, text)
      button.onclick = () => loadAsset(asset)
      $('media-assets').append(button)
    }
    $('asset-count').textContent = assets.length
  }
  function sync() {
    for (const input of inspector.querySelectorAll('[data-setting]')) {
      const key = input.dataset.setting
      if (input.type === 'checkbox') input.checked = settings[key]
      else {
        input.value = settings[key]
        $(input.id + '-value').value =
          (Number(input.step) >= 1 ? Math.round(settings[key]) : Number(settings[key]).toFixed(2)) +
          input.dataset.suffix
      }
    }
    $('m-effect').value = settings.effect
    dramatic.hidden = !['explode', 'vortex', 'galaxy', 'glitch', 'ripple'].includes(settings.effect)
    $('media-phase').disabled = settings.effect !== 'explode'
    $('media-reassemble').disabled = settings.effect !== 'explode'
    $('media-phase').value = burstPhase
    $('media-phase-value').value = Math.round(burstPhase * 100) + '%'
    $('m-background').value = settings.background
    inspector.querySelector('.particle-controls').hidden = !particleMediaEffects.includes(settings.effect)
    inspector.querySelector('.planar-controls').hidden = ['cylinder', 'sphere'].includes(settings.effect)
    $('m-wave').disabled = settings.effect === 'flat'
    $('m-bend').disabled = settings.effect === 'flat'
    $('m-wireframe').disabled = particleMediaEffects.includes(settings.effect)
    for (const button of dock.querySelectorAll('[data-effect]')) {
      button.classList.toggle('active', button.dataset.effect === settings.effect)
      button.setAttribute('aria-pressed', button.dataset.effect === settings.effect)
    }
    $('media-motion').textContent = settings.playing ? 'Ⅱ Pause motion' : '▷ Play motion'
    if (active) {
      const effect = effects.find((e) => e.id === settings.effect)
      $('scene-name').textContent = 'Media / ' + effect.name
      $('hero-name').textContent = effect.name
      $('shape-number').textContent = 'LIVE MEDIA / ' + (selected.type === 'video' ? 'VIDEO' : 'IMAGE')
      document.querySelector('.caption p').textContent = effect.description
      floor.visible = settings.grid
      $('viewport').style.background = settings.background
    }
  }
  function rebuild() {
    if (!resource) return
    if (current) {
      scene.remove(current.group)
      current.dispose()
    }
    current = createMediaObject(THREE, resource.texture, settings, resource.aspect)
    current.group.visible = active
    scene.add(current.group)
    if (particleMediaEffects.includes(settings.effect)) reveal = 0
    sync()
  }
  function applySettings(key) {
    if (!current) return
    const u = current.uniforms
    for (const name of ['wave', 'bend', 'frequency', 'speed', 'hover', 'scatter', 'pointSize', 'opacity']) {
      const uniform = 'u' + name[0].toUpperCase() + name.slice(1)
      u[uniform].value =
        (settings.effect === 'flat' && ['wave', 'bend'].includes(name)) ||
        (name === 'scatter' && !particleMediaEffects.includes(settings.effect))
          ? 0
          : settings[name]
    }
    u.uPower.value = settings.intensity
    u.uTurbulence.value = settings.turbulence
    current.group.scale.setScalar(settings.scale)
    if (key === 'tiltX' || key === 'tiltY')
      current.group.rotation.set(THREE.MathUtils.degToRad(settings.tiltX), THREE.MathUtils.degToRad(settings.tiltY), 0)
    current.object.material.wireframe = settings.wireframe && !particleMediaEffects.includes(settings.effect)
    sync()
    persist()
  }
  async function loadAsset(asset) {
    const ticket = ++serial
    message('Loading ' + asset.name + '…')
    try {
      const next = await textureFor(asset)
      if (ticket !== serial) {
        next.texture.dispose()
        next.cleanup()
        return
      }
      if (current) {
        scene.remove(current.group)
        current.dispose()
        current = null
      }
      resource?.texture.dispose()
      resource?.cleanup()
      resource = next
      selected = asset
      rebuild()
      renderAssets()
      $('media-name').textContent = asset.name
      $('media-badge').textContent = asset.type.toUpperCase()
      $('video-toggle').hidden = !resource.video
      if (resource.video && active) {
        try {
          await resource.video.play()
          $('video-toggle').textContent = 'Ⅱ Pause video'
        } catch {
          $('video-toggle').textContent = '▷ Play video'
        }
      }
      message('Ready · drag to orbit, scroll to zoom, hover to distort')
      persist()
    } catch (error) {
      message(error.message, true)
    }
  }
  async function importFiles(files) {
    for (const file of files) {
      if (!/^(image|video)\//.test(file.type)) {
        message('Choose an image or a browser-playable video.', true)
        continue
      }
      if (file.size > 100 * 1048576) {
        message('Choose a file under 100 MB for this browser workspace.', true)
        continue
      }
      const asset = {
        id: mediaId(),
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        blob: file,
      }
      assets.push(asset)
      renderAssets()
      uploadPending++
      await loadAsset(asset)
      try {
        await dbAction('put', asset)
      } catch {
        message('Loaded for this session; browser storage is full or unavailable. Export to keep it.', true)
      } finally {
        uploadPending--
      }
    }
    $('media-files').value = ''
  }
  function resetView() {
    camera.position.set(0.5, 0.45, 7.7)
    orbit.target.set(0, 0, 0)
    orbit.update()
    if (current)
      current.group.rotation.set(THREE.MathUtils.degToRad(settings.tiltX), THREE.MathUtils.degToRad(settings.tiltY), 0)
  }
  function setMode(media) {
    active = media
    document.body.classList.toggle('media-mode', active)
    $('mode-media').classList.toggle('active', active)
    $('mode-shapes').classList.toggle('active', !active)
    $('mode-media').setAttribute('aria-pressed', active)
    $('mode-shapes').setAttribute('aria-pressed', !active)
    holder.visible = !active
    if (current) current.group.visible = active
    if (active) {
      originalCamera = camera.position.clone()
      originalTarget = orbit.target.clone()
      resetView()
      sync()
      $('export').textContent = '↗ Export / code'
      $('export').onclick = exportScene
      if (resource?.video)
        resource.video
          .play()
          .then(() => {
            $('video-toggle').textContent = 'Ⅱ Pause video'
          })
          .catch(() => {
            $('video-toggle').textContent = '▷ Play video'
          })
    } else {
      if (originalCamera) {
        camera.position.copy(originalCamera)
        orbit.target.copy(originalTarget)
        orbit.update()
      } else resetCamera()
      resource?.video?.pause()
      $('viewport').style.background = ''
      $('export').textContent = '↗ Export / code'
      $('export').onclick = shapeExport
      const shapeButton = document.querySelector('.element.active')
      shapeButton?.click()
      document.querySelector('.caption p').textContent = 'Small experiments. Infinite possibilities.'
    }
    persist()
  }
  async function exportScene() {
    if (!resource) return
    const button = $('export')
    button.disabled = true
    button.textContent = 'Preparing export…'
    try {
      const media = selected.demo ? selected.canvas.toDataURL('image/png') : await blobDataURL(selected.blob)
      const state = { settings, aspect: resource.aspect, type: selected.type, media }
      const json = JSON.stringify(state).replace(/</g, '\\u003c')
      const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Form Studio — interactive media</title><style>body{margin:0;background:${settings.background};font-family:system-ui;color:white}canvas{display:block;width:100vw;height:100vh}aside{position:fixed;bottom:24px;left:24px;font-size:12px;opacity:.65}button{position:fixed;right:24px;bottom:24px;padding:10px 16px;border:1px solid #667;background:#222a;color:white;border-radius:6px;cursor:pointer}</style><canvas></canvas><aside>Drag to orbit · scroll to zoom · hover to distort</aside><button id="pause">Pause motion</button><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js"}}</script><script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/controls/OrbitControls.js';
${runtimeSource}
const state=${json};
const canvas=document.querySelector('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,100);
camera.position.set(.5,.45,7.7);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=20;
let texture,video;
if(state.type==='video'){video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.src=state.media;await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=reject;video.load()});texture=new THREE.VideoTexture(video);video.play().catch(()=>{document.body.addEventListener('pointerdown',()=>video.play(),{once:true})})}
else {texture=await new THREE.TextureLoader().loadAsync(state.media)}
const item=createMediaObject(THREE,texture,state.settings,state.aspect);scene.add(item.group);
if(state.settings.grid){const grid=new THREE.GridHelper(30,60,0x4a5368,0x353e50);grid.position.y=-1.95;scene.add(grid)}
const pointer=new THREE.Vector2(3,3),ray=new THREE.Raycaster();
canvas.addEventListener('pointermove',e=>{pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2)});
canvas.addEventListener('pointerleave',()=>pointer.set(3,3));
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();item.uniforms.uViewport.value=innerHeight}
addEventListener('resize',resize);resize();
let running=state.settings.playing,clock=new THREE.Clock(),time=0;
const pause=document.getElementById('pause');pause.textContent=running?'Pause motion':'Play motion';
pause.onclick=()=>{running=!running;pause.textContent=running?'Pause motion':'Play motion';if(video){if(running)video.play();else video.pause()}};
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(running){time+=dt;if(state.settings.autoRotate)item.group.rotation.y+=dt*.3}item.uniforms.uTime.value=time;controls.update();scene.updateMatrixWorld();ray.setFromCamera(pointer,camera);const hit=ray.intersectObject(item.hit)[0];if(hit?.uv)item.uniforms.uPointer.value.lerp(hit.uv,.2);item.uniforms.uPointerActive.value=THREE.MathUtils.lerp(item.uniforms.uPointerActive.value,hit?1:0,.15);renderer.render(scene,camera)});
</script></html>`
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'form-studio-' + settings.effect + '.html'
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      message('Exported interactive HTML · media included · internet needed for Three.js')
    } catch (error) {
      message('Export failed: ' + error.message, true)
    } finally {
      button.disabled = false
      button.textContent = active ? '↗ Export interactive HTML' : '↗ Export code'
    }
  }

  $('media-blast').onclick = () => {
    settings.effect = 'explode'
    settings.playing = true
    burstPhase = 0
    settings.phase = 0
    reassembling = false
    rebuild()
    persist()
  }
  $('media-reassemble').onclick = () => {
    reassembling = true
    settings.playing = true
    sync()
  }
  $('media-phase').oninput = () => {
    burstPhase = Number($('media-phase').value)
    settings.phase = burstPhase
    settings.playing = false
    reassembling = false
    sync()
    persist()
  }
  $('mode-media').onclick = () => {
    if (!active) setMode(true)
  }
  $('mode-shapes').onclick = () => {
    if (active) setMode(false)
  }
  $('import-media').onclick = () => $('media-files').click()
  $('media-files').onchange = (event) => importFiles(Array.from(event.target.files))
  $('m-effect').onchange = () => {
    settings.effect = $('m-effect').value
    rebuild()
    persist()
  }
  for (const button of dock.querySelectorAll('[data-effect]'))
    button.onclick = () => {
      settings.effect = button.dataset.effect
      rebuild()
      persist()
    }
  for (const input of inspector.querySelectorAll('[data-setting]'))
    input.addEventListener('input', () => {
      const key = input.dataset.setting
      settings[key] = input.type === 'checkbox' ? input.checked : Number(input.value)
      if (key === 'density') rebuild()
      else applySettings(key)
      sync()
      persist()
    })
  $('m-background').oninput = () => {
    settings.background = $('m-background').value
    sync()
    persist()
  }
  $('reveal-media').onclick = () => {
    reveal = 0
    settings.scatter = 0
    applySettings('scatter')
  }
  $('media-motion').onclick = () => {
    settings.playing = !settings.playing
    sync()
    persist()
  }
  $('media-reset-view').onclick = resetView
  $('reset-media-settings').onclick = () => {
    Object.assign(settings, defaults, { effect: settings.effect })
    rebuild()
    persist()
  }
  $('video-toggle').onclick = async () => {
    if (!resource?.video) return
    if (resource.video.paused) {
      try {
        await resource.video.play()
        $('video-toggle').textContent = 'Ⅱ Pause video'
      } catch {
        message('Video playback is not supported by this browser.', true)
      }
    } else {
      resource.video.pause()
      $('video-toggle').textContent = '▷ Play video'
    }
  }
  const viewport = $('viewport')
  viewport.addEventListener('dragover', (event) => {
    if (active) {
      event.preventDefault()
      viewport.classList.add('drop-active')
    }
  })
  viewport.addEventListener('dragleave', () => viewport.classList.remove('drop-active'))
  viewport.addEventListener('drop', (event) => {
    event.preventDefault()
    viewport.classList.remove('drop-active')
    if (active) importFiles(Array.from(event.dataTransfer.files))
  })
  renderer.domElement.addEventListener('pointermove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((event.clientY - rect.top) / rect.height) * 2)
  })
  renderer.domElement.addEventListener('pointerleave', () => {
    pointer.set(3, 3)
    hoverTarget = 0
  })
  renderAssets()
  setMode(true)
  loadAsset(demo)
  dbAction('getAll')
    .then(async (restored) => {
      for (const asset of restored || []) if (!assets.some((a) => a.id === asset.id)) assets.push(asset)
      renderAssets()
      const previous = assets.find((a) => a.id === saved.selected)
      if (previous && !uploadPending && selected.id === 'demo') await loadAsset(previous)
    })
    .catch(() => message('Media works for this session; browser storage is unavailable.'))

  return {
    get settings() {
      return settings
    },
    get current() {
      return current
    },
    get resource() {
      return resource
    },
    get phase() {
      return burstPhase
    },
    get time() {
      return time
    },
    setMode,
    async getProject() {
      if (!resource) throw new Error('Wait for media to load.')
      return {
        kind: 'media',
        name: selected.name,
        settings: { ...settings, phase: burstPhase },
        aspect: resource.aspect,
        type: selected.type,
        media: selected.demo ? selected.canvas.toDataURL('image/png') : await blobDataURL(selected.blob),
      }
    },
    async importProject(data) {
      if (!/^data:(image|video)\//.test(data.media || ''))
        throw new Error('Project media must be an embedded image or video.')
      const response = await fetch(data.media)
      const blob = await response.blob()
      const asset = {
        id: mediaId(),
        name: String(data.name || 'Imported media'),
        type: data.type === 'video' ? 'video' : 'image',
        blob,
      }
      Object.assign(settings, defaults, data.settings)
      if (!effects.some((e) => e.id === settings.effect)) settings.effect = 'wave'
      assets.push(asset)
      setMode(true)
      await loadAsset(asset)
      await dbAction('put', asset)
      burstPhase = settings.phase || 0
      sync()
      persist()
    },
    get active() {
      return active
    },
    update(delta, now) {
      if (!active || !current) return
      if (settings.playing) {
        time += delta
        if (settings.autoRotate) current.group.rotation.y += delta * 0.3
      }
      reveal = Math.min(1, reveal + delta * 0.7)
      if (settings.playing && settings.effect === 'explode') {
        burstPhase += delta * (reassembling ? 1.5 : settings.speed / settings.duration)
        if (burstPhase >= 1) {
          if (settings.loop && !reassembling) burstPhase %= 1
          else {
            burstPhase = 1
            settings.playing = false
            reassembling = false
            sync()
          }
        }
      }
      current.uniforms.uPhase.value = burstPhase
      $('media-phase').value = burstPhase
      $('media-phase-value').value = Math.round(burstPhase * 100) + '%'
      current.uniforms.uTime.value = time
      current.uniforms.uReveal.value = 1 - Math.pow(1 - reveal, 3)
      current.uniforms.uViewport.value = renderer.domElement.clientHeight
      scene.updateMatrixWorld()
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(current.hit)[0]
      hoverTarget = hit?.uv ? 1 : 0
      if (hit?.uv) pointerGoal.copy(hit.uv)
      current.uniforms.uPointer.value.lerp(pointerGoal, 1 - Math.exp(-delta * 14))
      current.uniforms.uPointerActive.value = THREE.MathUtils.lerp(
        current.uniforms.uPointerActive.value,
        hoverTarget,
        1 - Math.exp(-delta * 8)
      )
    },
  }
}
