import * as THREE from 'three'
import { createCow } from './cow-model.js'
import { createProgression, MAX_LEVEL, SKILLS } from './progression.js'
import { createGrassData, PLANET_RADIUS, GRASS_COUNT } from './world-data.js'
import { connectRoom } from './room-client.js'
import { createWorldVisuals } from './world-visuals.js'
import { SKINS } from './skins.js'
import { applyCowSkin } from './cow-skins.js'
import { createRoundUI } from './round-ui.js'
import { createSkinPreview } from './skin-preview.js'
import { createGameAudio } from './game-audio.js'
import { updateCowEmote } from './cow-emotes.js'
import { EMOTES, getTeam } from './social-data.js'
import { createGameMenu } from './game-menu.js'
import { createAccount } from './account.js'
import { GRAZING_SECONDS, COMBAT_SECONDS, LOW_HEALTH_RATIO, jumpHeightAt } from './game-rules.js'
import './style.css'

const canvas = document.querySelector('#world')
const statusLabel = document.querySelector('#cow-state')
const mealLabel = document.querySelector('#meal-count')
const keys = new Set()
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'])
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const nameInput = document.querySelector('#player-name')
const roomStatus = document.querySelector('#room-status')
const teamCount = document.querySelector('#team-count')
const teamList = document.querySelector('#team-list')
const healthText = document.querySelector('#health-text')
const healthBar = document.querySelector('#health-bar')
const healthFill = document.querySelector('#health-fill')
const lowHealthVignette = document.querySelector('#low-health-vignette')
const staminaText = document.querySelector('#stamina-text')
const staminaBar = document.querySelector('#stamina-bar')
const staminaFill = document.querySelector('#stamina-fill')
const roundName = document.querySelector('#round-name')
const phaseClock = document.querySelector('#phase-clock')
const phaseHint = document.querySelector('#phase-hint')
const knockoutNotice = document.querySelector('#knockout-notice')
const returnSeconds = document.querySelector('#return-seconds')
const waitMessage = document.querySelector('#wait-message')
const watchSelect = document.querySelector('#watch-player')
const watchStepButtons = [...document.querySelectorAll('[data-watch-step]')]
const combatNotice = document.querySelector('#combat-notice')
let combatNoticeTimer
new MutationObserver(() => {
  combatNotice.hidden = false
  clearTimeout(combatNoticeTimer)
  combatNoticeTimer = setTimeout(() => { combatNotice.hidden = true }, 3000)
}).observe(combatNotice, { childList: true })
const roundUI = createRoundUI()
async function refreshAccountTop() {
  if (!account.configured) return
  try { roundUI.updateAccountTop(await account.getTop(), account.userId) }
  catch { document.querySelector('#account-top-empty').textContent = 'Chưa tải được Top tài khoản. Thử lại sau.' }
}
document.querySelector('#account-top-panel').addEventListener('toggle', event => { if (event.target.open) void refreshAccountTop() })
const audio = createGameAudio()
const gameMenu = createGameMenu()
const account = createAccount()
try { await account.ready } catch (error) {
  const failure = document.querySelector('#webgl-error')
  failure.textContent = error.message
  failure.hidden = false
  throw error
}
document.addEventListener('play-guest', () => gameMenu.close())
if (import.meta.env.PROD && !account.configured && import.meta.env.VITE_ROOM_TRANSPORT !== 'lan') {
  document.querySelector('.room-link-panel').hidden = true
  document.querySelector('#copy-room').hidden = true
  document.querySelector('#account-top-panel').hidden = true
  document.querySelector('#room-online-note').textContent = 'Chơi một mình. Phòng online sẽ mở khi nối Supabase.'
} else if (import.meta.env.PROD && import.meta.env.VITE_ROOM_TRANSPORT === 'lan') {
  document.querySelector('.room-link-panel').hidden = true
  document.querySelector('#account-top-panel').hidden = true
  document.querySelector('#room-online-note').textContent = 'Phòng chung Internet · bấm Mời team để gửi link cùng trận.'
}
const modeSelect = document.querySelector('#game-mode')
const teamButtons = [...document.querySelectorAll('[data-team]')]
const emoteHint = document.querySelector('#emote-hint')
document.querySelector('#emote-buttons').innerHTML = EMOTES.map(emote => `<button type="button" data-emote="${emote.id}" title="${emote.label} · Phím ${emote.number}" aria-label="${emote.label}, phím ${emote.number}" disabled><span>${emote.glyph}</span><small>${emote.number}</small></button>`).join('')
const emoteButtons = [...document.querySelectorAll('[data-emote]')]
let playerName = `Bò ${Math.floor(Math.random() * 900 + 100)}`
try { playerName = localStorage.getItem('hanh-tinh-co:name') || playerName } catch {}
if (account.playerName) playerName = account.playerName
nameInput.value = playerName
document.querySelector('#copy-room').addEventListener('click', async () => {
  if (!account.configured && import.meta.env.PROD && import.meta.env.VITE_ROOM_TRANSPORT !== 'lan') { showToast('Trang này đang chơi một mình. Cần nối Supabase để mời team.'); return }
  let link = account.configured && import.meta.env.VITE_ROOM_TRANSPORT !== 'lan' ? new URL(location.href).href.split('#')[0] : new URL(import.meta.env.BASE_URL, location.origin).href
  if ((!account.configured || import.meta.env.VITE_ROOM_TRANSPORT === 'lan') && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    try { link = (await (await fetch('/room-info')).json()).lanUrl || link } catch {}
  }
  try {
    await navigator.clipboard.writeText(link)
    showToast(account.configured ? 'Đã sao chép link phòng online. Gửi cho team nhé!' : 'Đã sao chép link. Gửi cho team nhé!')
  } catch {
    const field = document.querySelector('#room-link')
    field.value = link
    field.hidden = false
    field.focus()
    field.select()
    showToast('Link đã hiện trong mục Phòng chơi. Nhấn Ctrl+C để sao chép.')
  }
})
async function openRoom(code) {
  if (account.authenticated) {
    await account.flush()
    if (!account.canLeave) { showToast('Dữ liệu tài khoản chưa lưu xong. Thử lại nhé.'); return }
  }
  const next = new URL(location.href)
  next.searchParams.set('room', code)
  location.assign(next.href)
}
document.querySelector('#create-room').addEventListener('click', () => openRoom(Math.random().toString(36).slice(2, 8).toUpperCase()))
document.querySelector('#join-room').addEventListener('click', () => {
  const field = document.querySelector('#join-room-code')
  const code = field.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
  if (code.length < 4) { showToast('Mã phòng cần ít nhất 4 ký tự.'); return }
  openRoom(code)
})
document.querySelector('#join-room-code').addEventListener('keydown', event => {
  if (event.key === 'Enter') document.querySelector('#join-room').click()
})
const progression = createProgression({
  initialData: account.initialData,
  saveKey: account.userId ? `hanh-tinh-co:account:${account.userId}` : undefined,
  onSave: data => account.saveProgress(data),
})
const skinPreview = createSkinPreview(id => {
  if (progression.selectSkin(id)) { updateProgressUI(); showToast('Đã mặc skin mới!') }
})
let localCow = null
let skinUIKey = ''
let rewardSkinId = null
const skinList = document.querySelector('#skin-list')
const rewardSkin = document.querySelector('#reward-skin')
const rewardEquip = document.querySelector('#reward-equip')
const levelNumber = document.querySelector('#level-number')
const xpText = document.querySelector('#xp-text')
const xpBar = document.querySelector('#xp-bar')
const xpFill = document.querySelector('#xp-fill')
const pointsLabel = document.querySelector('#skill-points')
const saveStatus = document.querySelector('#save-status')
const levelToast = document.querySelector('#level-toast')
const biteReward = document.querySelector('#bite-reward')
const regrowthTime = document.querySelector('#regrowth-time')
const rewardNotice = document.querySelector('#level-reward')
const rewardTitle = document.querySelector('#reward-title')
const rewardWish = document.querySelector('#reward-wish')
const rewardBonus = document.querySelector('#reward-bonus')
let rewardTimeout
function hideReward() { rewardNotice.hidden = true; clearTimeout(rewardTimeout) }
function showRewards(rewards, skinRewards = []) {
  if (!rewards.length && !skinRewards.length) return
  const reward = rewards.at(-1)
  const skinReward = skinRewards.at(-1)
  rewardTitle.textContent = reward ? `Lên cấp ${reward.level}! +${rewards.length} điểm kỹ năng` : `Mở skin ${skinReward.name}!`
  rewardWish.textContent = reward?.wish || 'Bé bò chăm chỉ quá! Chúc bạn sưu tầm được thật nhiều skin!'
  rewardBonus.textContent = rewards.length ? rewards.map(item => item.bonus.text).join(' · ') : 'Quà cấp sưu tầm. Không tăng sức mạnh chiến đấu.'
  rewardSkinId = skinReward?.id || null
  rewardSkin.hidden = !skinReward
  rewardEquip.hidden = !skinReward
  rewardSkin.textContent = skinReward ? `Đã mở: ${skinRewards.map(skin => `${skin.icon} ${skin.name}`).join(', ')}. Quà được giữ trong tủ skin.` : ''
  rewardNotice.hidden = false
  audio.play('level')
  clearTimeout(rewardTimeout)
  rewardTimeout = setTimeout(hideReward, skinReward ? 10000 : 6000)
}
document.querySelector('#reward-continue').addEventListener('click', hideReward)
rewardEquip.addEventListener('click', () => {
  if (rewardSkinId && progression.selectSkin(rewardSkinId)) updateProgressUI()
  hideReward()
})
skinList.addEventListener('click', event => {
  const preview = event.target.closest('[data-preview-skin]')
  if (preview) { skinPreview.show(preview.dataset.previewSkin); return }
  const button = event.target.closest('[data-skin]')
  if (!button || !progression.selectSkin(button.dataset.skin)) return
  updateProgressUI()
  showToast('Đã mặc skin mới! Team cũng sẽ thấy nhé.')
})
document.querySelector('#level-cap').textContent = ` / ${MAX_LEVEL}`
document.querySelector('#skill-list').innerHTML = Object.entries(SKILLS).map(([key, definition]) => `
  <div class="skill-row">
    <div><strong>${definition.name} <small id="${key}-rank">0/5</small></strong><span id="${key}-effect"></span></div>
    <button type="button" data-skill="${key}" aria-label="Nâng ${definition.name}, dùng 1 điểm" disabled>+</button>
  </div>
`).join('')
document.querySelector('#quick-skill-list').innerHTML = Object.entries(SKILLS).map(([key, definition]) => `
  <button type="button" class="quick-skill" data-skill="${key}" aria-label="Nâng ${definition.name}, dùng 1 điểm" disabled>
    <span><strong>${definition.name}</strong><small data-quick-rank>0/${definition.maxRank}</small></span><b data-quick-plus aria-hidden="true">+</b>
  </button>
`).join('')
const quickUpgrades = document.querySelector('#quick-upgrades')
const quickUpgradeBody = document.querySelector('#quick-upgrade-body')
const quickUpgradeHint = document.querySelector('#quick-upgrade-hint')
const quickUpgradeToggles = [...document.querySelectorAll('[data-toggle-upgrades]')]
let lastUpgradeStage = '', lastUpgradePoints = 0, upgradesAvailable = false
function setQuickUpgradesOpen(open) {
  quickUpgradeBody.hidden = !open
  quickUpgrades.classList.toggle('collapsed', !open)
  quickUpgradeToggles.forEach(button => button.setAttribute('aria-expanded', String(open)))
}
quickUpgradeToggles.forEach(button => button.addEventListener('click', () => setQuickUpgradesOpen(quickUpgradeBody.hidden)))
const skillButtons = [...document.querySelectorAll('[data-skill]')]
const skillPanel = document.querySelector('#skill-panel')
skillPanel.open = false
let toastTimeout

