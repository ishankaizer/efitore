import particleSource from './particle-runtime.js?raw'
import mediaSource from './media-runtime.js?raw'

const mountingSource = `
export async function mountEffect(container, options = {}) {
  const config = structuredClone(project);
  const isMedia = config.kind === 'media';
  const s = config.settings;
  const fx = isMedia ? s : { ...particleDefaults, ...s.fx };
  let video, texture, item, particle, shape;
  const root = new THREE.Group();
  function cleanupObject(object) {
    const geometries=new Set(),materials=new Set();
    object?.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>materials.add(m))});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  if (isMedia) {
    if(config.type==='video'){
      video=document.createElement('video');video.loop=true;video.muted=true;video.playsInline=true;video.crossOrigin='anonymous';
      await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(new Error('Video could not load'));video.src=config.media;video.load()});
      texture=new THREE.VideoTexture(video);
    } else texture=await new THREE.TextureLoader().loadAsync(config.media);
    item=createMediaObject(THREE,texture,s,config.aspect);root.add(item.group);
  } else {
    const material=s.material==='normal'?new THREE.MeshNormalMaterial():s.material==='basic'?new THREE.MeshBasicMaterial({color:s.color}):new THREE.MeshStandardMaterial({color:s.color,roughness:s.roughness,metalness:s.metalness});
    material.wireframe=s.wireframe;
    shape=buildShape(THREE,material);
    root.add(shape);root.scale.setScalar(s.scale);root.rotation.y=THREE.MathUtils.degToRad(s.rotation);
    if(fx.effect!=='solid'){particle=createShapeParticles(THREE,shape,fx);shape.visible=false;root.add(particle.points)}
  }
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const canvas=renderer.domElement;canvas.style.cssText='width:100%;height:100%;display:block;touch-action:none';container.append(canvas);
  const scene=new THREE.Scene();scene.add(root);
  scene.add(new THREE.HemisphereLight(0xd8e4ff,0x4c4263,.7));
  const key=new THREE.DirectionalLight(0xe5edff,1.7);key.position.set(3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8a9eff,1.4);rim.position.set(-4,1,-2);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xffdac9,.5);fill.position.set(0,-1,4);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(38,1,.1,100);
  if(isMedia)camera.position.set(.5,.45,7.7);else camera.position.set(4.7,3.1,6.8);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=25;controls.enabled=options.interactive!==false;
  const pointer=new THREE.Vector2(3,3),ray=new THREE.Raycaster(),plane=new THREE.Plane(),world=new THREE.Vector3();
  const onMove=e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2)};
  const onLeave=()=>pointer.set(3,3);
  canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerleave',onLeave);
  const resize=()=>{const r=container.getBoundingClientRect();const w=Math.max(r.width,1),h=Math.max(r.height,1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(item)item.uniforms.uViewport.value=h};
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let time=0,phase=fx.phase||0,playing=options.autoPlay??fx.playing??true,returning=false,previous=performance.now();
  const playVideo=()=>video?.play().catch(()=>{});
  if(playing)playVideo();
  const onClick=()=>{if(playing)playVideo()};canvas.addEventListener('pointerdown',onClick);
  renderer.setAnimationLoop(now=>{
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    if(playing){time+=dt;if(fx.effect==='explode'){phase+=dt*(returning?1.5:(fx.speed??1)/(fx.duration||5));if(phase>=1){if(fx.loop&&!returning)phase%=1;else{phase=1;playing=false;returning=false}}}}
    if(s.autoRotate&&playing)root.rotation.y+=dt*(isMedia ? 0.3 : s.speed);
    controls.update();scene.updateMatrixWorld();ray.setFromCamera(pointer,camera);
    if(item){
      item.uniforms.uTime.value=time;item.uniforms.uPhase.value=phase;
      const hit=ray.intersectObject(item.hit)[0];if(hit?.uv)item.uniforms.uPointer.value.lerp(hit.uv,.2);
      item.uniforms.uPointerActive.value=THREE.MathUtils.lerp(item.uniforms.uPointerActive.value,hit?1:0,.15);
    }
    if(particle){
      let point=null;
      if(Math.abs(pointer.x)<=1&&Math.abs(pointer.y)<=1){plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),controls.target);if(ray.ray.intersectPlane(plane,world))point=root.worldToLocal(world.clone())}
      particle.update(time,phase,point);
    }
    renderer.render(scene,camera);
  });
  return {
    trigger(){phase=0;time=0;playing=true;returning=false;playVideo()},
    reassemble(){returning=true;playing=true},
    pause(value=true){playing=!value;if(video){if(playing)playVideo();else video.pause()}},
    dispose(){renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerleave',onLeave);canvas.removeEventListener('pointerdown',onClick);particle?.dispose();item?.dispose();if(shape)cleanupObject(shape);texture?.dispose();if(video){video.pause();video.removeAttribute('src');video.load()}renderer.dispose();canvas.remove()},
  };
}
`

