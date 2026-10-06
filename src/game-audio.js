export function createGameAudio() {
  let context, master, enabled = true, volume = .35, activeVoices = 0
  const lastPlayed = new Map()
  const toggle = document.querySelector('#sound-toggle'), slider = document.querySelector('#sound-volume')
  try {
    const saved = JSON.parse(localStorage.getItem('hanh-tinh-co:audio'))
    if (typeof saved?.enabled === 'boolean') enabled = saved.enabled
    if (Number.isFinite(saved?.volume)) volume = Math.max(0, Math.min(1, saved.volume))
  } catch {}
  function update() {
    toggle.textContent = enabled ? 'Âm thanh bật' : 'Âm thanh tắt'
    toggle.setAttribute('aria-pressed', String(enabled)); slider.value = String(Math.round(volume * 100))
    if (master) master.gain.setTargetAtTime(enabled ? volume * .22 : 0, context.currentTime, .03)
  }
  function save() { try { localStorage.setItem('hanh-tinh-co:audio', JSON.stringify({ enabled, volume })) } catch {} }
  function unlock() {
    if (!enabled) return
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext
        if (!Audio) return
        context = new Audio(); master = context.createGain(); master.connect(context.destination); update()
      }
      if (context.state === 'suspended') context.resume().catch(() => {})
    } catch {}
  }
  document.addEventListener('pointerdown', unlock)
  document.addEventListener('keydown', unlock)
  toggle.addEventListener('click', () => { enabled = !enabled; update(); save(); unlock() })
  slider.addEventListener('input', () => { volume = Number(slider.value) / 100; update(); save(); unlock() })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && context?.state === 'running') context.suspend().catch(() => {})
  })
  update()
  function tone(frequency, endFrequency, duration, delay = 0, gain = .25, type = 'sine') {
    if (activeVoices >= 20) return
    activeVoices++
    const start = context.currentTime + delay, oscillator = context.createOscillator(), envelope = context.createGain()
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration)
    envelope.gain.setValueAtTime(.001, start); envelope.gain.exponentialRampToValueAtTime(Math.max(.001, gain), start + .015)
    envelope.gain.exponentialRampToValueAtTime(.001, start + duration)
    oscillator.connect(envelope); envelope.connect(master); oscillator.start(start); oscillator.stop(start + duration + .03)
    oscillator.onended = () => { activeVoices--; oscillator.disconnect(); envelope.disconnect() }
  }
  return {
    play(name, strength = 1) {
      if (!enabled || !context || context.state !== 'running' || document.hidden || strength <= 0) return
      const now = performance.now(), limit = name === 'eat' ? 180 : 100
      if (now - (lastPlayed.get(name) ?? -Infinity) < limit) return
      lastPlayed.set(name, now)
      const gain = Math.min(1, strength) * .32
      if (name === 'eat') { tone(270, 155, .1, 0, gain, 'triangle'); tone(340, 210, .08, .07, gain * .5) }
      else if (name === 'jump') tone(180, 540, .2, 0, gain)
      else if (name === 'attack') tone(180, 45, .19, 0, gain, 'triangle')
      else if (name === 'hit') tone(95, 35, .24, 0, gain, 'triangle')
      else if (name === 'moo') { tone(110, 86, .65, 0, gain, 'triangle'); tone(290, 210, .55, .04, gain * .3); tone(780, 600, .3, .06, gain * .12) }
      else if (name === 'heart') { tone(520, 650, .17, 0, gain); tone(650, 780, .18, .1, gain * .7) }
      else if (name === 'happy' || name === 'level' || name === 'win') {
        const notes = name === 'win' ? [523, 659, 784, 1046] : [440, 554, 659]
        notes.forEach((note, index) => tone(note, note, .24, index * .11, gain * .7))
      } else if (name === 'combat') { tone(220, 180, .32, 0, gain); tone(440, 360, .28, .06, gain * .5) }
    },
  }
}
