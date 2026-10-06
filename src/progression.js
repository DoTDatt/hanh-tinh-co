import { SKINS, skinsAtLevel, getSkin } from './skins.js'

export const SKILLS = {
  grazing: { name: 'Ăn rộng', bonus: .15, maxRank: 5, effect: 'Bán kính ăn', unit: '%' },
  power: { name: 'Húc mạnh', bonus: .15, maxRank: 5, effect: 'Lực húc & sát thương', unit: '%' },
  armor: { name: 'Trụ vững', bonus: .08, maxRank: 5, effect: 'Lực đẩy & sát thương nhận', unit: '%', decreasing: true },
  endurance: { name: 'Bền sức', bonus: .2, maxRank: 5, effect: 'Stamina tối đa', unit: '%' },
}
export const MAX_LEVEL = 1 + Object.values(SKILLS).reduce((sum, skill) => sum + skill.maxRank, 0)
const SAVE_KEY = 'hanh-tinh-co:progress:v1'
export const xpForLevel = level => 180 + (level - 1) * 120
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max
const wishes = ['Chúc bé bò tìm được thật nhiều bãi cỏ ngon!', 'Chúc bạn có một trận vui cùng team!', 'Bé bò chăm chỉ quá! Tiếp tục khám phá nhé!']

export function rewardForLevel(level) {
  const bonuses = [
    { key: 'speed', amount: .02, text: 'Tốc độ +2% cho đến khi bị húc chết' },
    { key: 'learning', amount: .05, text: 'XP từ cỏ +5% cho đến khi bị húc chết' },
    { key: 'regrowth', amount: .01, text: 'Cỏ mọc nhanh hơn 1% cho đến khi bị húc chết' },
  ]
  return { level, points: 1, bonus: bonuses[(level - 2) % 3], wish: wishes[(level - 2) % wishes.length] }
}
const earnedBonuses = level => ({
  speed: Math.floor((level + 1) / 3) * .02,
  learning: Math.floor(level / 3) * .05,
  regrowth: Math.floor((level - 1) / 3) * .01,
})