function updateProgressUI() {
  const state = progression.snapshot()
  const isMaxLevel = state.level === MAX_LEVEL
  mealLabel.textContent = String(state.meals)
  levelNumber.textContent = String(state.level)
  xpText.textContent = isMaxLevel ? 'CẤP TỐI ĐA' : `${state.xp} / ${state.target} XP`
  xpFill.style.width = `${isMaxLevel ? 100 : state.xp / state.target * 100}%`
  xpBar.setAttribute('aria-valuemax', String(state.target))
  xpBar.setAttribute('aria-valuenow', String(isMaxLevel ? state.target : state.xp))
  xpBar.setAttribute('aria-valuetext', isMaxLevel ? 'Đã đạt cấp tối đa' : `${state.xp} trên ${state.target} XP`)
  pointsLabel.textContent = String(state.points)
  document.querySelector('#hud-skill-points').textContent = String(state.points)
  document.querySelector('#quick-skill-points').textContent = String(state.points)
  const canUpgrade = state.stage === 'grazing' && upgradesAvailable
  quickUpgrades.classList.toggle('has-points', canUpgrade && state.points > 0)
  quickUpgradeHint.textContent = !upgradesAvailable ? 'Chờ vào vòng để nâng kỹ năng.' : state.stage === 'combat' ? 'Combat: kỹ năng đang khóa.' : state.points > 0 ? 'Bấm + để dùng 1 điểm kỹ năng.' : 'Ăn cỏ lên cấp để nhận điểm.'
  if (lastUpgradeStage !== state.stage) setQuickUpgradesOpen(state.stage === 'grazing')
  else if (canUpgrade && state.points > lastUpgradePoints) setQuickUpgradesOpen(true)
  lastUpgradeStage = state.stage
  lastUpgradePoints = state.points
  document.querySelector('.upgrade-shortcut').classList.toggle('has-points', state.points > 0 && state.stage === 'grazing')
  for (const button of skillButtons) {
    const key = button.dataset.skill
    const definition = SKILLS[key]
    const rank = state.skills[key]
    const maxRank = rank === definition.maxRank
    button.disabled = !canUpgrade || state.points === 0 || maxRank
    if (button.classList.contains('quick-skill')) {
      button.querySelector('[data-quick-rank]').textContent = `${rank}/${definition.maxRank}`
      button.querySelector('[data-quick-plus]').textContent = maxRank ? '✓' : '+'
      button.setAttribute('aria-label', `${definition.name}, bậc ${rank}/${definition.maxRank}. Nâng dùng 1 điểm`)
    } else button.textContent = maxRank ? '✓' : '+'
    const actionHint = !upgradesAvailable ? 'Chờ vào vòng để nâng kỹ năng' : state.stage !== 'grazing' ? 'Chỉ nâng kỹ năng trong 30 giây ăn cỏ' : maxRank ? 'Đã nâng tối đa' : state.points === 0 ? 'Ăn cỏ để lên cấp và nhận điểm' : 'Dùng 1 điểm kỹ năng'
    button.title = `${definition.effect} ${definition.decreasing ? '−' : '+'}${Math.round(definition.bonus * 100)}% mỗi bậc · ${actionHint}`
    document.querySelector(`#${key}-rank`).textContent = `${rank}/${definition.maxRank}`
    document.querySelector(`#${key}-effect`).textContent = `${definition.effect} ${definition.decreasing ? '−' : '+'}${Math.round(rank * definition.bonus * 100)}% · mỗi bậc ${definition.decreasing ? '−' : '+'}${Math.round(definition.bonus * 100)}%`
  }
  regrowthTime.textContent = `${Number((20 * progression.multiplier('regrowth')).toFixed(1))} GIÂY`
  const bonuses = state.bonuses
  document.querySelector('#level-bonuses').textContent = `Thưởng theo cấp: tốc độ +${Math.round(bonuses.speed * 100)}%, XP +${Math.round(bonuses.learning * 100)}%, thời gian mọc −${Math.round(bonuses.regrowth * 100)}%.`
  saveStatus.textContent = account.authenticated ? `Chỉ mất cấp khi bị húc chết · Kỷ lục cấp ${state.bestLevel} · Lưu vào tài khoản.` : state.storageAvailable ? `Chỉ mất cấp khi bị húc chết · Kỷ lục cấp ${state.bestLevel} · Skin tự lưu trên máy này.` : 'Không lưu được skin. Quà chỉ giữ trong lần chơi này.'
  document.querySelector('#collection-level').textContent = String(state.collection.level)
  document.querySelector('#collection-xp').textContent = state.collection.level === MAX_LEVEL ? 'Cấp sưu tầm tối đa' : `${state.collection.xp} / ${state.collection.target} XP`
  document.querySelector('#collection-fill').style.width = `${state.collection.level === MAX_LEVEL ? 100 : state.collection.xp / state.collection.target * 100}%`
  const nextSkinKey = `${state.selectedSkin}:${state.ownedSkins.join(',')}`
  if (nextSkinKey !== skinUIKey) {
    skinUIKey = nextSkinKey
    document.querySelector('#skin-count').textContent = `${state.ownedSkins.length}/${SKINS.length}`
    skinList.innerHTML = SKINS.map(skin => {
      const owned = state.ownedSkins.includes(skin.id), selected = state.selectedSkin === skin.id
      return `<div class="skin-entry"><button type="button" class="skin-option" data-skin="${skin.id}" aria-pressed="${selected}" ${owned ? '' : 'disabled'} style="--fur:${skin.colors.fur};--patch:${skin.colors.patch};--nose:${skin.colors.muzzle}"><span class="skin-swatch" aria-hidden="true"><i>${skin.icon}</i></span><span>${skin.name}<small>${selected ? 'Đang mặc' : owned ? 'Đã mở' : `Cấp sưu tầm ${skin.level}`}</small></span></button><button type="button" class="preview-skin" data-preview-skin="${skin.id}" aria-label="Xem trước ${skin.name}">Xem</button></div>`
    }).join('')
  }
  if (localCow) applyCowSkin(localCow, state.selectedSkin)
  skinPreview.update(state)
}

