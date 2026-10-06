export const PLANET_RADIUS = 5.6
export const GRASS_COUNT = 18000

// Cùng hạt giống để mọi máy nhìn thấy cùng một cụm cỏ tại cùng vị trí.
export function createGrassData() {
  let seed = 20261001
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: GRASS_COUNT }, (_, index) => {
    const y = 1 - 2 * (index + .5) / GRASS_COUNT
    const ring = Math.sqrt(1 - y * y)
    const angle = index * goldenAngle
    const jitterY = 2 * random() - 1
    const jitterAngle = random() * Math.PI * 2
    const jitterRing = Math.sqrt(1 - jitterY * jitterY)
    const normal = [
      Math.cos(angle) * ring + .008 * jitterRing * Math.cos(jitterAngle),
      y + .008 * jitterY,
      Math.sin(angle) * ring + .008 * jitterRing * Math.sin(jitterAngle),
    ]
    const length = Math.hypot(...normal)
    return {
      normal: normal.map(value => value / length),
      yaw: random() * Math.PI * 2,
      width: .07 + random() * .06,
      height: .13 + random() * .18,
      color: [.22 + random() * .055, .4 + random() * .2, .3 + random() * .15],
    }
  })
}
