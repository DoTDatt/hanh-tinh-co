import * as THREE from 'three'

// Trang trí và hiệu ứng chỉ dùng để hiển thị; luật chơi do máy chủ xử lý.
export function createWorldVisuals(scene, { radius, reduceMotion = false }) {
  let seed = 7102026
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const group = new THREE.Group()
  scene.add(group)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(75, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vPosition;
      void main(){
        vec3 ray=normalize(vPosition);
        float h=ray.y;
        vec3 color=mix(vec3(.97,.93,.79),vec3(.57,.81,.89),smoothstep(-.6,.85,h));
        float sun=max(dot(ray,normalize(vec3(-.53,.7,.47))),0.);
        float halo=pow(sun,18.);
        float disk=smoothstep(.992,.996,sun);
        color=mix(color,vec3(1.,.9,.69),halo*.35);
        color=mix(color,vec3(1.,.99,.88),disk*.8);
        gl_FragColor=vec4(color,1.);
      }`,
  }))
  sky.renderOrder = -10
  group.add(sky)
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius + .15, 64, 40), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: { tint: { value: new THREE.Color('#aee6dd') } },
    vertexShader: 'varying vec3 vNormal; varying vec3 vWorld; void main(){vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader: 'uniform vec3 tint; varying vec3 vNormal; varying vec3 vWorld; void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),2.5);gl_FragColor=vec4(tint,rim*.42);}',
  }))
  group.add(atmosphere)
  const clouds = new THREE.Group()
  group.add(clouds)
  const cloudGeometry = new THREE.SphereGeometry(1, 12, 8)
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, fog: false })
  for (let index = 0; index < 12; index++) {
    const angle = index * Math.PI * 2 / 12
    const cloud = new THREE.Group()
    cloud.position.set(Math.cos(angle) * 25, 3 + random() * 11, Math.sin(angle) * 25)
    for (let puff = 0; puff < 5; puff++) {
      const mesh = new THREE.Mesh(cloudGeometry, cloudMaterial)
      mesh.position.set((puff - 2) * .75, Math.sin(puff * 1.7) * .2, random() * .35)
      mesh.scale.set(.85 + random() * .6, .38 + random() * .35, .55 + random() * .4)
      cloud.add(mesh)
    }
    clouds.add(cloud)
  }
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3()
  const position = new THREE.Vector3()
  const rotation = new THREE.Quaternion()
  const color = new THREE.Color()
  const makeInstances = (geometry, count, material) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const matte = hex => new THREE.MeshStandardMaterial({ color: hex, roughness: .92 })
  const stems = makeInstances(new THREE.CylinderGeometry(.014, .02, 1, 5), 140, matte('#649846'))
  const petals = makeInstances(new THREE.SphereGeometry(1, 6, 4), 140 * 5, matte('#ffffff'))
  const centers = makeInstances(new THREE.SphereGeometry(1, 6, 4), 140, matte('#e3b346'))
  const rocks = makeInstances(new THREE.IcosahedronGeometry(1, 0), 65, matte('#aab6a0'))
  const caps = makeInstances(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 28, matte('#df9b75'))
  const stalks = makeInstances(new THREE.CylinderGeometry(.027, .039, 1, 6), 28, matte('#faf0cb'))
  const setInstance = (mesh, index, local, scale) => {
    dummy.position.copy(local).applyQuaternion(rotation).add(position)
    dummy.quaternion.copy(rotation)
    dummy.scale.copy(scale)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  }
  const local = new THREE.Vector3(), scale = new THREE.Vector3()
  for (let index = 0; index < 140; index++) {
    const y = 1 - 2 * (index + .5) / 140, angle = index * Math.PI * (3 - Math.sqrt(5))
    normal.set(Math.cos(angle) * Math.sqrt(1 - y * y), y, Math.sin(angle) * Math.sqrt(1 - y * y))
    rotation.setFromUnitVectors(up, normal)
    position.copy(normal).multiplyScalar(radius)
    const height = .17 + random() * .1
    setInstance(stems, index, local.set(0, height / 2, 0), scale.set(1, height, 1))
    const tint = ['#fff4d1', '#efd0bb', '#d5c8eb', '#f2dd8c'][index % 4]
    color.set(tint)
    for (let petal = 0; petal < 5; petal++) {
      const a = petal * Math.PI * 2 / 5
      setInstance(petals, index * 5 + petal, local.set(Math.cos(a) * .044, height, Math.sin(a) * .044), scale.set(.047, .015, .047))
      petals.setColorAt(index * 5 + petal, color)
    }
    setInstance(centers, index, local.set(0, height + .013, 0), scale.set(.026, .014, .026))
    if (index < 65) {
      setInstance(rocks, index, local.set(.32, .035, -.24), scale.set(.08 + random() * .07, .05 + random() * .035, .08 + random() * .07))
    }
    if (index < 28) {
      setInstance(stalks, index, local.set(-.26, .065, .14), scale.set(1, .13, 1))
      setInstance(caps, index, local.set(-.26, .12, .14), scale.set(.095, .055, .095))
    }
  }
  for (const mesh of [stems, petals, centers, rocks, caps, stalks]) mesh.computeBoundingSphere()

  // Pool cố định để hiệu ứng không tạo thêm mesh mỗi lần ăn hoặc húc.
  const particles = makeInstances(new THREE.OctahedronGeometry(1, 0), 128, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .7, emissive: '#a38e54', emissiveIntensity: .12 }))
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  particles.frustumCulled = false
  const pool = Array.from({ length: 128 }, () => ({ life: 0, duration: 1, size: .04, position: new THREE.Vector3(), velocity: new THREE.Vector3(), normal: new THREE.Vector3() }))
  let cursor = 0
  dummy.scale.setScalar(0); dummy.updateMatrix()
  pool.forEach((_, index) => particles.setMatrixAt(index, dummy.matrix))
  const tangent = new THREE.Vector3(), sideways = new THREE.Vector3()
  const palette = { eat: '#c0d963', jump: '#f4e1b2', attack: '#efc967', hit: '#ee9f72' }
  return {
    setCombat(enabled) { atmosphere.material.uniforms.tint.value.set(enabled ? '#f3c994' : '#aee6dd') },
    emit(kind, surfaceNormal, heading = null, amount = 1) {
      if (reduceMotion) return
      tangent.copy(heading || new THREE.Vector3(1, 0, 0)).projectOnPlane(surfaceNormal)
      if (tangent.lengthSq() < .01) tangent.set(0, 0, 1).projectOnPlane(surfaceNormal)
      tangent.normalize(); sideways.crossVectors(surfaceNormal, tangent).normalize()
      const count = Math.min(18, Math.max(6, Math.round(8 + amount * .1)))
      for (let i = 0; i < count; i++) {
        const index = cursor++ % pool.length, particle = pool[index]
        particle.normal.copy(surfaceNormal)
        particle.position.copy(surfaceNormal).multiplyScalar(radius + (kind === 'hit' ? .7 : .12)).addScaledVector(tangent, kind === 'attack' ? .6 : 0)
        particle.velocity.copy(surfaceNormal).multiplyScalar(.4 + random() * 1.4)
          .addScaledVector(tangent, (random() - .4) * 1.7).addScaledVector(sideways, (random() - .5) * 1.7)
        particle.life = particle.duration = .45 + random() * .5
        particle.size = .025 + random() * .035
        color.set(palette[kind] || palette.eat)
        particles.setColorAt(index, color)
      }
      particles.instanceColor.needsUpdate = true
    },
    update(elapsed, delta) {
      if (!reduceMotion) clouds.rotation.y = elapsed * .009
      pool.forEach((particle, index) => {
        particle.life = Math.max(0, particle.life - delta)
        if (particle.life > 0) {
          particle.velocity.addScaledVector(particle.normal, -2.8 * delta)
          particle.position.addScaledVector(particle.velocity, delta)
          dummy.position.copy(particle.position)
          dummy.rotation.set(elapsed * 2 + index, elapsed + index, elapsed * 3)
          dummy.scale.setScalar(particle.size * Math.min(1, particle.life / .25))
        } else dummy.scale.setScalar(0)
        dummy.updateMatrix(); particles.setMatrixAt(index, dummy.matrix)
      })
      particles.instanceMatrix.needsUpdate = true
    },
  }
}