export function generateExports(project) {
  const json = JSON.stringify(project, null, 2).replace(/</g, '\\u003c')
  const runtime = (project.kind === 'media' ? mediaSource : particleSource).replace(/^export /gm, '')
  const shapeFactory =
    project.kind === 'shape' ? 'function buildShape(THREE, material) {\n' + project.code + '\n}\n' : ''
  const body = runtime + '\nconst project=' + json + ';\n' + shapeFactory + mountingSource
  const imports =
    "import * as THREE from 'three';\nimport { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';\n"
  const js =
    '// Form Studio effect. Install three@0.149.0.\n// const effect = await mountEffect(container); effect.trigger(); effect.dispose();\n' +
    imports +
    body
  const react = `// React component. Requires three@0.149.0.
// Import FormEffect and give it a width and height.
import * as React from 'react';
${imports}
${body}
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function FormEffect({ style, autoPlay = true, interactive = true }) {
  const host = React.useRef(null);
  React.useEffect(() => {
    const element=host.current;
    let controller, cancelled=false;
    mountEffect(element,{autoPlay,interactive}).then(result=>{
      if(cancelled)result.dispose();else controller=result;
    }).catch(error=>{if(!cancelled){const message=document.createElement('p');message.textContent=error.message;element.append(message)}});
    return ()=>{cancelled=true;controller?.dispose();element.replaceChildren()};
  }, [autoPlay,interactive]);
  return React.createElement('div',{ref:host,style:{width:'100%',height:480,overflow:'hidden',background:'${
    project.settings.background || '#181c25'
  }',...style}});
}
`
  const script = (
    imports +
    body +
    `
const controller=await mountEffect(document.getElementById('stage'));
let paused=project.settings.playing===false||project.settings.fx?.playing===false;
document.getElementById('play').textContent=paused?'Play':'Pause';
document.getElementById('return').hidden=(project.settings.fx?.effect||project.settings.effect)!=='explode';
document.getElementById('play').onclick=()=>{paused=!paused;controller.pause(paused);document.getElementById('play').textContent=paused?'Play':'Pause'};
document.getElementById('blast').onclick=()=>{controller.trigger();paused=false;document.getElementById('play').textContent='Pause'};
document.getElementById('return').onclick=()=>controller.reassemble();
`
  ).replaceAll('</script', '<' + String.fromCharCode(92) + '/script')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Form Studio effect</title><style>body{margin:0;background:${
    project.settings.background || '#181c25'
  };font-family:system-ui;color:#dde8ff}#stage{height:100dvh}nav{position:fixed;bottom:20px;left:20px;display:flex;gap:8px}button{padding:10px 16px;border:1px solid #667;background:#1b233de0;color:inherit;border-radius:6px;cursor:pointer}</style><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js","three/examples/jsm/controls/OrbitControls.js":"https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/controls/OrbitControls.js"}}</script></head><body><div id="stage"></div><nav><button id="play">Pause</button><button id="blast">Replay</button><button id="return">Reassemble</button></nav><script type="module">${script}</script></body></html>`
  const framer = `// Framer Code Component: paste into a new code file. No Three.js package setup.
// The scene is isolated in an iframe and loads Three.js from a pinned CDN URL.
import * as React from 'react';
const documentHTML = ${JSON.stringify(html)};
/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function FormEffect({ style, showControls = false }) {
  const source = showControls ? documentHTML : documentHTML.replace('</style>', 'nav{display:none}</style>');
  return React.createElement('iframe', {
    title: 'Form Studio interactive effect', srcDoc: source,
    sandbox: 'allow-scripts', allow: 'autoplay; fullscreen',
    style: { width: '100%', height: 480, border: 0, display: 'block', ...style }
  });
}
`
  return { js, react, framer, html, json }
}