function showToast(message) {
  clearTimeout(toastTimeout)
  levelToast.textContent = message
  levelToast.hidden = gameMenu.isOpen
  const feedback = document.querySelector('#menu-feedback')
  feedback.textContent = message
  feedback.hidden = !gameMenu.isOpen
  toastTimeout = setTimeout(() => { levelToast.hidden = true; feedback.hidden = true }, 4500)
}

skillButtons.forEach((button) => button.addEventListener('click', () => {
  if (!upgradesAvailable || !progression.upgrade(button.dataset.skill)) return
  updateProgressUI()
  showToast(`Đã nâng ${SKILLS[button.dataset.skill].name}!`)
}))
updateProgressUI()

function surfaceQuaternion(normal, forwardHint = new THREE.Vector3(0, 0, 1)) {
  const forward = forwardHint.clone().projectOnPlane(normal)
  if (forward.lengthSq() < .0001) forward.set(1, 0, 0).projectOnPlane(normal)
  forward.normalize()
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, forward))
}

function updatePlayerTag(cow, player, mode = 'free') {
  if (!cow.userData.tag) {
    const tagCanvas = document.createElement('canvas')
    tagCanvas.width = 512
    tagCanvas.height = 128
    const texture = new THREE.CanvasTexture(tagCanvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
    tag.position.set(0, 1.96, 0)
    tag.scale.set(1.75, .44, 1)
    cow.add(tag)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.28, .045, 8, 24), new THREE.MeshStandardMaterial({ color: player.color, roughness: .8 }))
    collar.position.set(0, 1.04, .61)
    cow.add(collar)
    Object.assign(cow.userData, { tag, tagCanvas, collar })
  }
  const team = mode === 'teams' ? getTeam(player.team) : null
  const caption = `${player.name} · Lv.${player.level} · ${player.health} · ${team?.id || ''} · ${player.color}`
  if (cow.userData.tagCaption === caption) return
  cow.userData.tagCaption = caption
  const context = cow.userData.tagCanvas.getContext('2d')
  context.clearRect(0, 0, 512, 128)
  context.fillStyle = '#f7f9ecef'
  context.beginPath()
  context.roundRect(4, 4, 504, 120, 30)
  context.fill()
  context.strokeStyle = team?.color || '#cad9b4'
  context.lineWidth = 3
  context.stroke()
  context.font = '800 29px Nunito, Segoe UI, sans-serif'
  context.textAlign = 'center'
  context.fillStyle = '#2b4d39'
  context.fillText(`${player.name}${team ? ` · ${team.name}` : ''} · Lv.${player.level}`, 256, 48, 490)
  context.fillStyle = '#d6e2cc'
  context.fillRect(48, 77, 416, 13)
  context.fillStyle = player.health > 30 ? '#73aa4e' : '#dd756a'
  context.fillRect(48, 77, 416 * player.health / player.maxHealth, 13)
  cow.userData.tag.material.map.needsUpdate = true
}

function disposeAvatar(cow) {
  const geometries = new Set()
  const materials = new Set()
  cow.traverse(object => {
    if (object.geometry) geometries.add(object.geometry)
    if (object.material) materials.add(object.material)
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => { material.map?.dispose(); material.dispose() })
}

function createGroundTexture() {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 256
  const context = textureCanvas.getContext('2d')
  let seed = 5173
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  context.fillStyle = '#edf8db'
  context.fillRect(0, 0, 512, 256)
  for (let i = 0; i < 48; i++) {
    const x = random() * 512, y = random() * 256, size = 9 + random() * 27
    const patch = context.createRadialGradient(x, y, 0, x, y, size)
    patch.addColorStop(0, i % 3 ? '#689b4b22' : '#ffffff65')
    patch.addColorStop(1, '#ffffff00')
    context.fillStyle = patch
    context.fillRect(x - size, y - size, size * 2, size * 2)
  }
  for (let i = 0; i < 9000; i++) {
    context.fillStyle = i % 2 ? '#ffffff18' : '#4a782a12'
    context.fillRect(random() * 512, random() * 256, 2, 2)
  }
  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createPlanet(radius) {
  const geometry = new THREE.SphereGeometry(radius, 96, 64)
  const positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const light = new THREE.Color('#9bc975')
  const dark = new THREE.Color('#618f4b')
  const color = new THREE.Color()
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index) / radius, y = positions.getY(index) / radius, z = positions.getZ(index) / radius
    const variation = .5 + .24 * Math.sin(x * 7 + z * 3) + .18 * Math.sin(y * 8 - z * 5)
    color.copy(dark).lerp(light, variation)
    color.toArray(colors, index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const planet = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: createGroundTexture(), vertexColors: true, roughness: 1 }))
  planet.receiveShadow = true
  return planet
}

function createContactShadow(scene) {
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 64
  const context = shadowCanvas.getContext('2d')
  const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 31)
  gradient.addColorStop(0, '#24451dc9')
  gradient.addColorStop(.5, '#24451d66')
  gradient.addColorStop(1, '#24451d00')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, opacity: .42, depthWrite: false })
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 2.2).rotateX(-Math.PI / 2), material)
  shadow.renderOrder = 1
  scene.add(shadow)
  return shadow
}

function updateContactShadow(shadow, normal, heading, radius, height) {
  shadow.position.copy(normal).multiplyScalar(radius + .014)
  shadow.quaternion.copy(surfaceQuaternion(normal, heading))
  shadow.scale.setScalar(.75 + height * .12)
  shadow.material.opacity = .42 / (1 + height * 1.8)
}

function updateHitGlow(cow, now) {
  const strength = Math.max(0, (cow.userData.hitUntil - now) / 280)
  cow.userData.materials.forEach(material => {
    material.emissive.set('#d56548')
    material.emissiveIntensity = strength * .55
  })
}