export function createProgression({ initialData, saveKey = SAVE_KEY, storage = globalThis.localStorage, onSave } = {}) {
  let meals = 0, totalXp = 0, roundKey = '', stage = 'grazing', bestLevel = 1, selectedSkin = 'classic'
  let lifetimeXp = 0, lifePlayerId = '', knownDeaths = 0
  const ownedSkins = new Set(['classic'])
  const skills = Object.fromEntries(Object.keys(SKILLS).map(key => [key, 0]))
  let storageAvailable = true
  function calculateLevel(value = totalXp) {
    let level = 1, xp = value
    while (level < MAX_LEVEL && xp >= xpForLevel(level)) { xp -= xpForLevel(level); level++ }
    return { level, xp: level === MAX_LEVEL ? 0 : xp, target: xpForLevel(level) }
  }
  try {
    const saved = initialData ?? JSON.parse(storage?.getItem(saveKey) || 'null')
    if (saved?.version === 3 || saved?.version === 4 || saved?.version === 5) {
      totalXp = integer(saved.totalXp, 1000000000) ? saved.totalXp : 0
      meals = integer(saved.meals, 1000000) ? saved.meals : 0
      roundKey = typeof saved.roundKey === 'string' ? saved.roundKey.slice(0, 120) : ''
      bestLevel = integer(saved.bestLevel, 41) ? Math.max(1, Math.min(MAX_LEVEL, saved.bestLevel)) : 1
      let budget = calculateLevel().level - 1
      for (const [key, definition] of Object.entries(SKILLS)) {
        skills[key] = integer(saved.skills?.[key], definition.maxRank) ? Math.min(saved.skills[key], budget) : 0
        budget -= skills[key]
      }
    } else if (saved?.version === 1 || saved?.version === 2) {
      // Giữ quà sưu tầm của cấp cũ; sức mạnh bắt đầu lại ở vòng mới.
      let oldXp = saved.version === 1 && integer(saved.meals, 1000000) ? saved.meals * 10 : integer(saved.totalXp, 1000000000) ? saved.totalXp : 0
      while (bestLevel < MAX_LEVEL && oldXp >= 30 + (bestLevel - 1) * 20) { oldXp -= 30 + (bestLevel - 1) * 20; bestLevel++ }
    }
    if (saved?.version === 5) {
      lifePlayerId = typeof saved.lifePlayerId === 'string' ? saved.lifePlayerId.slice(0, 80) : ''
      knownDeaths = integer(saved.knownDeaths, 1000000000) ? saved.knownDeaths : 0
    }
    bestLevel = Math.max(bestLevel, calculateLevel().level)
    skinsAtLevel(bestLevel).forEach(id => ownedSkins.add(id))
    if (saved?.version === 4 || saved?.version === 5) {
      lifetimeXp = integer(saved.lifetimeXp, 1000000000) ? Math.max(saved.lifetimeXp, totalXp) : totalXp
      if (Array.isArray(saved.ownedSkins)) for (const id of saved.ownedSkins) if (SKINS.some(skin => skin.id === id)) ownedSkins.add(id)
    } else {
      // Các vòng cũ không lưu tổng XP. Dùng mức tối thiểu đã đạt để giữ nguyên quà.
      lifetimeXp = Math.max(totalXp, 60 * (bestLevel - 1) * (bestLevel + 1))
    }
    skinsAtLevel(calculateLevel(lifetimeXp).level).forEach(id => ownedSkins.add(id))
    if (saved?.selectedSkin === getSkin(saved.selectedSkin).id && ownedSkins.has(saved.selectedSkin)) selectedSkin = saved.selectedSkin
  } catch { storageAvailable = false }

  function snapshot() {
    const { level, xp, target } = calculateLevel()
    const collection = calculateLevel(lifetimeXp)
    return { meals, totalXp, level, xp, target, skills: { ...skills }, storageAvailable, stage, bonuses: earnedBonuses(level),
      points: level - 1 - Object.values(skills).reduce((sum, rank) => sum + rank, 0), bestLevel, selectedSkin, ownedSkins: [...ownedSkins], lifetimeXp, collection }
  }
  function save() {
    try {
      const data = { version: 5, meals, totalXp, roundKey, skills: { ...skills }, bestLevel, selectedSkin, lifetimeXp, lifePlayerId, knownDeaths, ownedSkins: [...ownedSkins] }
      storage?.setItem(saveKey, JSON.stringify(data))
      onSave?.(data)
      storageAvailable = true
    } catch { storageAvailable = false }
  }
  return {
    snapshot,
    enterRound(key, nextStage) {
      const changed = key !== roundKey || stage !== nextStage
      roundKey = key
      stage = nextStage === 'combat' ? 'combat' : 'grazing'
      if (changed) save()
      return changed
    },
    syncLife(playerId, deaths, dead = false) {
      if (typeof playerId !== 'string' || !integer(deaths, 1000000000)) return false
      // Số lần chết do máy chủ giữ, không phụ thuộc số vòng hoặc tải lại trang.
      const reset = (playerId === lifePlayerId && deaths > knownDeaths) || (dead && totalXp > 0)
      const changed = reset || playerId !== lifePlayerId || deaths !== knownDeaths
      if (reset) { totalXp = 0; meals = 0; Object.keys(skills).forEach(key => { skills[key] = 0 }) }
      lifePlayerId = playerId; knownDeaths = deaths
      if (changed) save()
      return reset
    },
    eat(grassCount) {
      if (stage !== 'grazing' || !integer(grassCount, 18000) || grassCount === 0) return { xpGained: 0, levelsGained: 0, rewards: [], skinRewards: [] }
      const oldLevel = calculateLevel().level
      const xpGained = Math.round(grassCount * (1 + earnedBonuses(oldLevel).learning))
      meals = Math.min(meals + 1, 1000000); totalXp = Math.min(totalXp + xpGained, 1000000000)
      lifetimeXp = Math.min(lifetimeXp + xpGained, 1000000000)
      const newLevel = calculateLevel().level
      bestLevel = Math.max(bestLevel, newLevel)
      const rewards = Array.from({ length: newLevel - oldLevel }, (_, index) => rewardForLevel(oldLevel + index + 1))
      const skinRewards = SKINS.filter(skin => skin.level <= calculateLevel(lifetimeXp).level && !ownedSkins.has(skin.id))
      skinRewards.forEach(skin => ownedSkins.add(skin.id))
      save()
      return { xpGained, levelsGained: newLevel - oldLevel, rewards, skinRewards }
    },
    upgrade(key) {
      if (stage !== 'grazing' || !Object.hasOwn(SKILLS, key) || snapshot().points < 1 || skills[key] >= SKILLS[key].maxRank) return false
      skills[key]++; save(); return true
    },
    selectSkin(id) {
      if (id !== getSkin(id).id || !ownedSkins.has(id)) return false
      selectedSkin = id; save(); return true
    },
    multiplier(key) {
      const definition = SKILLS[key]
      const bonus = earnedBonuses(calculateLevel().level)[key] || 0
      return 1 + ((definition ? skills[key] * definition.bonus : 0) + bonus) * (definition?.decreasing || key === 'regrowth' ? -1 : 1)
    },
  }
}
