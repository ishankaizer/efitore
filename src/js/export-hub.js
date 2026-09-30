import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { generateExports } from './export-generator'

export function downloadFile(content, name, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob),
    link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export function createExportHub({ renderer, scene, camera, getProvider, importProject }) {
  const dialog = document.createElement('dialog')
  dialog.className = 'export-dialog'
  dialog.setAttribute('aria-labelledby', 'export-title')
  dialog.innerHTML =
    '<div class="export-top"><div><div class="eyebrow">TAKE IT ANYWHERE</div><h2 id="export-title">Export your creation</h2><p>Real code. Reusable effects. Your next project.</p></div><button id="export-close" aria-label="Close export panel">×</button></div><div class="export-layout"><aside class="export-options"><button data-format="react" class="active"><b>⚛ React component</b><small>A complete, reusable component</small></button><button data-format="framer"><b>▰ Framer component</b><small>Paste into a Code file, no setup</small></button><button data-format="js"><b>〈/〉 Three.js module</b><small>Mount, trigger, pause and dispose</small></button><button data-format="html"><b>↗ Interactive HTML</b><small>Standalone browser scene</small></button><button data-format="json"><b>◇ Project file</b><small>Save and reopen in Form Studio</small></button><div class="export-divider">OTHER FORMATS</div><button id="export-glb"><b>◈ 3D model · GLB</b><small>Base mesh + material, no simulation</small></button><button id="export-png"><b>▧ Transparent PNG</b><small>Current frame at viewport resolution</small></button><button id="export-video"><b>▷ Record 6-second clip</b><small>Rendered video, no interactivity</small></button></aside><section class="export-preview"><div class="export-guide" id="export-guide"></div><label id="export-url-label" for="export-media-url">Hosted media URL (optional)<input id="export-media-url" type="url" placeholder="https://your-site.com/image.jpg"><small>Leave empty to embed the file. Hosted media must allow cross-origin loading.</small></label><div class="export-code-head"><span id="export-filename">FormEffect.jsx</span><span id="export-bytes"></span></div><textarea id="export-code" readonly spellcheck="false" aria-label="Export code"></textarea><div class="export-actions"><button id="export-copy" class="button">Copy code</button><button id="export-download" class="primary-button">↓ Download file</button></div></section></div><div id="export-feedback" role="status"></div>'
  document.body.append(dialog)
  const $ = (id) => document.getElementById(id)
  let currentProject,
    artifacts,
    format = 'react',
    recording = false
  const filename = {
    react: 'FormEffect.jsx',
    framer: 'FormEffect-Framer.tsx',
    js: 'form-effect.js',
    html: 'form-effect.html',
    json: 'form-studio-project.json',
  }
  const guide = {
    react:
      'Install three@0.149.0 and import FormEffect in your React app. The component creates and cleans up its canvas. Set its width and height with the style prop.',
    framer:
      'Create a Framer Code Component, replace its starter code with this entire file and save. Drag FormEffect onto the canvas. Select it, choose Image or Video in the right sidebar, and upload your file there. Media is not embedded in the code; no hosted URL is needed.',
    js: 'Install three@0.149.0. Import mountEffect, then await mountEffect(container). The controller exposes trigger(), reassemble(), pause() and dispose().',
    html: 'Upload this file to a static host or open it in a browser. Media is embedded. Internet is needed for Three.js. The effect stays interactive.',
    json: 'An editable Form Studio project, including this scene’s settings and media. Reopen it with Open project. Shape projects also contain your JavaScript.',
  }
  function feedback(message, error = false) {
    $('export-feedback').textContent = message
    $('export-feedback').classList.toggle('error', error)
  }
  function text() {
    return artifacts?.[format] || ''
  }
  function render() {
    for (const b of dialog.querySelectorAll('[data-format]')) {
      b.classList.toggle('active', b.dataset.format === format)
      b.setAttribute('aria-pressed', b.dataset.format === format)
    }
    $('export-guide').textContent = guide[format]
    $('export-url-label').hidden = currentProject?.kind !== 'media' || !['js', 'react'].includes(format)
    $('export-filename').textContent = filename[format]
    const code = text()
    $('export-code').value =
      code.length > 160000
        ? code.slice(0, 160000) + '\n\n/* Preview shortened. Copy and download include the complete file. */'
        : code
    $('export-bytes').textContent = (new Blob([code]).size / 1024).toFixed(1) + ' KB'
    $('export-copy').textContent = format === 'json' ? 'Copy JSON' : 'Copy code'
    const oversized = format === 'framer' && new Blob([code]).size >= 1048576
    $('export-copy').disabled = $('export-download').disabled = !code || oversized
    if (oversized)
      feedback(
        'Too large for Framer (1 MB maximum). Reduce the custom shape code before exporting again. Media uploads are handled separately inside Framer.',
        true
      )
    else
      feedback(
        'Ready to export. Framer includes upload controls. Media URL changes apply to React and Three.js; HTML and project files keep embedded media.'
      )
  }
  function regenerate() {
    if (!currentProject) return
    const url = $('export-media-url').value.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      $('export-copy').disabled = $('export-download').disabled = true
      feedback('Use an http or https URL for hosted media.', true)
      return
    }
    const embedded = generateExports(currentProject)
    artifacts = url
      ? { ...generateExports({ ...currentProject, media: url }), html: embedded.html, json: embedded.json }
      : embedded
    render()
  }
  async function open() {
    if (recording) return
    dialog.showModal()
    feedback('Preparing your scene…')
    $('export-code').value = ''
    $('export-copy').disabled = $('export-download').disabled = true
    try {
      currentProject = { format: 'form-studio', version: 2, ...(await getProvider().project()) }
      $('export-media-url').value = ''
      regenerate()
    } catch (e) {
      feedback(e.message, true)
    }
  }
  $('export-close').onclick = () => dialog.close()
  for (const button of dialog.querySelectorAll('[data-format]'))
    button.onclick = () => {
      format = button.dataset.format
      render()
    }
  $('export-media-url').oninput = regenerate
  $('export-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text())
      feedback('Copied ' + filename[format] + ' to your clipboard.')
    } catch {
      $('export-code').value = text()
      $('export-code').focus()
      $('export-code').select()
      feedback('Code selected. Press Ctrl+C / Cmd+C to copy.')
    }
  }
  $('export-download').onclick = () => {
    downloadFile(
      text(),
      filename[format],
      format === 'html' ? 'text/html' : format === 'json' ? 'application/json' : 'text/javascript'
    )
    feedback('Downloaded ' + filename[format] + '.')
  }
  $('export-glb').onclick = async () => {
    let root
    try {
      feedback('Preparing the static base mesh…')
      root = await getProvider().mesh()
      const result = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true })
      downloadFile(result, 'form-studio-base.glb', 'model/gltf-binary')
      feedback(
        'GLB downloaded. This is the base geometry and material; particles and shader animation are not included.'
      )
    } catch (e) {
      feedback('Model export failed: ' + e.message, true)
    } finally {
      if (root) {
        const textures = new Set()
        root.traverse((n) => {
          n.geometry?.dispose()
          if (n.material) {
            for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
              if (m.map) textures.add(m.map)
              m.dispose()
            }
          }
        })
        textures.forEach((t) => t.dispose())
      }
    }
  }
  $('export-png').onclick = () => {
    try {
      renderer.render(scene, camera)
      renderer.domElement.toBlob((blob) => {
        if (blob) {
          downloadFile(blob, 'form-studio-frame.png')
          feedback('Saved the current frame with a transparent background.')
        } else feedback('Could not capture this frame.', true)
      }, 'image/png')
    } catch (e) {
      feedback(e.message, true)
    }
  }
  $('export-video').onclick = async () => {
    if (recording) return
    if (!window.MediaRecorder || !renderer.domElement.captureStream) {
      feedback('Video recording is unavailable in this browser. Use HTML export instead.', true)
      return
    }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((type) =>
      MediaRecorder.isTypeSupported(type)
    )
    if (!mime) {
      feedback('This browser does not support a recording format.', true)
      return
    }
    recording = true
    const previous = scene.background
    scene.background = new THREE.Color(getProvider().background || '#181c25')
    const stream = renderer.domElement.captureStream(30),
      chunks = []
    let recorder, timer, countdown, badge
    const restore = () => {
      badge?.remove()
      clearTimeout(timer)
      clearInterval(countdown)
      stream.getTracks().forEach((t) => t.stop())
      scene.background = previous
      recording = false
      $('export-video').disabled = false
    }
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 })
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data)
      }
      recorder.onstop = () => {
        restore()
        if (chunks.length) {
          downloadFile(
            new Blob(chunks, { type: mime }),
            mime.includes('mp4') ? 'form-studio-clip.mp4' : 'form-studio-clip.webm'
          )
          feedback('Clip downloaded. Recording contains the rendered scene, without audio or editor panels.')
        } else feedback('The browser did not produce a recording.', true)
        if (!dialog.open) dialog.showModal()
      }
      recorder.onerror = () => {
        restore()
        feedback('Recording failed. Try HTML export.', true)
        if (!dialog.open) dialog.showModal()
      }
      $('export-video').disabled = true
      dialog.close()
      badge = document.createElement('div')
      badge.className = 'recording-badge'
      badge.textContent = '● Recording · 6s'
      document.body.append(badge)
      let seconds = 6
      countdown = setInterval(() => {
        seconds--
        badge.textContent = '● Recording · ' + seconds + 's'
      }, 1000)
      recorder.addEventListener('stop', () => badge.remove(), { once: true })
      recorder.start()
      timer = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 6000)
    } catch (e) {
      restore()
      feedback(e.message, true)
    }
  }
  const importButton = document.createElement('button')
  importButton.id = 'open-project'
  importButton.className = 'button'
  importButton.textContent = '◇ Open project'
  const file = document.createElement('input')
  file.type = 'file'
  file.accept = '.json,application/json'
  file.hidden = true
  file.id = 'project-file'
  document.querySelector('header').insertBefore(importButton, $('export'))
  document.body.append(file)
  importButton.onclick = () => file.click()
  file.onchange = async () => {
    const selected = file.files[0]
    if (!selected) return
    try {
      if (selected.size > 160 * 1048576) throw new Error('Project file is too large.')
      const data = JSON.parse(await selected.text(), (key, value) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Unsupported project property.')
        if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Project contains an invalid number.')
        return value
      })
      if (
        data.format !== 'form-studio' ||
        data.version !== 2 ||
        !['media', 'shape'].includes(data.kind) ||
        !data.settings
      )
        throw new Error('Choose a Form Studio v2 project file.')
      await importProject(data)
    } catch (e) {
      alert('Could not open project: ' + e.message)
    } finally {
      file.value = ''
    }
  }
  // Capture the export control before legacy per-workspace download handlers.
  $('export').addEventListener(
    'click',
    (event) => {
      event.stopImmediatePropagation()
      open()
    },
    true
  )
  $('export').textContent = '↗ Export / code'
  return { open }
}