function animateCowFace(cow, elapsed, eating, alive) {
  const expression = cow.userData.activeEmote
  const phase = (elapsed + cow.id * .37) % 4.7
  const blink = !reduceMotion && phase > 4.48 ? Math.max(.08, Math.abs((phase - 4.59) / .11)) : 1
  cow.userData.eyes.forEach(eye => { eye.scale.y = alive ? expression === 'happy' ? .6 : blink : .15 })
  cow.userData.ears.forEach((ear, index) => {
    const side = index === 0 ? -1 : 1
    ear.rotation.z = side * -.22 + (reduceMotion || !alive ? 0 : Math.sin(elapsed * (expression ? 5 : 2.2) + index) * (expression ? .13 : .055))
  })
  cow.userData.head.rotation.z = reduceMotion || eating || !alive ? 0 : expression === 'heart' ? .12 : Math.sin(elapsed * (expression ? 4 : 1.4)) * (expression ? .08 : .025)
}

function createGrass(scene, radius) {
  // Một cụm có ba lá. InstancedMesh vẽ cả đồng cỏ bằng một lượt.
  const positions = []
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI / 3
    const x = Math.cos(angle) * .5
    const z = Math.sin(angle) * .5
    positions.push(-x, 0, -z, x, 0, z, .16, 1, .12)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  const data = createGrassData()
  const count = GRASS_COUNT
  const windTime = { value: 0 }
  let windStartedAt = null
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 1, side: THREE.DoubleSide,
  })
  // Gió chỉ làm cong lá trên GPU; vị trí cỏ dùng để chơi vẫn giữ nguyên.
  grassMaterial.onBeforeCompile = shader => {
    shader.uniforms.grassTime = windTime
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float grassTime;\nvarying float vGrassHeight;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGrassHeight = position.y;
        float phase = dot(instanceMatrix[3].xyz, vec3(1.7, 2.3, 1.1));
        float bend = position.y * position.y;
        transformed.x += sin(grassTime * 1.6 + phase) * bend * ${reduceMotion ? '0.0' : '0.18'};
        transformed.z += cos(grassTime * 1.1 + phase * .7) * bend * ${reduceMotion ? '0.0' : '0.12'};`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGrassHeight;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(.72, .86, .69), vec3(.97, 1.08, .94), vGrassHeight);')
  }
  const mesh = new THREE.InstancedMesh(geometry, grassMaterial, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.receiveShadow = true
  const dummy = new THREE.Object3D()
  const patches = []
  const color = new THREE.Color()
  const yaw = new THREE.Quaternion()
  const localUp = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    const source = data[i]
    const normal = new THREE.Vector3(...source.normal)
    const rotation = surfaceQuaternion(normal).multiply(yaw.setFromAxisAngle(localUp, source.yaw))
    const meadow = Math.pow(Math.max(0, normal.y), 8)
    const patch = { normal, rotation, width: source.width, height: source.height * (1 - meadow * .42), regrowsAt: null, duration: 20000 }
    patches.push(patch)
    dummy.position.copy(normal).multiplyScalar(radius - .012)
    dummy.quaternion.copy(rotation)
    dummy.scale.set(patch.width, patch.height, patch.width)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.setHSL(source.color[0] + .018, source.color[1] + .04, source.color[2] + .1)
    mesh.setColorAt(i, color)
  }
  mesh.computeBoundingSphere()
  scene.add(mesh)
  const regrowing = new Set()
  const updatePatch = (index, growth) => {
    const patch = patches[index]
    dummy.position.copy(patch.normal).multiplyScalar(radius - .012)
    dummy.quaternion.copy(patch.rotation)
    dummy.scale.set(patch.width, patch.height * growth, patch.width)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  }
  return {
    candidates(mouthNormal, biteRadius) {
      const indices = []
      const reach = Math.cos(biteRadius / radius)
      patches.forEach((patch, index) => {
        if (patch.regrowsAt === null && patch.normal.dot(mouthNormal) > reach) {
          indices.push(index)
        }
      })
      return indices
    },
    applyChanges(changes, reset = false) {
      if (reset) {
        for (const index of regrowing) {
          patches[index].regrowsAt = null
          updatePatch(index, 1)
        }
        regrowing.clear()
      }
      for (const change of changes) {
        const patch = patches[change.index]
        if (!patch) continue
        patch.regrowsAt = change.regrowsAt
        patch.duration = change.duration
        regrowing.add(change.index)
        updatePatch(change.index, .025)
      }
      mesh.instanceMatrix.needsUpdate = true
    },
    update(now) {
      if (windStartedAt === null) windStartedAt = now
      windTime.value = (now - windStartedAt) / 1000
      if (!regrowing.size) return
      for (const index of regrowing) {
        const patch = patches[index]
        const remaining = patch.regrowsAt - now
        const growth = THREE.MathUtils.clamp(1 - remaining / (patch.duration * .3), .025, 1)
        updatePatch(index, growth)
        if (remaining <= 0) {
          patch.regrowsAt = null
          regrowing.delete(index)
        }
      }
      mesh.instanceMatrix.needsUpdate = true
    },
  }
}

function buildWorld() {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  } catch {
    document.querySelector('#webgl-error').hidden = false
    document.querySelector('#eat-button').disabled = true
    document.querySelector('#reset-button').disabled = true
    statusLabel.textContent = 'Chưa mở được thế giới 3D'
    return
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#d4eff0')
  scene.fog = new THREE.FogExp2('#d4eff0', .004)
  const camera = new THREE.PerspectiveCamera(46, 1, .1, 100)
  scene.add(new THREE.HemisphereLight('#e5f6ff', '#5b713c', 1.6))
  const sunlight = new THREE.DirectionalLight('#ffeac5', 2.35)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  Object.assign(sunlight.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .1, far: 40 })
  sunlight.shadow.normalBias = .035
  scene.add(sunlight, sunlight.target)
  const rimLight = new THREE.DirectionalLight('#c8eafa', 1.3)
  scene.add(rimLight, rimLight.target)
  const radius = PLANET_RADIUS
  scene.add(createPlanet(radius))
  const visuals = createWorldVisuals(scene, { radius, reduceMotion })
  const grass = createGrass(scene, radius)
  const cow = createCow()
  localCow = cow
  applyCowSkin(cow, progression.snapshot().selectedSkin)
  cow.scale.setScalar(.75)
  scene.add(cow)
  const cowShadow = createContactShadow(scene)
  updatePlayerTag(cow, { name: playerName, color: '#cfec91', level: progression.snapshot().level, health: 100, maxHealth: 100 })
  const avatars = new Map()

  const normal = new THREE.Vector3(0, 1, 0)
  // Hướng camera được giữ khi bò đổi hướng, tránh xoay màn hình khi đi ngang.
  const cameraForward = new THREE.Vector3(0, 0, 1)
  const heading = new THREE.Vector3(0, 0, -1)
  const right = new THREE.Vector3()
  const direction = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const stepRotation = new THREE.Quaternion()
  const mouthNormal = new THREE.Vector3()
  const mouthLocal = new THREE.Vector3(0, -.18, .64)
  const lookAt = new THREE.Vector3()
  let zoom = .48
  let smoothZoom = .48
  let eatingUntil = 0
  let nextBite = 0
  let headDip = 0
  let elapsed = 0
  let lastFrameTime = null
  let animationFrame
  let walking = false
  let currentStatus = ''
  let health = 100
  let maxHealth = 100
  let stamina = 100
  let spectating = false, watchedId = '', watchKey = '', watchPlayers = []
  const watchNormal = new THREE.Vector3(), watchHeading = new THREE.Vector3()
  const watchRotation = new THREE.Quaternion(), identityRotation = new THREE.Quaternion()
  const observing = () => spectating || health === 0
  watchSelect.addEventListener('change', () => { watchedId = watchSelect.value })
  watchStepButtons.forEach(button => button.addEventListener('click', () => {
    if (!observing() || watchPlayers.length < 2) return
    const current = Math.max(0, watchPlayers.findIndex(player => player.id === watchedId))
    const next = (current + Number(button.dataset.watchStep) + watchPlayers.length) % watchPlayers.length
    watchedId = watchPlayers[next].id
    watchSelect.value = watchedId
  }))
  let phase = { stage: 'grazing', round: 1, endsAt: 0 }
  let knockedUntil = 0
  const knockTarget = new THREE.Vector3(0, 1, 0)
  let knockHeight = 0
  let jumpHeight = 0
  let jumpUntil = 0
  let lastAttack = -Infinity
  let attackUntil = 0
  let room
  let selfPlayerId = null, localEmote = null, localEmoteUntil = 0, latestPlayers = []
  function updateTeamChoice(players, selfId) {
    const own = players.find(player => player.id === selfId)
    const preparing = phase.stage === 'grazing', teamMode = phase.mode === 'teams'
    modeSelect.disabled = !own || !room?.connected || !preparing || phase.hostId !== selfId
    document.querySelector('#mode-note').textContent = !own ? 'Đang kết nối phòng…' : phase.hostId === selfId ? preparing ? 'Bạn là chủ phòng. Chọn chế độ cho cả phòng ở đây.' : 'Đang combat. Chọn chế độ ở vòng ăn cỏ tiếp theo.' : teamMode ? 'Chủ phòng chọn chế độ; bạn có thể đổi đội nếu quân số vẫn cân bằng.' : 'Chủ phòng chọn chế độ cho cả phòng. Tự do: tính điểm từng bò.'
    document.querySelector('#team-choice').hidden = !teamMode
    document.querySelector('#team-choice-note').textContent = !own ? 'Đang kết nối phòng…' : preparing ? 'Lần đầu vào sẽ xếp đội ngẫu nhiên. Chỉ đổi đội nếu hai bên lệch tối đa 1 người. Skin chỉ là ngoại hình.' : 'Đang combat: khóa chuyển đội đến vòng ăn cỏ tiếp theo.'
    const counts = { blue: 0, red: 0 }
    for (const player of players) if (player.connected !== false && counts[player.team] !== undefined) counts[player.team]++
    for (const button of teamButtons) {
      const selected = own?.team === button.dataset.team
      button.setAttribute('aria-pressed', String(selected))
      const canSwitch = own && Math.abs(counts[button.dataset.team] + 1 - (counts[own.team] - 1)) <= 1
      button.disabled = !own || !room?.connected || !preparing || !teamMode || selected || !canSwitch
      button.title = !selected && !canSwitch ? 'Chuyển đội sẽ làm hai bên lệch quá 1 người' : ''
      document.querySelector(`#${button.dataset.team}-count`).textContent = `${counts[button.dataset.team]} người`
    }
  }
  modeSelect.addEventListener('change', () => { room?.setMode(modeSelect.value) })
  teamButtons.forEach(button => button.addEventListener('click', () => { room?.setTeam(button.dataset.team) }))
  emoteButtons.forEach(button => button.addEventListener('click', () => { if (!observing()) room?.emote(button.dataset.emote) }))
  const setStatus = (value) => {
    if (value === currentStatus) return
    currentStatus = value
    statusLabel.textContent = value
  }
  const isEating = () => !gameMenu.isOpen && !observing() && room?.connected && !isKnocked() && jumpUntil <= room.now && jumpHeight < .15 && (keys.has('KeyE') || elapsed < eatingUntil)
  const isKnocked = () => knockedUntil > (room?.now || Date.now())
  const move = (delta) => {
    if (gameMenu.isOpen || !room?.connected || observing() || isKnocked()) { walking = false; return }
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'))
    const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    walking = (forward !== 0 || side !== 0) && !isEating()
    if (!walking) return
    right.crossVectors(cameraForward, normal).normalize()
    direction.copy(cameraForward).multiplyScalar(forward).addScaledVector(right, side).normalize()
    axis.crossVectors(normal, direction).normalize()
    stepRotation.setFromAxisAngle(axis, (2.1 * progression.multiplier('speed') * delta) / radius)
    normal.applyQuaternion(stepRotation).normalize()
    cameraForward.applyQuaternion(stepRotation).projectOnPlane(normal).normalize()
    heading.copy(direction).applyQuaternion(stepRotation).projectOnPlane(normal).normalize()
  }
  document.addEventListener('keydown', (event) => {
    if (gameMenu.isOpen) return
    if (event.code === 'Space' && event.target.closest('button')) return
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return
    const emoteKey = EMOTES.find(emote => emote.key === event.code)
    if (!movementKeys.has(event.code) && !['KeyE', 'Space', 'KeyF'].includes(event.code) && !emoteKey) return
    event.preventDefault()
    if (!room?.connected || observing() || isKnocked()) return
    if (emoteKey) { if (!event.repeat) room.emote(emoteKey.id); return }
    const alreadyDown = keys.has(event.code)
    keys.add(event.code)
    if (!alreadyDown && movementKeys.has(event.code)) move(.045)
    // Một lần nhấn ngắn cũng đủ để thấy bò cúi xuống.
    if (event.code === 'KeyE' && !alreadyDown) eatingUntil = elapsed + 1.35
    if (event.code === 'Space' && !alreadyDown && jumpHeight === 0) {
      room?.jump()
    }
    if (event.code === 'KeyF' && !alreadyDown) {
      if (phase.stage !== 'combat') combatNotice.textContent = 'Chờ hết 30 giây ăn cỏ rồi mới húc được nhé!'
      else if (stamina < 25) combatNotice.textContent = 'Húc cần 25 stamina. Chờ hồi sức nhé!'
      else if (elapsed - lastAttack >= .65 && room?.attack()) {
        lastAttack = elapsed
        attackUntil = room.now + 300
        eatingUntil = 0
      }
    }
  })
  document.addEventListener('keyup', (event) => keys.delete(event.code))
  window.addEventListener('blur', () => { keys.clear(); eatingUntil = 0 })
  gameMenu.dialog.addEventListener('menu-open', () => { keys.clear(); eatingUntil = 0; walking = false })
  document.querySelector('#eat-button').addEventListener('click', () => { eatingUntil = elapsed + 1.35 })
  document.querySelector('#reset-button').addEventListener('click', () => {
    keys.clear()
    eatingUntil = 0
    normal.set(0, 1, 0)
    cameraForward.set(0, 0, 1)
    heading.set(0, 0, -1)
    zoom = .48
    headDip = 0
    jumpHeight = 0
  })
  window.addEventListener('wheel', (event) => {
    if (gameMenu.isOpen) return
    const card = event.target.closest('.grazing-card')
    if (card && card.scrollHeight > card.clientHeight) return
    event.preventDefault()
    zoom = THREE.MathUtils.clamp(zoom + event.deltaY * .001, 0, 1)
  }, { passive: false })
  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.fov = window.innerWidth < 680 ? 56 : 46
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65))
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  resize()
  const cameraTarget = new THREE.Vector3()
  const focusTarget = new THREE.Vector3()
  const desiredCowRotation = new THREE.Quaternion()
  const updateCamera = (ease, snap = false) => {
    right.crossVectors(cameraForward, normal).normalize()
    const narrow = window.innerWidth < 680
    const distance = THREE.MathUtils.lerp(narrow ? 18 : 16, 4.5, smoothZoom)
    cameraTarget.copy(cow.position).addScaledVector(normal, THREE.MathUtils.lerp(4.1, 2.4, smoothZoom))
      .addScaledVector(cameraForward, -distance).addScaledVector(right, distance * (narrow ? .08 : .22))
    focusTarget.copy(cow.position).multiplyScalar(THREE.MathUtils.lerp(.18, .92, smoothZoom))
    focusTarget.addScaledVector(normal, 1.3 * smoothZoom + .2)
    if (!narrow) focusTarget.addScaledVector(right, .25 * (1 - smoothZoom))
    if (narrow) focusTarget.addScaledVector(normal, 1.6 * (1 - smoothZoom))
    camera.position.lerp(cameraTarget, snap ? 1 : ease)
    camera.up.lerp(normal, snap ? 1 : ease).normalize()
    lookAt.lerp(focusTarget, snap ? 1 : ease)
    camera.lookAt(lookAt)
    sunlight.position.copy(normal).multiplyScalar(12).addScaledVector(cameraForward, -7).addScaledVector(right, -5)
    sunlight.target.position.copy(normal).multiplyScalar(2)
    rimLight.position.copy(normal).multiplyScalar(5).addScaledVector(cameraForward, 8).addScaledVector(right, 7)
    rimLight.target.position.copy(cow.position)
  }
  cow.position.copy(normal).multiplyScalar(radius)
  cow.quaternion.copy(surfaceQuaternion(normal, heading))
  updateCamera(1, true)
  window.addEventListener('resize', resize)
  let rosterKey = ''
  let localColor = '#cfec91'
  const updateHealth = (player) => {
    if (progression.syncLife(player.id, player.deaths || 0, player.health === 0)) {
      hideReward()
      updateProgressUI()
      showToast('Bị húc chết: về cấp 1. Skin và cấp sưu tầm vẫn giữ.')
    }
    const available = player.health > 0 && player.spectating !== true
    if (available !== upgradesAvailable) { upgradesAvailable = available; updateProgressUI() }
    health = player.health
    spectating = player.spectating === true
    maxHealth = player.maxHealth
    stamina = player.stamina
    healthText.textContent = `${health} / ${maxHealth}`
    healthBar.setAttribute('aria-valuemax', String(maxHealth))
    healthBar.setAttribute('aria-valuenow', String(health))
    healthFill.style.width = `${health / maxHealth * 100}%`
    const lowHealth = health > 0 && health / maxHealth <= LOW_HEALTH_RATIO
    healthFill.classList.toggle('low-health', lowHealth)
    lowHealthVignette.hidden = spectating || !lowHealth
    lowHealthVignette.classList.toggle('critical', health / maxHealth <= .15)
    staminaText.textContent = `${Math.floor(player.stamina)} / ${player.maxStamina}`
    staminaBar.setAttribute('aria-valuemax', String(player.maxStamina))
    staminaBar.setAttribute('aria-valuenow', String(Math.floor(player.stamina)))
    staminaFill.style.width = `${player.stamina / player.maxStamina * 100}%`
    staminaFill.classList.toggle('low-stamina', player.stamina < 25)
    knockedUntil = player.knockedUntil
    jumpUntil = player.jumpUntil || 0
    if (isKnocked()) {
      knockTarget.fromArray(player.normal)
      knockHeight = player.jumpHeight
      keys.clear(); eatingUntil = 0
    }
    knockoutNotice.hidden = !observing()
    document.body.classList.toggle('is-observing', observing())
    waitMessage.textContent = spectating ? 'Chờ vòng mới' : 'Hết máu · chờ vòng mới'
    if (observing()) { keys.clear(); eatingUntil = 0 }
    document.querySelector('#eat-button').disabled = observing() || !room?.connected || isKnocked() || jumpUntil > room.now
    document.querySelector('#reset-button').disabled = observing() || isKnocked() || phase.stage === 'combat'
  }
  room = connectRoom({
    account,
    name: playerName,
    getPose: () => {
      const state = progression.snapshot()
      return { normal: normal.toArray(), heading: heading.toArray(), eating: isEating(), level: state.level, jumpHeight, powerRank: state.skills.power, armorRank: state.skills.armor, enduranceRank: state.skills.endurance, skin: state.selectedSkin, sessionId: phase.sessionId, round: phase.round }
    },
    onPhase: (nextPhase) => {
      if (progression.enterRound(`${nextPhase.sessionId || 'legacy'}:${nextPhase.round}`, nextPhase.stage)) {
        hideReward()
        updateProgressUI()
        biteReward.textContent = nextPhase.stage === 'combat' ? 'Combat: ăn cỏ hồi máu · Cấp và kỹ năng đã khóa' : 'Vòng mới: giữ cấp nếu sống sót · Ăn cỏ để nâng kỹ năng'
      }
      visuals.setCombat(nextPhase.stage === 'combat')
      if (phase.stage !== nextPhase.stage || phase.round !== nextPhase.round) {
        if (nextPhase.stage === 'combat') audio.play('combat')
        showToast(nextPhase.stage === 'combat' ? 'Bắt đầu combat! Húc gây mất máu và đẩy bò đối phương bay đi.' : `Vòng ${nextPhase.round}: 30 giây ăn cỏ và nâng kỹ năng!`)
      }
      phase = nextPhase
      modeSelect.value = phase.mode || 'free'
      modeSelect.disabled = phase.stage !== 'grazing' || phase.hostId !== selfPlayerId
      document.querySelector('#mode-label').textContent = phase.mode === 'teams' ? '2 đội' : 'Tự do'
      document.querySelector('#score-rule').textContent = phase.mode === 'teams' ? 'Cộng điểm cả đội. Nhiều điểm hạ hơn thắng; bằng thì xét sát thương. Không húc đồng đội.' : 'Hạ nhiều bò hơn để thắng. Bằng điểm thì xét sát thương.'
      updateTeamChoice(latestPlayers, selfPlayerId)
      roundName.textContent = `VÒNG ${phase.round} · ${phase.stage === 'combat' ? 'COMBAT' : 'ĂN CỎ'}`
      phaseHint.textContent = phase.stage === 'combat' ? `${COMBAT_SECONDS} giây · F húc · E hồi máu · Khóa XP` : `${GRAZING_SECONDS} giây ăn cỏ · Giữ cấp nếu sống sót · Chưa được húc`
    },
    onNotice: (message) => { combatNotice.textContent = message },
    onJump: (message) => { if (!observing() && !isKnocked()) { jumpUntil = message.jumpUntil; jumpHeight = jumpHeightAt(room.now, jumpUntil); eatingUntil = 0; visuals.emit('jump', normal, heading); audio.play('jump'); combatNotice.textContent = 'Đang nhảy: né được húc · −10 stamina' } },
    onStatus: (value) => {
      roomStatus.textContent = value
      if (value.startsWith('Mất') || value.startsWith('Đang kết nối') || value.startsWith('Chú bò đang')) {
        upgradesAvailable = false
        updateProgressUI()
      }
      if (value.startsWith('Mất')) combatNotice.textContent = 'Đang kết nối lại. Chờ vào phòng để ăn cỏ hoặc húc.'
    },
    onJoin: (player, resumed) => {
      localColor = player.color
      normal.fromArray(player.normal)
      heading.fromArray(player.heading).projectOnPlane(normal).normalize()
      cameraForward.set(0, 0, 1).projectOnPlane(normal).normalize()
      jumpHeight = 0
        updateHealth(player)
      cow.position.copy(normal).multiplyScalar(radius)
      cow.quaternion.copy(surfaceQuaternion(normal, heading))
      updatePlayerTag(cow, { ...player, name: playerName, level: progression.snapshot().level }, phase.mode)
      keys.clear(); eatingUntil = 0
      combatNotice.textContent = spectating ? 'Đang xem team · Vòng tới bạn sẽ được ăn cỏ và chọn kỹ năng.' : resumed ? 'Đã trở lại! Máu, stamina và điểm được giữ theo trạng thái máy chủ.' : 'Space: nhảy · F: húc bò ở gần trước mặt'
    },
    onPlayers: (players, selfId) => {
      selfPlayerId = selfId
      latestPlayers = players
      updateTeamChoice(players, selfId)
      modeSelect.disabled = phase.stage !== 'grazing' || phase.hostId !== selfId
      roundUI.update(players.filter(player => !player.spectating), selfId, phase.mode)
      teamCount.textContent = String(players.filter(player => player.connected !== false).length)
      const nextRosterKey = players.map(player => `${player.id}:${player.name}:${player.level}:${player.health}:${player.connected}:${player.spectating}:${player.color}:${player.team}:${phase.mode}`).join('|')
      if (nextRosterKey !== rosterKey) {
        rosterKey = nextRosterKey
        teamList.replaceChildren(...players.map(player => {
          const item = document.createElement('li')
          const dot = document.createElement('i')
          dot.style.background = player.color
          item.append(dot, document.createTextNode(`${player.name}${player.id === selfId ? ' (bạn)' : ''}${phase.mode === 'teams' ? ` · ${getTeam(player.team)?.name || ''}` : ''}${player.spectating ? ' · đang xem' : ` · Lv.${player.level} · ${player.health} máu`}${player.connected === false ? ' · mất mạng' : ''}`))
          return item
        }))
      }
      const liveIds = new Set()
      for (const player of players) {
        if (player.id === selfId) {
          localColor = player.color
          localEmote = player.emote
          localEmoteUntil = Math.max(localEmoteUntil, player.emote?.until || 0)
          const team = phase.mode === 'teams' ? getTeam(player.team) : null
          document.querySelector('#my-team').textContent = team ? `ĐỘI ${team.name.toUpperCase()}` : 'TỰ DO · MỖI BÒ MỘT ĐỘI'
          document.querySelector('#my-team').style.color = team?.color || '#76934d'
          account.recordRoomStats(phase.sessionId, player)
          updateHealth(player)
          updatePlayerTag(cow, player, phase.mode)
          continue
        }
        if (player.spectating) continue
        liveIds.add(player.id)
        let avatar = avatars.get(player.id)
        if (!avatar) {
          const model = createCow()
          model.scale.setScalar(.75)
          avatar = { model, shadow: createContactShadow(scene), normal: new THREE.Vector3(...player.normal), targetNormal: new THREE.Vector3(), targetHeading: new THREE.Vector3(), jumpHeight: player.jumpHeight, moving: false, state: player }
          scene.add(model)
          avatars.set(player.id, avatar)
        }
        avatar.moving = avatar.targetNormal.distanceToSquared(new THREE.Vector3(...player.normal)) > .000001
        avatar.targetNormal.fromArray(player.normal)
        avatar.targetHeading.fromArray(player.heading)
        avatar.state = player
        applyCowSkin(avatar.model, player.skin)
        updatePlayerTag(avatar.model, player, phase.mode)
      }
      for (const [id, avatar] of avatars) {
        if (!liveIds.has(id)) {
          scene.remove(avatar.model, avatar.shadow)
          disposeAvatar(avatar.model)
          avatar.shadow.geometry.dispose(); avatar.shadow.material.map.dispose(); avatar.shadow.material.dispose()
          avatars.delete(id)
        }
      }
      watchPlayers = players.filter(player => player.id !== selfId && !player.spectating && player.health > 0 && player.connected !== false)
      if (!watchPlayers.some(player => player.id === watchedId)) watchedId = watchPlayers[0]?.id || ''
      const nextWatchKey = watchPlayers.map(player => `${player.id}:${player.name}`).join('|')
      if (nextWatchKey !== watchKey || watchSelect.options.length === 0) {
        watchKey = nextWatchKey
        watchSelect.replaceChildren(...(watchPlayers.length ? watchPlayers : [{ id: '', name: 'Chưa có bò đang chơi' }]).map(player => {
          const option = document.createElement('option'); option.value = player.id; option.textContent = player.name; return option
        }))
      }
      watchSelect.value = watchedId
      watchSelect.disabled = watchPlayers.length === 0
      watchStepButtons.forEach(button => { button.disabled = watchPlayers.length < 2 })
    },
    onLeaderboard: (rows, selfId) => roundUI.updateLeaderboard(rows, selfId),
    onGrass: (changes, reset) => grass.applyChanges(changes, reset),
    onResult: (result, selfId) => {
      roundUI.showResult(result, selfId)
      showToast(`Hết vòng ${result.round}. Xem kết quả trong Menu → Phòng chơi.`)
      const own = result.rows.find(player => player.id === selfId)
      if (result.mode === 'teams' ? result.winningTeams?.includes(own?.team) : result.winners.includes(selfId)) audio.play('win')
    },
    onEmote: (message, selfId) => {
      if (message.playerId === selfId) { localEmote = message.emote; localEmoteUntil = message.emote.until; audio.play(message.emote.id) }
      else {
        const avatar = avatars.get(message.playerId)
        if (!avatar) return
        avatar.state.emote = message.emote
        const distance = Math.acos(THREE.MathUtils.clamp(normal.dot(avatar.normal), -1, 1)) * radius
        audio.play(message.emote.id, Math.max(0, 1 - distance / 9))
      }
    },
    onBite: (grassCount, healed) => {
      if (grassCount > 0) {
        audio.play('eat')
        visuals.emit('eat', mouthNormal, heading, grassCount)
        const { levelsGained, xpGained, rewards, skinRewards } = progression.eat(grassCount)
        updateProgressUI()
        biteReward.textContent = phase.stage === 'combat' ? `${grassCount} cụm cỏ · ${healed ? `+${healed} máu` : 'Máu đã đầy'} · Không nhận XP` : `+${xpGained} XP · ${grassCount} cụm cỏ${healed ? ` · +${healed} máu` : ''}`
        setStatus('Nhăm nhăm… cỏ ngon quá!')
        if (levelsGained > 0 || skinRewards.length > 0) {
          showRewards(rewards, skinRewards)
        }
      } else {
        biteReward.textContent = 'Cỏ đã được ăn hết ở đây · +0 XP'
        setStatus('Đi tìm bãi cỏ khác nào!')
      }
    },
    onAttack: (message, selfId) => {
      const attacker = message.attackerId === selfId ? { normal, heading } : avatars.get(message.attackerId)
      if (attacker) visuals.emit('attack', attacker.normal, attacker.heading || attacker.targetHeading)
      for (const victim of message.victims) {
        const target = victim.id === selfId ? { normal, model: cow } : avatars.get(victim.id)
        if (target) {
          visuals.emit('hit', target.normal, null, victim.damage)
          target.model.userData.hitUntil = room.now + 280
        }
      }
      if (message.attackerId === selfId) {
        audio.play('attack')
        attackUntil = message.serverNow + 300
        combatNotice.textContent = message.victims.length ? `Húc trúng! Đẩy bay và gây ${message.victims.map(victim => victim.damage).join(' / ')} sát thương. −25 stamina` : 'Húc hụt! Đứng gần và quay về phía bò khác nhé. −25 stamina'
      }
      const hit = message.victims.find(victim => victim.id === selfId)
      if (hit) { knockedUntil = hit.knockedUntil; jumpUntil = 0; keys.clear(); eatingUntil = 0; audio.play('hit'); combatNotice.textContent = `Mất ${hit.damage} máu · Choáng 0,5 giây · Không thể ăn cỏ hồi máu` }
    },
    onReposition: (message, selfId) => {
      if (message.playerId !== selfId) return
      normal.fromArray(message.normal)
      heading.fromArray(message.heading).projectOnPlane(normal).normalize()
      if (message.reason === 'landed') cameraForward.projectOnPlane(normal).normalize()
      else cameraForward.set(0, 0, 1).projectOnPlane(normal).normalize()
      jumpHeight = 0
      jumpUntil = 0
        knockedUntil = 0
      eatingUntil = 0
      attackUntil = 0
      if (!['mode', 'team', 'landed'].includes(message.reason)) { localEmote = null; localEmoteUntil = 0 }
      combatNotice.textContent = message.reason === 'landed' ? 'Đã hết choáng. Có thể di chuyển, nhảy và ăn cỏ lại.' : message.reason === 'team' ? 'Đã chuyển đội và về vị trí đội mới. XP, kỹ năng và skin vẫn giữ.' : message.reason === 'mode' ? 'Đã đổi chế độ và vị trí đội. XP và kỹ năng vẫn giữ.' : 'Vòng mới! Giữ cấp nếu sống sót. Máu và stamina đã hồi đầy.'
    },
  })
  nameInput.addEventListener('change', () => {
    playerName = nameInput.value.trim().slice(0, 24) || playerName
    if (account.playerName) playerName = account.playerName
nameInput.value = playerName
    try { localStorage.setItem('hanh-tinh-co:name', playerName) } catch {}
    showToast('Đã lưu tên mới!')
    account.saveName(playerName)
    room.setName(playerName)
  })
  nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') nameInput.blur() })
  document.querySelector('#save-name').addEventListener('click', () => { nameInput.dispatchEvent(new Event('change')) })
  const render = (now) => {
    const delta = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, .05)
    lastFrameTime = now
    elapsed += delta
    const ease = 1 - Math.exp(-5 * delta)
    move(delta)
    if (observing()) {
      const watched = watchPlayers.find(player => player.id === watchedId)
      if (watched) {
        watchNormal.fromArray(watched.normal); watchHeading.fromArray(watched.heading)
        watchRotation.setFromUnitVectors(normal, watchNormal).slerp(identityRotation, 1 - ease)
        normal.applyQuaternion(watchRotation).normalize()
        heading.applyQuaternion(watchRotation).lerp(watchHeading, ease).projectOnPlane(normal).normalize()
        cameraForward.applyQuaternion(watchRotation).projectOnPlane(normal).normalize()
        jumpHeight = watched.jumpHeight
      }
    } else if (isKnocked()) {
      normal.lerp(knockTarget, 1 - Math.exp(-18 * (delta || .016))).normalize()
      jumpHeight = THREE.MathUtils.lerp(jumpHeight, knockHeight, 1 - Math.exp(-18 * (delta || .016)))
      cameraForward.projectOnPlane(normal).normalize()
    } else {
      jumpHeight = jumpHeightAt(room.now, jumpUntil)
    }
    smoothZoom = THREE.MathUtils.lerp(smoothZoom, zoom, ease)
    cow.position.copy(normal).multiplyScalar(radius - .005 + jumpHeight)
    cow.visible = !observing()
    cowShadow.visible = !observing()
    desiredCowRotation.copy(surfaceQuaternion(normal, heading))
    cow.quaternion.slerp(desiredCowRotation, 1 - Math.exp(-12 * delta))
    updateContactShadow(cowShadow, normal, heading, radius, jumpHeight)
    updateHitGlow(cow, room.now)
    updateCowEmote(cow, health > 0 ? localEmote : null, room.now, reduceMotion)
    animateCowFace(cow, elapsed, isEating(), health > 0)
    const eating = isEating()
    headDip = THREE.MathUtils.lerp(headDip, eating ? 1 : 0, 1 - Math.exp(-7 * delta))
    const { head, jaw, legs, tail, body } = cow.userData
    head.rotation.x = headDip * 1.04
    head.position.y = 1.16 - headDip * .34
    const attacking = Math.max(0, (attackUntil - room.now) / 300)
    body.rotation.x = headDip * .07 + Math.sin(attacking * Math.PI) * .28
    body.rotation.z = health === 0 ? .9 : isKnocked() ? Math.sin(now * .015) * .35 : 0
    cow.userData.collar.material.color.set(isKnocked() ? '#ffbf72' : localColor)
    body.position.y = walking && !reduceMotion ? Math.abs(Math.sin(elapsed * 9)) * .035 : 0
    jaw.position.y = -.21 - (eating || cow.userData.activeEmote === 'moo' ? Math.max(0, Math.sin(elapsed * 12)) * .035 : 0)
    legs.forEach((leg, index) => {
      const phase = index === 0 || index === 3 ? 0 : Math.PI
      leg.rotation.x = walking ? Math.sin(elapsed * 9 + phase) * .25 : 0
    })
    tail.rotation.z = reduceMotion ? 0 : Math.sin(elapsed * 2.1) * .23
    if (eating && headDip > .82 && elapsed >= nextBite) {
      cow.updateMatrixWorld(true)
      mouthNormal.copy(mouthLocal)
      head.localToWorld(mouthNormal)
      mouthNormal.normalize()
      const biteRadius = .48 * progression.multiplier('grazing')
      const indices = grass.candidates(mouthNormal, biteRadius)
      if (!room.bite(indices, mouthNormal.toArray(), biteRadius, 20 * progression.multiplier('regrowth')) && !room.connected) {
        biteReward.textContent = 'Chờ kết nối máy chủ để ăn cỏ'
      }
      nextBite = elapsed + .7 / progression.multiplier('chewing')
    } else if (!eating) {
      setStatus(walking ? 'Đang đi dạo quanh hành tinh' : 'Đang ngắm đồng cỏ')
    } else if (headDip < .82) {
      setStatus('Đang cúi xuống ăn cỏ')
    }
    if (isKnocked()) setStatus('Choáng · Chưa thể hồi máu')
    else if (jumpUntil > room.now && !observing()) setStatus('Đang nhảy · Né được húc')
    const stunStatus = document.querySelector('#stun-status')
    stunStatus.hidden = !isKnocked()
    if (isKnocked()) stunStatus.textContent = `Choáng ${Math.max(0, (knockedUntil - room.now) / 1000).toFixed(1).replace('.', ',')} giây`
    document.querySelector('.grazing-card').classList.toggle('is-stunned', isKnocked())
    document.querySelector('#eat-button').disabled = observing() || !room.connected || isKnocked() || jumpUntil > room.now
    const seconds = Math.max(0, Math.ceil((phase.endsAt - room.now) / 1000))
    phaseClock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    if (observing()) { setStatus('Đang xem team · chờ vòng mới'); returnSeconds.textContent = String(seconds) }
    const emoteWait = Math.max(0, Math.ceil((localEmoteUntil - room.now) / 100) / 10)
    emoteHint.textContent = emoteWait ? `Biểu cảm tiếp theo sau ${emoteWait.toFixed(1).replace('.', ',')} giây` : '1 thả tim · 2 vui vẻ · 3 Moo!'
    emoteButtons.forEach(button => { button.disabled = observing() || !room.connected || emoteWait > 0 })
    grass.update(room.now)
    for (const avatar of avatars.values()) {
      const player = avatar.state
      const remoteEase = 1 - Math.exp(-12 * (lastFrameTime === null ? .016 : Math.min(delta || .016, .05)))
      avatar.normal.lerp(avatar.targetNormal, remoteEase).normalize()
      avatar.jumpHeight = THREE.MathUtils.lerp(avatar.jumpHeight, player.jumpHeight, remoteEase)
      avatar.model.position.copy(avatar.normal).multiplyScalar(radius + avatar.jumpHeight)
      avatar.model.quaternion.slerp(surfaceQuaternion(avatar.normal, avatar.targetHeading), remoteEase)
      updateContactShadow(avatar.shadow, avatar.normal, avatar.targetHeading, radius, avatar.jumpHeight)
      updateHitGlow(avatar.model, room.now)
      updateCowEmote(avatar.model, player.health > 0 ? player.emote : null, room.now, reduceMotion)
      animateCowFace(avatar.model, elapsed, player.eating, player.health > 0)
      const parts = avatar.model.userData
      const dip = player.eating ? 1 : 0
      parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, dip * 1.04, remoteEase)
      parts.head.position.y = 1.16 - dip * .34
      parts.body.rotation.x = Math.sin(Math.max(0, (player.attackUntil - room.now) / 300) * Math.PI) * .28
      parts.body.rotation.z = player.health === 0 ? .9 : player.knockedUntil > room.now ? Math.sin(now * .015) * .35 : 0
      parts.collar.material.color.set(player.knockedUntil > room.now ? '#ffbf72' : player.color)
      parts.legs.forEach((leg, index) => {
        leg.rotation.x = avatar.moving && player.health > 0 && !player.eating ? Math.sin(now * .009 + (index === 0 || index === 3 ? 0 : Math.PI)) * .25 : 0
      })
    }
    updateCamera(ease)
    visuals.update(elapsed, delta)
    renderer.render(scene, camera)
    animationFrame = requestAnimationFrame(render)
  }
  animationFrame = requestAnimationFrame(render)
  document.addEventListener('visibilitychange', () => {
    keys.clear()
    eatingUntil = 0
    if (document.hidden) cancelAnimationFrame(animationFrame)
    else { lastFrameTime = null; animationFrame = requestAnimationFrame(render) }
  })
}

buildWorld()




