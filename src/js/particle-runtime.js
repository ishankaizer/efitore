// Self-contained runtime: shared by the editor and downloadable JavaScript.
export const particleDefaults = {
  effect: 'solid',
  count: 9000,
  intensity: 1.5,
  speed: 1,
  size: 0.07,
  turbulence: 0.25,
  gravity: 0.5,
  duration: 5,
  loop: true,
  playing: true,
  phase: 0,
  glow: true,
  colorA: '#7cbcff',
  colorB: '#ff785b',
  pointerForce: 0.8,
}
export const particleEffects = [
  ['solid', 'Solid', '◈'],
  ['explode', 'Supernova', '✹'],
  ['vortex', 'Vortex', '◌'],
  ['galaxy', 'Galaxy', '✧'],
  ['wave', 'Wavefield', '≈'],
  ['morph', 'Morph', '◎'],
]

export function sampleSurface(THREE, root, count, seed = 314159) {
  // Area-weighted, seeded sampling also supports groups and custom editor meshes.
  const triangles = [],
    cumulative = []
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3()
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3()
  root.updateMatrixWorld(true)
  const inverse = root.parent ? root.parent.matrixWorld.clone().invert() : new THREE.Matrix4()
  let total = 0
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry?.attributes.position) return
    const pos = node.geometry.attributes.position,
      index = node.geometry.index
    const matrix = inverse.clone().multiply(node.matrixWorld)
    const length = index ? index.count : pos.count
    for (let i = 0; i + 2 < length; i += 3) {
      a.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(matrix)
      b.fromBufferAttribute(pos, index ? index.getX(i + 1) : i + 1).applyMatrix4(matrix)
      c.fromBufferAttribute(pos, index ? index.getX(i + 2) : i + 2).applyMatrix4(matrix)
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5
      if (area < 1e-12) continue
      total += area
      triangles.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      cumulative.push(total)
    }
  })
  if (!total) throw new Error('Particle effects need a mesh with triangle geometry.')
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const base = new Float32Array(count * 3),
    seeds = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const target = random() * total
    let lo = 0,
      hi = cumulative.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cumulative[mid] < target) lo = mid + 1
      else hi = mid
    }
    const j = lo * 9,
      u = Math.sqrt(random()),
      v = random()
    for (let k = 0; k < 3; k++)
      base[i * 3 + k] = triangles[j + k] * (1 - u) + triangles[j + 3 + k] * u * (1 - v) + triangles[j + 6 + k] * u * v
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = random()
  }
  return { base, seeds }
}

export function computeParticleFrame(base, seeds, out, settings, time, phase, pointer) {
  const strength = settings.intensity,
    thetaTime = time * settings.speed
  const blast = Math.sin(Math.max(0, Math.min(1, phase)) * Math.PI)
  for (let i = 0; i < base.length / 3; i++) {
    const j = i * 3,
      k = i * 4
    const bx = base[j],
      by = base[j + 1],
      bz = base[j + 2]
    const r1 = seeds[k],
      r2 = seeds[k + 1],
      r3 = seeds[k + 2],
      r4 = seeds[k + 3]
    let x = bx,
      y = by,
      z = bz
    if (settings.effect === 'explode') {
      const len = Math.hypot(bx, by, bz) || 1
      const velocity = (0.8 + r1 * 2.5) * strength * blast
      x += (bx / len + (r2 - 0.5) * 0.8) * velocity
      y += (by / len + (r3 - 0.5) * 0.8) * velocity - settings.gravity * blast * blast * 2
      z += (bz / len + (r4 - 0.5) * 0.8) * velocity
    } else if (settings.effect === 'vortex') {
      const radius = Math.hypot(bx, bz) + (0.15 + r1 * 0.4) * strength
      const angle = Math.atan2(bz, bx) + thetaTime * (0.6 + r2) + by * strength
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = by + Math.sin(thetaTime + r3 * 6.28) * strength * 0.35
    } else if (settings.effect === 'galaxy') {
      const radius = Math.sqrt(r1) * strength * 3
      const angle = (Math.floor(r2 * 4) * Math.PI) / 2 + radius * 1.25 - thetaTime * 0.35 + (r3 - 0.5) * 0.5
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = (r4 - 0.5) * (0.15 + radius * 0.16) + Math.sin(angle * 2 + thetaTime) * 0.12
    } else if (settings.effect === 'wave') {
      const wave = Math.sin(bx * 2.5 + thetaTime * 2) + Math.cos(bz * 2.5 - thetaTime * 1.4)
      y += wave * strength * 0.4
      x += Math.sin(by * 3 + thetaTime) * strength * 0.12
      z += Math.cos(bx * 3 - thetaTime) * strength * 0.12
    } else if (settings.effect === 'morph') {
      const mix = (Math.sin(thetaTime) + 1) * 0.5
      const azimuth = r2 * Math.PI * 2,
        polar = Math.acos(r3 * 2 - 1),
        radius = 1.6
      x = bx * (1 - mix) + Math.sin(polar) * Math.cos(azimuth) * radius * mix
      y = by * (1 - mix) + Math.cos(polar) * radius * mix
      z = bz * (1 - mix) + Math.sin(polar) * Math.sin(azimuth) * radius * mix
    }
    const noise = settings.turbulence * 0.2 * (settings.effect === 'explode' ? blast : 1)
    x += Math.sin(thetaTime * 1.7 + r1 * 30 + by * 2) * noise
    y += Math.cos(thetaTime * 1.3 + r2 * 30 + bz * 2) * noise
    z += Math.sin(thetaTime * 1.1 + r3 * 30 + bx * 2) * noise
    if (pointer && settings.pointerForce) {
      const dx = x - pointer.x,
        dy = y - pointer.y,
        dz = z - pointer.z
      const d2 = dx * dx + dy * dy + dz * dz
      const force = Math.exp(-d2 * 1.7) * settings.pointerForce
      x += dx * force
      y += dy * force
      z += dz * force
    }
    out[j] = x
    out[j + 1] = y
    out[j + 2] = z
  }
  return out
}

export function createShapeParticles(THREE, root, settings) {
  const count = Math.min(30000, Math.max(500, Math.floor(settings.count)))
  const { base, seeds } = sampleSurface(THREE, root, count)
  const geometry = new THREE.BufferGeometry()
  const positions = base.slice(),
    colors = new Float32Array(count * 3)
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 64
  const ctx = sprite.getContext('2d'),
    gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,.95)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const map = new THREE.CanvasTexture(sprite)
  const material = new THREE.PointsMaterial({
    size: settings.size,
    map,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: settings.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  let colorKey = ''
  function update(time, phase, pointer) {
    computeParticleFrame(base, seeds, positions, settings, time, phase, pointer)
    geometry.attributes.position.needsUpdate = true
    material.size = settings.size
    material.blending = settings.glow ? THREE.AdditiveBlending : THREE.NormalBlending
    const key = settings.colorA + settings.colorB
    if (key !== colorKey) {
      const a = new THREE.Color(settings.colorA),
        b = new THREE.Color(settings.colorB),
        color = new THREE.Color()
      for (let i = 0; i < count; i++) {
        color.copy(a).lerp(b, seeds[i * 4])
        color.toArray(colors, i * 3)
      }
      geometry.attributes.color.needsUpdate = true
      colorKey = key
    }
  }
  update(0, 0)
  return {
    points,
    base,
    seeds,
    update,
    dispose() {
      geometry.dispose()
      material.dispose()
      map.dispose()
    },
  }
}
