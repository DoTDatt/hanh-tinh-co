import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { applyCowSkin } from './cow-skins.js'

export function createCow() {
  const cow = new THREE.Group()
  cow.name = 'Bò sữa'
  const cream = new THREE.MeshStandardMaterial({ color: '#fff6e2', roughness: .72 })
  const black = new THREE.MeshStandardMaterial({ color: '#3f4540', roughness: .75 })
  const pink = new THREE.MeshStandardMaterial({ color: '#f3b3ac', roughness: .68 })
  const horn = new THREE.MeshStandardMaterial({ color: '#e9c995', roughness: .68 })
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .55 })
  const blush = new THREE.MeshStandardMaterial({ color: '#ec949d', roughness: .8 })
  const gold = new THREE.MeshStandardMaterial({ color: '#e7af42', metalness: .35, roughness: .38 })
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#121b19', roughness: .3 })
  const shape = (parent, size, position, material, radius = .1) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material)
    mesh.position.set(...position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const ball = (parent, size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), material)
    mesh.scale.set(...size)
    mesh.position.set(...position)
    mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  const body = new THREE.Group()
  cow.add(body)
  shape(body, [.96, .86, 1.42], [0, 1.01, -.13], cream, .28)
  // Mảng đen nằm trên hai bên và lưng để vẫn thấy từ xa.
  for (const side of [-1, 1]) {
    ball(body, [.025, .25, .28], [side * .475, 1.05, -.4], black)
    ball(body, [.027, .18, .2], [side * .475, 1.13, .23], black)
    ball(body, [.24, .035, .25], [side * .18, 1.435, -.45], black)
  }
  const legs = []
  for (const x of [-.29, .29]) {
    for (const z of [-.64, .34]) {
      const leg = new THREE.Group()
      leg.position.set(x, .79, z)
      cow.add(leg)
      shape(leg, [.19, .59, .21], [0, -.25, 0], cream, .055)
      shape(leg, [.22, .18, .25], [0, -.69, .018], black, .04)
      legs.push(leg)
    }
  }
  ball(body, [.21, .13, .26], [0, .61, -.25], pink)
  const head = new THREE.Group()
  head.position.set(0, 1.16, .55)
  body.add(head)
  shape(head, [.72, .65, .64], [0, .1, .2], cream, .21)
  shape(head, [.63, .27, .34], [0, -.075, .53], pink, .12)
  shape(head, [.19, .16, .024], [-.17, .32, .527], black, .055)
  const eyes = [], ears = []
  for (const side of [-1, 1]) {
    const ear = new THREE.Group()
    ear.position.set(side * .43, .28, .13)
    ear.rotation.z = side * -.22
    head.add(ear)
    ball(ear, [.245, .08, .13], [0, 0, 0], cream)
    ball(ear, [.17, .026, .086], [0, .066, .009], pink)
    ears.push(ear)
    const eye = new THREE.Group()
    eye.position.set(side * .166, .23, .542)
    head.add(eye)
    ball(eye, [.092, .112, .035], [0, 0, 0], white)
    ball(eye, [.057, .079, .027], [-side * .005, -.004, .031], eyeMaterial)
    ball(eye, [.023, .027, .008], [-.016, .029, .055], white)
    ball(eye, [.009, .011, .005], [.018, -.031, .057], white)
    eyes.push(eye)
    ball(head, [.073, .032, .018], [side * .217, -.072, .704], blush)
    ball(head, [.022, .018, .012], [side * .112, -.052, .706], black)
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 10), horn)
    tip.position.set(side * .2, .49, .09)
    tip.rotation.z = side * -.23
    head.add(tip)
  }
  const jaw = shape(head, [.43, .095, .21], [0, -.21, .49], pink, .03)
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.085, .008, 5, 16, Math.PI), black)
  smile.position.set(0, -.12, .719)
  smile.rotation.z = Math.PI
  head.add(smile)
  const bell = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 8), gold)
  bell.scale.set(1, 1.12, .8)
  bell.position.set(0, .72, .65)
  body.add(bell)
  const tail = new THREE.Group()
  tail.position.set(0, 1.14, -.91)
  body.add(tail)
  shape(tail, [.065, .53, .065], [0, -.21, -.06], cream, .025)
  ball(tail, [.075, .13, .075], [0, -.5, -.06], black)
  cow.userData = { head, jaw, body, legs, tail, eyes, ears, materials: [cream, black, pink], hitUntil: 0,
    skinMaterials: { fur: cream, patch: black, muzzle: pink, horn, blush, bell: gold } }
  applyCowSkin(cow, 'classic')
  return cow
}

