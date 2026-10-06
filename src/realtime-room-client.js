import { createRoomSimulation } from './room-simulation.js'

const roomCode = () => (new URL(location.href).searchParams.get('room') || 'TEAM').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24) || 'TEAM'
const randomId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export function connectRealtimeRoom(handlers) {
  const room = roomCode(), clientId = randomId(), joinedAt = Date.now()
  let client, channel, inputChannel, subscribed = false, ready = false, stopped = false, selfId = null, hostId = '', simulation, latestState
  let offset = 0, resumeToken = '', pending = null, requestId = 0, name = handlers.name, commandSequence = 0, lastOutput = 0, lastInput = 0, lastJoin = 0, outputSequence = 0, receivedSequence = 0, members = []
  let memberKey = '', connecting = false
  const commands = [], output = new Map(), inputChannels = new Map(), peers = new Map(), lastSequences = new Map(), grassState = new Map()
  const storageKey = `hanh-tinh-co:realtime-session:${room}`
  try { resumeToken = sessionStorage.getItem(storageKey) || '' } catch {}
  const report = text => handlers.onStatus(text)
  function receive(message) {
    if (Number.isFinite(message.serverNow)) offset = message.serverNow - Date.now()
    if (message.type === 'welcome') {
      selfId = message.self.id; ready = true; resumeToken = message.resumeToken || ''
      try { sessionStorage.setItem(storageKey, resumeToken) } catch {}
      handlers.onPhase?.(message.phase); handlers.onJoin(message.self, message.resumed)
      handlers.onGrass(message.grass, true); handlers.onPlayers(message.players, selfId)
      handlers.onLeaderboard?.(message.leaderboard || [], selfId)
      if (message.lastResult) handlers.onResult?.(message.lastResult, selfId)
      enqueue({ type: 'name', name })
      report(hostId === clientId ? `Phòng ${room} · Bạn đang điều phối trận` : `Đã vào phòng ${room} online`)
    } else if (!ready) return
    else if (message.type === 'players') {
      if (message.phase) handlers.onPhase?.(message.phase)
      handlers.onPlayers(message.players, selfId); handlers.onLeaderboard?.(message.leaderboard || [], selfId)
    } else if (message.type === 'grass') handlers.onGrass(message.changes, message.reset === true)
    else if (message.type === 'bite-result' && message.requestId === pending) { pending = null; handlers.onBite(message.count, message.healed) }
    else if (message.type === 'attack') handlers.onAttack(message, selfId)
    else if (message.type === 'emote') handlers.onEmote?.(message, selfId)
    else if (message.type === 'reposition') handlers.onReposition?.(message, selfId)
    else if (message.type === 'phase') handlers.onPhase?.(message.phase)
    else if (message.type === 'round-result') handlers.onResult?.(message.result, selfId)
    else if (message.type === 'action-denied') handlers.onNotice?.(message.message)
    else if (message.type === 'jump-result' && message.accepted) handlers.onJump?.(message)
  }
  function queueOutput(to, message) {
    // Máy chủ LAN dùng ping/pong. Realtime đã có heartbeat riêng.
    if (to === clientId) { receive(message); return }
    if (message.type === 'players') { latestState = message; return }
    if (message.type === 'grass') {
      if (message.reset) grassState.clear()
      for (const change of message.changes) grassState.set(change.index, change)
    }
    const key = JSON.stringify(message)
    let entry = output.get(key)
    if (!entry) { entry = { to: new Set(), message }; output.set(key, entry) }
    entry.to.add(to)
  }
  // Tách welcome khỏi nhánh chia nhỏ để tránh gọi lại cùng kiểu message.
  function socketOutput(to, message) {
    if (message.type === 'players') latestState = message
    if (message.type !== 'welcome' || to === clientId) { queueOutput(to, message); return }
    const patches = message.grass || []
    for (const patch of patches) grassState.set(patch.index, patch)
    const head = { ...message, grass: patches.slice(0, 200) }
    const key = JSON.stringify(head)
    output.set(key, { to: new Set([to]), message: head })
    for (let i = 200; i < patches.length; i += 200) queueOutput(to, { type: 'grass', changes: patches.slice(i, i + 200), reset: false, serverNow: message.serverNow })
  }
  class VirtualSocket {
    constructor(id) { this.id = id; this.readyState = 1; this.listeners = new Map(); this.welcome = null }
    on(event, callback) { const callbacks = this.listeners.get(event) || []; callbacks.push(callback); this.listeners.set(event, callbacks) }
    emit(event, ...args) { for (const callback of this.listeners.get(event) || []) callback(...args) }
    send(encoded) { if (this.readyState !== 1) return; const message = JSON.parse(encoded); if (message.type === 'welcome') this.welcome = message; socketOutput(this.id, message) }
    ping() { this.emit('pong') }
    close() { if (this.readyState !== 1) return; this.readyState = 3; this.emit('close') }
    terminate() { this.close() }
  }
  function acceptPeer(id, token) {
    if (!members.some(member => member.clientId === id)) return
    const current = peers.get(id)
    if (current?.readyState === 1) {
      if (current.welcome) socketOutput(id, { ...current.welcome, players: latestState?.players || current.welcome.players, phase: latestState?.phase || current.welcome.phase, grass: [...grassState.values()].filter(patch => patch.regrowsAt > Date.now()), serverNow: Date.now() })
      return
    }
    const socket = new VirtualSocket(id)
    peers.set(id, socket)
    simulation.accept(socket, { url: `/game-room${token ? `?resume=${encodeURIComponent(token)}` : ''}` })
  }
  function runCommands(id, payload) {
    if (hostId !== clientId || payload?.hostId !== hostId || payload.sender !== id || !Number.isSafeInteger(payload.sequence)) return
    if (payload.sequence <= (lastSequences.get(id) || 0)) return
    lastSequences.set(id, payload.sequence)
    if (payload.join) acceptPeer(id, payload.resumeToken)
    const peer = peers.get(id)
    if (!peer || !Array.isArray(payload.commands) || payload.commands.length > 20) return
    for (const command of payload.commands) if (command && typeof command.type === 'string') peer.emit('message', JSON.stringify(command))
  }
  function stopHost() {
    simulation?.close(); simulation = null
    for (const active of inputChannels.values()) void client.removeChannel(active)
    inputChannels.clear(); peers.clear(); output.clear(); lastSequences.clear(); grassState.clear(); latestState = null
  }
  async function syncInputChannels() {
    if (hostId !== clientId) return
    const live = new Set(members.map(member => member.clientId))
    for (const [id, active] of inputChannels) if (!live.has(id)) { void client.removeChannel(active); inputChannels.delete(id); peers.get(id)?.close(); peers.delete(id) }
    for (const member of members) {
      if (member.clientId === clientId || inputChannels.has(member.clientId)) continue
      const active = client.channel(`cow-input:${room}:${member.clientId}`, { config: { private: true } })
      inputChannels.set(member.clientId, active)
      active.on('broadcast', { event: 'commands' }, ({ payload }) => runCommands(member.clientId, payload)).subscribe()
    }
  }
  function syncMembers() {
    const next = Object.values(channel.presenceState()).flat().filter(member => typeof member.clientId === 'string' && Number.isFinite(member.joinedAt))
      .sort((a, b) => a.joinedAt - b.joinedAt || a.clientId.localeCompare(b.clientId))
    const unique = [...new Map(next.map(member => [member.clientId, member])).values()]
    const nextKey = unique.map(member => member.clientId).join(',')
    if (nextKey === memberKey) return
    memberKey = nextKey; members = unique
    const nextHost = members[0]?.clientId || ''
    if (nextHost !== hostId) {
      const hadHost = Boolean(hostId)
      stopHost(); hostId = nextHost; ready = false; pending = null; receivedSequence = 0; outputSequence = 0; commands.length = 0; lastJoin = 0
      report(hadHost ? 'Đang kết nối chủ phòng mới · Bắt đầu lượt chuẩn bị mới' : 'Đang kết nối phòng online…')
      handlers.onPlayers([], null)
      if (hostId === clientId) {
        let connectionHandler
        const server = { on(event, callback) { if (event === 'connection') connectionHandler = callback }, close() {} }
        const close = createRoomSimulation(server)
        simulation = { accept: (socket, request) => connectionHandler(socket, request), close }
        acceptPeer(clientId, '')
      }
    }
    void syncInputChannels()
  }
  function enqueue(command) {
    if (!ready || stopped) return false
    if (commands.length >= 15) return false
    commands.push(command)
    if (['attack', 'jump', 'bite', 'team', 'mode'].includes(command.type)) void flushInput(true)
    return true
  }
  async function flushInput(action = false) {
    if (!subscribed || !hostId || stopped || connecting) return
    const now = Date.now(), interval = Math.max(160, Math.ceil(1000 * Math.max(1, members.length - 1) * 3 / 40))
    if (!action && now - lastInput < interval) return
    if (!ready && now - lastJoin < 1200) return
    lastInput = now
    if (!ready) lastJoin = now
    const batch = ready ? [{ type: 'pose', ...handlers.getPose() }, ...commands.splice(0, 15)] : []
    const payload = { sender: clientId, hostId, sequence: ++commandSequence, join: !ready, resumeToken, commands: batch }
    if (hostId === clientId) { runCommands(clientId, payload); return }
    connecting = true
    try {
      const result = await inputChannel.send({ type: 'broadcast', event: 'commands', payload })
      if (result !== 'ok') { if (batch.some(command => command.type === 'bite')) pending = null; report('Mất kết nối · đang nối lại phòng online…') }
    } catch { pending = null; report('Mất kết nối · đang nối lại phòng online…') }
    finally { connecting = false }
  }
  async function flushOutput() {
    if (hostId !== clientId || !subscribed || stopped) return
    const now = Date.now(), interval = Math.max(180, Math.ceil(1000 * (members.length + 1) / 32))
    if (now - lastOutput < interval) return
    lastOutput = now
    const entries = [], keys = []
    let bytes = 0
    for (const [key, entry] of output) {
      const item = { to: [...entry.to], message: entry.message }
      const size = JSON.stringify(item).length
      if (bytes + size > 60000 && entries.length) break
      if (size > 120000) { output.delete(key); continue }
      bytes += size; entries.push(item); keys.push(key)
    }
    if (!entries.length && !latestState) return
    const packet = { hostId, sequence: ++outputSequence, entries, state: latestState }
    try {
      const result = await channel.send({ type: 'broadcast', event: 'room-state', payload: packet })
      if (result === 'ok') keys.forEach(key => { if (output.get(key)?.message === entries[keys.indexOf(key)]?.message) output.delete(key) })
    } catch { /* Giữ các sự kiện để gửi lại. */ }
  }
  function applyPacket(packet) {
    if (packet?.hostId !== hostId || hostId === clientId || !Number.isSafeInteger(packet.sequence) || packet.sequence <= receivedSequence) return
    receivedSequence = packet.sequence
    if (Array.isArray(packet.entries)) for (const entry of packet.entries) if (entry.to?.includes(clientId)) receive(entry.message)
    if (packet.state) receive(packet.state)
  }
  const heartbeat = setInterval(() => { void flushInput(); void flushOutput() }, 80)
  async function initialize() {
    report('Đang kết nối phòng online…')
    try {
      client = await handlers.account.getRealtimeClient()
      channel = client.channel(`cow-room:${room}`, { config: { private: true, presence: { key: clientId }, broadcast: { self: false, ack: true } } })
      inputChannel = client.channel(`cow-input:${room}:${clientId}`, { config: { private: true, broadcast: { self: false, ack: true } } })
      inputChannel.subscribe()
      channel.on('presence', { event: 'sync' }, syncMembers).on('broadcast', { event: 'room-state' }, ({ payload }) => applyPacket(payload))
        .subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            subscribed = true
            await channel.track({ clientId, joinedAt })
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            subscribed = false; ready = false; pending = null
            report('Mất kết nối · đang kết nối lại phòng online…')
            handlers.onPlayers([], null)
          }
        })
    } catch (error) { report(error.message || 'Chưa vào được phòng online'); clearInterval(heartbeat) }
  }
  void initialize()
  window.addEventListener('pagehide', () => {
    stopped = true; clearInterval(heartbeat); stopHost()
    if (channel) void client.removeChannel(channel)
    if (inputChannel) void client.removeChannel(inputChannel)
  })
  return {
    setMode: mode => enqueue({ type: 'mode', mode }), setTeam: team => enqueue({ type: 'team', team }), emote: emote => enqueue({ type: 'emote', emote }),
    setName(value) { name = value; return enqueue({ type: 'name', name }) },
    bite(indices, mouth, radius, regrowthSeconds) {
      if (!ready || pending !== null) return false
      pending = ++requestId
      if (!enqueue({ type: 'bite', requestId: pending, indices, mouth, radius, regrowthSeconds })) { pending = null; return false }
      return true
    },
    attack: () => enqueue({ type: 'attack' }), jump: () => enqueue({ type: 'jump' }),
    get connected() { return ready && subscribed }, get now() { return Date.now() + offset },
  }
}