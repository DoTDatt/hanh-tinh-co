import * as THREE from 'three'
import { getSkin } from './skins.js'

export function applyCowSkin(cow, id) {
  const skin = getSkin(id)
  if (cow.userData.skinId === skin.id) return
  cow.userData.skinId = skin.id
  for (const [key, material] of Object.entries(cow.userData.skinMaterials)) material.color.set(skin.colors[key])
  const previous = cow.userData.accessory
  if (previous) {
    previous.removeFromParent()
    previous.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose() })
  }
  const accessory = new THREE.Group()
  accessory.position.set(0, .48, .16)
  cow.userData.head.add(accessory)
  cow.userData.accessory = accessory
  const add = (geometry, color, x, y, z, scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .7 }))
    mesh.position.set(x, y, z); mesh.scale.set(...scale); mesh.castShadow = true
    accessory.add(mesh)
    return mesh
  }
  const sphere = (color, x, y, z, scale) => add(new THREE.SphereGeometry(.1, 12, 8), color, x, y, z, scale)
  if (skin.id === 'strawberry') {
    sphere('#df6485', 0, .04, 0, [1, 1.15, .8])
    for (const side of [-1, 1]) sphere('#6b9d51', side * .045, .14, 0, [.6, .22, .35])
  } else if (skin.id === 'chocolate') {
    add(new THREE.CylinderGeometry(.12, .12, .035, 16), '#d7a26b', 0, .035, 0).rotation.x = Math.PI / 2
    for (const [x, y] of [[-.04, .07], [.05, .025], [-.025, 0]]) sphere('#714738', x, y, .025, [.18, .18, .13])
  } else if (skin.id === 'matcha') {
    sphere('#608b47', -.03, .045, 0, [1.1, .26, .5]).rotation.z = -.6
    sphere('#85ad58', .05, .09, 0, [1, .26, .5]).rotation.z = .6
  } else if (skin.id === 'sky' || skin.id === 'lavender') {
    const petals = skin.id === 'sky' ? 5 : 6
    for (let i = 0; i < petals; i++) {
      const angle = i / petals * Math.PI * 2
      sphere(skin.id === 'sky' ? '#fff0a6' : '#b995de', Math.sin(angle) * .065, .07 + Math.cos(angle) * .065, 0, [.45, .45, .2])
    }
    sphere('#ffe4a2', 0, .07, .015, [.32, .32, .2])
  } else if (skin.id === 'golden') {
    add(new THREE.CylinderGeometry(.13, .12, .045, 12), '#e0b74c', 0, .035, 0)
    for (const x of [-.085, 0, .085]) add(new THREE.ConeGeometry(.045, x === 0 ? .18 : .13, 6), '#f0c952', x, .105, 0)
    sphere('#e8879e', 0, .075, .11, [.25, .25, .15])
  }
}
