export function connectRoom(handlers) {
  let socket
  let selfId = null
  let ready = false
  let reconnectTimer
  let stopped = false
  let requestId = 0
  let pending = null
  let name = handlers.name
  let timeOffset = 0
  let resumeToken = ''
  try { resumeToken = sessionStorage.getItem('hanh-tinh-co:room-session') || '' } catch {}
  const send = (message) => {
    if (socket?.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(message))
    return true
  }
  const connect = () => {
    if (stopped) return
    handlers.onStatus('Đang kết nối phòng chung…')
    socket = (handlers.createSocket || (url => new WebSocket(url)))(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/game-room${resumeToken ? `?resume=${encodeURIComponent(resumeToken)}` : ''}`)
    socket.addEventListener('message', event => {
      let message
      try { message = JSON.parse(event.data) } catch { return }
      if (Number.isFinite(message.serverNow)) timeOffset = message.serverNow - Date.now()
      if (message.type === 'welcome') {
        resumeToken = message.resumeToken || ''
        try { sessionStorage.setItem('hanh-tinh-co:room-session', resumeToken) } catch {}
        selfId = message.self.id
        ready = true
        handlers.onPhase?.(message.phase)
        handlers.onJoin(message.self, message.resumed)
        handlers.onGrass(message.grass, true)
        handlers.onPlayers(message.players, selfId)
        handlers.onLeaderboard?.(message.leaderboard || [], selfId)
        if (message.lastResult) handlers.onResult?.(message.lastResult, selfId)
        send({ type: 'name', name })
        handlers.onStatus(message.resumed ? 'Đã trở lại · Giữ máu và điểm' : 'Đã vào phòng LAN')
      } else if (message.type === 'players') {
        if (message.phase) handlers.onPhase?.(message.phase)
        handlers.onPlayers(message.players, selfId)
        handlers.onLeaderboard?.(message.leaderboard || [], selfId)
      } else if (message.type === 'grass') {
        handlers.onGrass(message.changes, message.reset === true)
      } else if (message.type === 'bite-result' && message.requestId === pending) {
        pending = null
        handlers.onBite(message.count, message.healed)
      } else if (message.type === 'attack') {
        handlers.onAttack(message, selfId)
      } else if (message.type === 'emote') {
        handlers.onEmote?.(message, selfId)
      } else if (message.type === 'reposition') {
        handlers.onReposition?.(message, selfId)
      } else if (message.type === 'phase') {
        handlers.onPhase?.(message.phase)
      } else if (message.type === 'round-result') {
        handlers.onResult?.(message.result, selfId)
      } else if (message.type === 'action-denied') {
        handlers.onNotice?.(message.message)
      } else if (message.type === 'jump-result' && message.accepted) {
        handlers.onJump?.(message)
      }
    })
    socket.addEventListener('close', event => {
      ready = false
      pending = null
      if (event.code === 4000) stopped = true
      handlers.onStatus(stopped ? 'Chú bò đang mở ở trang khác' : 'Mất kết nối · đang kết nối lại…')
      handlers.onPlayers([], null)
      if (!stopped) reconnectTimer = setTimeout(connect, 1500)
    })
    socket.addEventListener('error', () => { socket.close() })
  }
  const poseTimer = setInterval(() => {
    if (ready) send({ type: 'pose', ...handlers.getPose() })
  }, 100)
  connect()
  window.addEventListener('pagehide', () => {
    stopped = true
    clearInterval(poseTimer)
    clearTimeout(reconnectTimer)
    socket?.close()
  })
  return {
    setMode(mode) { return ready && send({ type: 'mode', mode }) },
    setTeam(team) { return ready && send({ type: 'team', team }) },
    emote(emote) { return ready && send({ type: 'emote', emote }) },
    setName(value) {
      name = value
      if (ready) send({ type: 'name', name })
    },
    bite(indices, mouth, radius, regrowthSeconds) {
      if (!ready || pending !== null) return false
      pending = ++requestId
      send({ type: 'pose', ...handlers.getPose() })
      send({ type: 'bite', requestId: pending, indices, mouth, radius, regrowthSeconds })
      return true
    },
    attack() {
      if (!ready) return false
      send({ type: 'pose', ...handlers.getPose() })
      return send({ type: 'attack' })
    },
    jump() {
      if (!ready) return false
      send({ type: 'pose', ...handlers.getPose() })
      return send({ type: 'jump' })
    },
    get connected() { return ready },
    get now() { return Date.now() + timeOffset },
  }
}
