import * as THREE from 'three'
import { EMOTES } from './social-data.js'

export function updateCowEmote(cow, emote, now, reduceMotion) {
  const definition = EMOTES.find(item => item.id === emote?.id)
  const active = definition && emote.until > now && cow.visible
  cow.userData.activeEmote = active ? definition.id : null
  if (!active) { if (cow.userData.emoteSprite) cow.userData.emoteSprite.visible = false; return }
  if (!cow.userData.emoteSprite) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
    sprite.scale.set(.85, .85, 1); cow.add(sprite)
    Object.assign(cow.userData, { emoteCanvas: canvas, emoteSprite: sprite })
  }
  const sprite = cow.userData.emoteSprite
  if (cow.userData.emoteKey !== `${emote.id}:${emote.startedAt}`) {
    cow.userData.emoteKey = `${emote.id}:${emote.startedAt}`
    const context = cow.userData.emoteCanvas.getContext('2d')
    context.clearRect(0, 0, 256, 256); context.fillStyle = '#fff9eb'
    context.beginPath(); context.roundRect(20, 25, 216, 190, 65); context.fill()
    context.strokeStyle = definition.color; context.lineWidth = 8; context.stroke()
    context.fillStyle = definition.color; context.font = `bold ${emote.id === 'moo' ? 57 : 125}px Segoe UI, sans-serif`
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(definition.glyph, 128, 127)
    sprite.material.map.needsUpdate = true
  }
  const elapsed = (now - emote.startedAt) / 1000, remaining = (emote.until - now) / 1000
  sprite.visible = true
  sprite.position.set(1.4, 1.72 + (reduceMotion ? 0 : Math.sin(elapsed * 3) * .06), 0)
  sprite.material.opacity = Math.max(0, Math.min(1, elapsed / .12, remaining / .3))
}
