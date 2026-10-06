export const GRAZING_SECONDS = 30
export const COMBAT_SECONDS = 60
export const STUN_MS = 500
export const JUMP_MS = 900
export function jumpHeightAt(now, jumpUntil) {
  if (!jumpUntil || now >= jumpUntil) return 0
  const seconds = Math.max(0, (now - (jumpUntil - JUMP_MS)) / 1000)
  return Math.max(0, 4.5 * seconds - 5 * seconds * seconds)
}
export const LOW_HEALTH_RATIO = .3
