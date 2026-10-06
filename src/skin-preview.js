import * as THREE from 'three'
import { createCow } from './cow-model.js'
import { applyCowSkin } from './cow-skins.js'
import { getSkin } from './skins.js'

export function createSkinPreview(onEquip) {
  const panel = document.querySelector('#skin-panel')
  const canvas = document.querySelector('#skin-preview')
  const title = document.querySelector('#skin-preview-name')
  const note = document.querySelector('#skin-preview-note')
  const equip = document.querySelector('#skin-preview-equip')
  const turn = document.querySelector('#skin-turn')
  let renderer, scene, camera, cow, state, previewId = null, unavailable = false
  function render() {
    if (!renderer || !panel.open || document.hidden) return
    const width = canvas.clientWidth, height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height; camera.updateProjectionMatrix()
    cow.rotation.y = Number(turn.value) * Math.PI / 180
    renderer.render(scene, camera)
  }
  function initialize() {
    if (renderer || unavailable) return
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
      scene = new THREE.Scene(); scene.background = new THREE.Color('#eaf2dd')
      camera = new THREE.PerspectiveCamera(36, 1, .1, 30)
      camera.position.set(0, 1.7, 4.5); camera.lookAt(0, .95, 0)
      scene.add(new THREE.HemisphereLight('#fff8ea', '#87a66f', 2.5))
      const light = new THREE.DirectionalLight('#fff7de', 2.5)
      light.position.set(-3, 5, 4); light.castShadow = true
      light.shadow.mapSize.set(512, 512); light.shadow.camera.left = -2; light.shadow.camera.right = 2
      light.shadow.camera.top = 3; light.shadow.camera.bottom = -2
      scene.add(light)
      cow = createCow(); scene.add(cow)
      const floor = new THREE.Mesh(new THREE.CircleGeometry(1.65, 48), new THREE.MeshStandardMaterial({ color: '#cbdba4', roughness: 1 }))
      floor.rotation.x = -Math.PI / 2; floor.position.y = .005; floor.receiveShadow = true
      scene.add(floor)
      new ResizeObserver(render).observe(canvas)
      turn.addEventListener('input', render)
      document.addEventListener('visibilitychange', render)
    } catch {
      unavailable = true; canvas.hidden = true; turn.disabled = true
    }
  }
  function updateLabels() {
    if (!state || !previewId) return
    const skin = getSkin(previewId), owned = state.ownedSkins.includes(skin.id)
    title.textContent = skin.name
    note.textContent = `${unavailable ? 'Không mở được xem trước 3D. ' : ''}${owned ? 'Đã mở · Chỉ đổi ngoại hình' : `Mở ở cấp sưu tầm ${skin.level} · XP giữ qua các vòng`}`
    equip.disabled = !owned || state.selectedSkin === skin.id
    equip.textContent = state.selectedSkin === skin.id ? 'Đang mặc' : owned ? 'Mặc skin này' : 'Chưa mở'
  }
  function show(id, reveal = true) {
    previewId = getSkin(id).id
    initialize()
    if (cow) applyCowSkin(cow, previewId)
    updateLabels(); render()
    if (reveal) document.querySelector('.skin-preview-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  panel.addEventListener('toggle', () => { if (panel.open) show(previewId || state?.selectedSkin || 'classic', false) })
  equip.addEventListener('click', () => { if (state?.ownedSkins.includes(previewId)) onEquip(previewId) })
  return {
    show,
    update(nextState) {
      state = nextState
      updateLabels()
      if (panel.open && !previewId) show(state.selectedSkin, false)
    },
  }
}
