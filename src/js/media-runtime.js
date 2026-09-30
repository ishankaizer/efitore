export const mediaVertex = `
uniform float uTime;
uniform float uWave;
uniform float uBend;
uniform float uFrequency;
uniform float uSpeed;
uniform float uHover;
uniform float uScatter;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uViewport;
uniform float uReveal;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uPlanar;
uniform float uFX;
uniform float uPower;
uniform float uPhase;
uniform float uTurbulence;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vUv = uv;
  vec3 p = position;
  float phase = uTime * uSpeed;
  float edge = 0.25 + 0.75 * uv.x;
  float wave = sin(uv.x * uFrequency * 6.283 - phase) * uWave * edge;
  wave += cos(uv.y * 6.283 + phase * 0.7) * uWave * 0.25;
  p.z += (wave + uBend * (uv.x - 0.5) * (uv.x - 0.5) * 4.0) * uPlanar;
  float dist = distance(uv, uPointer);
  float influence = exp(-dist * dist * 55.0) * uPointerActive;
  p.z += influence * sin(dist * 24.0 - uTime * 3.0) * uHover * uPlanar;
  vec3 randomDirection = vec3(hash(uv), hash(uv.yx + 1.3), hash(uv + 4.5)) * 2.0 - 1.0;
  float spread = uScatter + (1.0 - uReveal) * 2.5;
  p += randomDirection * (spread + influence * uHover * 0.2) * uPlanar;
  float burst = sin(clamp(uPhase, 0.0, 1.0) * 3.14159265);
  if (uFX > 0.5 && uFX < 1.5) {
    p += normalize(vec3(position.xy, 0.2) + randomDirection * 0.7) * burst * uPower * (1.0 + hash(uv + 7.0) * 3.0);
    p.y -= burst * burst * uPower * 0.7;
  } else if (uFX > 1.5 && uFX < 2.5) {
    float angle = length(position.xy) * uPower + phase;
    p.xy = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xy;
    p.z += sin(length(position.xy) * 3.0 - phase) * uPower;
  } else if (uFX > 2.5 && uFX < 3.5) {
    float r = sqrt(hash(uv + 5.0)) * 2.5 * uPower;
    float a = floor(hash(uv.yx) * 4.0) * 1.5708 + r * 1.3 + phase * 0.4;
    p = vec3(cos(a) * r, (hash(uv + 2.0) - 0.5) * 0.6 * r, sin(a) * r);
  } else if (uFX > 3.5 && uFX < 4.5) {
    float band = floor(uv.y * 24.0);
    float jump = step(0.78, hash(vec2(band, floor(phase * 8.0))));
    p.x += jump * sin(band * 9.0 + phase) * uPower;
    p.z += jump * uPower * 0.5;
  } else if (uFX > 4.5) {
    float radius = length(uv - vec2(0.5));
    p.z += sin(radius * 35.0 - phase * 3.0) * exp(-radius * 2.0) * uPower * 0.55;
  }
  if (uFX > 0.5) p += randomDirection * sin(phase + hash(uv) * 20.0) * uTurbulence * (uFX < 1.5 ? burst : 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPointSize * uPixelRatio * (uViewport / 750.0) * 6.0 / max(0.5, -mv.z), 1.0, 48.0);
}`

export const mediaFragment = `
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uPoints;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  float alpha = color.a * uOpacity;
  if (uPoints > 0.5) {
    float d = length(gl_PointCoord - vec2(0.5));
    alpha *= 1.0 - smoothstep(0.38, 0.5, d);
  }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color.rgb, alpha);
}`

export const particleMediaEffects = ['particles', 'explode', 'vortex', 'galaxy']
export function createMediaObject(THREE, texture, settings, aspect) {
  const particles = particleMediaEffects.includes(settings.effect)
  const planar = !['cylinder', 'sphere'].includes(settings.effect)
  const width = aspect >= 1 ? 4.4 : 3.1 * aspect
  const height = aspect >= 1 ? 4.4 / aspect : 3.1
  const density = Math.min(240, Math.max(50, Math.round(settings.density) || 160))
  let geometry
  if (settings.effect === 'sphere') geometry = new THREE.SphereGeometry(1.55, 96, 64)
  else if (settings.effect === 'cylinder') geometry = new THREE.CylinderGeometry(1.3, 1.3, 2.8, 128, 48, true)
  else
    geometry = new THREE.PlaneGeometry(
      width,
      height,
      density,
      Math.min(320, Math.max(24, Math.round(density / Math.max(aspect, 0.3))))
    )
  if (particles) geometry.setIndex(null)
  const uniforms = {
    uTexture: { value: texture },
    uTime: { value: 0 },
    uWave: { value: settings.effect === 'flat' ? 0 : settings.wave },
    uBend: { value: settings.effect === 'flat' ? 0 : settings.bend },
    uFrequency: { value: settings.frequency },
    uSpeed: { value: settings.speed },
    uHover: { value: settings.hover },
    uScatter: { value: particles ? settings.scatter : 0 },
    uPointSize: { value: settings.pointSize },
    uPixelRatio: { value: Math.min(globalThis.devicePixelRatio || 1, 2) },
    uViewport: { value: 750 },
    uReveal: { value: 1 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerActive: { value: 0 },
    uPlanar: { value: planar ? 1 : 0 },
    uOpacity: { value: settings.opacity },
    uPoints: { value: particles ? 1 : 0 },
    uFX: { value: { explode: 1, vortex: 2, galaxy: 3, glitch: 4, ripple: 5 }[settings.effect] || 0 },
    uPower: { value: settings.intensity ?? 1.4 },
    uPhase: { value: settings.phase ?? 0 },
    uTurbulence: { value: settings.turbulence ?? 0.2 },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader: mediaVertex,
    fragmentShader: mediaFragment,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: !particles,
    wireframe: settings.wireframe && !particles,
    toneMapped: false,
  })
  const object = particles ? new THREE.Points(geometry, material) : new THREE.Mesh(geometry, material)
  object.frustumCulled = false
  const group = new THREE.Group()
  group.add(object)
  group.scale.setScalar(settings.scale)
  group.rotation.set(THREE.MathUtils.degToRad(settings.tiltX), THREE.MathUtils.degToRad(settings.tiltY), 0)
  // Transparent raycast surface gives particle banners predictable pointer coordinates.
  const hitGeometry = planar ? new THREE.PlaneGeometry(width, height) : geometry.clone()
  const hit = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, visible: false }))
  group.add(hit)
  return {
    group,
    object,
    uniforms,
    hit,
    width,
    height,
    dispose() {
      geometry.dispose()
      material.dispose()
      hitGeometry.dispose()
      hit.material.dispose()
    },
  }
}
