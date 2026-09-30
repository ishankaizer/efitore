import * as THREE from 'three'
import { particleDefaults, particleEffects, createShapeParticles } from './particle-runtime'
const $ = (id) => document.getElementById(id)
export function createShapeFX({ holder, renderer, camera, orbit, getObject, getSettings, save, setStatus }) {
  let particle,
    time = 0,
    phase = 0,
    returning = false
  const pointerNDC = new THREE.Vector2(3, 3),
    ray = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    worldPoint = new THREE.Vector3()
  const settings = () => {
    const s = getSettings()
    if (!s.fx) s.fx = { ...particleDefaults }
    for (const key of Object.keys(particleDefaults)) if (s.fx[key] === undefined) s.fx[key] = particleDefaults[key]
    return s.fx
  }
  const section = document.createElement('section')
  section.className = 'shape-fx controls'
  section.innerHTML =
    '<h3>Particle engine <span class="engine-label">LIVE</span></h3><label for="fx-effect">Simulation</label><select id="fx-effect">' +
    particleEffects.map(([id, name]) => '<option value="' + id + '">' + name + '</option>').join('') +
    '</select><div id="fx-parameters">' +
    [
      ['count', 'Particle count', 1000, 24000, 1000],
      ['intensity', 'Force', 0.2, 3.5, 0.05],
      ['size', 'Particle size', 0.01, 0.12, 0.005],
      ['speed', 'Simulation speed', 0.1, 3, 0.05],
      ['turbulence', 'Turbulence', 0, 2, 0.05],
      ['gravity', 'Gravity', 0, 2, 0.05],
      ['pointerForce', 'Pointer repulsion', 0, 3, 0.1],
      ['duration', 'Cycle length (seconds)', 2, 12, 0.5],
    ]
      .map(
        ([id, name, min, max, step]) =>
          '<label class="range-label" for="fx-' +
          id +
          '">' +
          name +
          '<output id="fx-' +
          id +
          '-value"></output></label><input type="range" id="fx-' +
          id +
          '" data-fx="' +
          id +
          '" min="' +
          min +
          '" max="' +
          max +
          '" step="' +
          step +
          '">'
      )
      .join('') +
    '<div class="fx-colors"><label>Core<input id="fx-colorA" type="color"></label><label>Edge<input id="fx-colorB" type="color"></label></div><label class="toggle-row">Additive glow<input id="fx-glow" type="checkbox" role="switch"></label><label class="toggle-row">Loop explosion<input id="fx-loop" type="checkbox" role="switch"></label></div>'
  document
    .querySelector('.inspector')
    .insertBefore(section, document.querySelector('.inspector .control-section, .inspector .controls'))
  const bar = document.createElement('section')
  bar.className = 'fx-bar'
  bar.innerHTML =
    '<div class="fx-presets">' +
    particleEffects
      .map(([id, name, icon]) => '<button data-shape-effect="' + id + '">' + icon + ' ' + name + '</button>')
      .join('') +
    '</div><div class="fx-transport"><button id="fx-play">Ⅱ Pause FX</button><button id="fx-blast" class="blast-button">✹ Explode</button><button id="fx-return">↶ Reassemble</button><label for="fx-phase">PHASE</label><input id="fx-phase" type="range" min="0" max="1" step="0.001" value="0"><output id="fx-phase-value">0%</output></div>'
  document.querySelector('.center').insertBefore(bar, document.querySelector('.editor'))
  function sync() {
    const s = settings()
    $('fx-effect').value = s.effect
    $('fx-parameters').hidden = s.effect === 'solid'
    for (const input of section.querySelectorAll('[data-fx]')) {
      input.value = s[input.dataset.fx]
      $(input.id + '-value').value =
        input.dataset.fx === 'count' ? s.count.toLocaleString() : Number(s[input.dataset.fx]).toFixed(2)
    }
    for (const key of ['colorA', 'colorB']) $('fx-' + key).value = s[key]
    $('fx-glow').checked = s.glow
    $('fx-loop').checked = s.loop
    for (const b of bar.querySelectorAll('[data-shape-effect]')) {
      b.classList.toggle('active', b.dataset.shapeEffect === s.effect)
      b.setAttribute('aria-pressed', b.dataset.shapeEffect === s.effect)
    }
    $('fx-play').textContent = s.playing ? 'Ⅱ Pause FX' : '▷ Play FX'
    $('fx-phase').value = phase
    $('fx-phase-value').value = Math.round(phase * 100) + '%'
    $('fx-phase').disabled = s.effect !== 'explode'
    $('fx-return').disabled = s.effect !== 'explode'
    $('fx-play').disabled = s.effect === 'solid'
  }
  function rebuild() {
    const s = settings(),
      object = getObject()
    if (particle) {
      holder.remove(particle.points)
      particle.dispose()
      particle = null
    }
    if (!object) return
    object.visible = s.effect === 'solid'
    if (s.effect !== 'solid') {
      try {
        particle = createShapeParticles(THREE, object, s)
        holder.add(particle.points)
      } catch (error) {
        object.visible = true
        s.effect = 'solid'
        setStatus(error.message, true)
      }
    }
    time = 0
    phase = s.phase || 0
    returning = false
    sync()
  }
  function choose(effect) {
    settings().effect = effect
    settings().playing = true
    settings().phase = 0
    rebuild()
    save()
  }
  $('fx-effect').onchange = () => choose($('fx-effect').value)
  for (const b of bar.querySelectorAll('[data-shape-effect]')) b.onclick = () => choose(b.dataset.shapeEffect)
  for (const input of section.querySelectorAll('[data-fx]'))
    input.oninput = () => {
      settings()[input.dataset.fx] = Number(input.value)
      if (input.dataset.fx === 'count') rebuild()
      sync()
      save()
    }
  for (const key of ['colorA', 'colorB'])
    $('fx-' + key).oninput = () => {
      settings()[key] = $('fx-' + key).value
      rebuild()
      save()
    }
  for (const key of ['glow', 'loop'])
    $('fx-' + key).onchange = () => {
      settings()[key] = $('fx-' + key).checked
      rebuild()
      save()
    }
  $('fx-play').onclick = () => {
    settings().playing = !settings().playing
    sync()
    save()
  }
  $('fx-blast').onclick = () => {
    if (settings().effect !== 'explode') choose('explode')
    phase = 0
    time = 0
    returning = false
    settings().playing = true
    settings().phase = 0
    sync()
    save()
  }
  $('fx-return').onclick = () => {
    returning = true
    settings().playing = true
    sync()
  }
  $('fx-phase').oninput = () => {
    phase = Number($('fx-phase').value)
    settings().phase = phase
    settings().playing = false
    returning = false
    sync()
    save()
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect()
    pointerNDC.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2)
  })
  renderer.domElement.addEventListener('pointerleave', () => pointerNDC.set(3, 3))
  rebuild()
  return {
    rebuild,
    get settings() {
      return settings()
    },
    get particle() {
      return particle
    },
    get phase() {
      return phase
    },
    get time() {
      return time
    },
    update(delta, active) {
      if (!active || !particle) return
      const s = settings()
      if (s.playing) {
        time += delta
        if (returning) {
          phase = Math.min(1, phase + delta * 1.4)
          if (phase === 1) {
            returning = false
            s.playing = false
            s.phase = 1
            save()
            sync()
          }
        } else if (s.effect === 'explode') {
          phase += (delta * s.speed) / s.duration
          if (phase >= 1) {
            if (s.loop) phase %= 1
            else {
              phase = 1
              s.playing = false
              sync()
            }
          }
        }
      }
      let point = null
      if (Math.abs(pointerNDC.x) <= 1 && Math.abs(pointerNDC.y) <= 1) {
        const direction = camera.getWorldDirection(new THREE.Vector3())
        plane.setFromNormalAndCoplanarPoint(direction, orbit.target)
        ray.setFromCamera(pointerNDC, camera)
        if (ray.ray.intersectPlane(plane, worldPoint)) {
          holder.updateMatrixWorld()
          point = holder.worldToLocal(worldPoint.clone())
        }
      }
      particle.update(time, phase, point)
      $('fx-phase').value = phase
      $('fx-phase-value').value = Math.round(phase * 100) + '%'
    },
  }
}
