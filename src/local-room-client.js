import { createRoomSimulation } from './room-simulation.js'
import { connectRoom as connectLAN } from './lan-room-client.js'

export function connectLocalRoom(handlers) {
  let accept
  const server = { on(event, callback) { if (event === 'connection') accept = callback }, close() {} }
  const closeSimulation = createRoomSimulation(server)
  const clientEvents = new Map(), serverEvents = new Map()
  const emit = (map, event, value) => { for (const callback of map.get(event) || []) callback(value) }
  const listen = (map, event, callback) => { const callbacks = map.get(event) || []; callbacks.push(callback); map.set(event, callbacks) }
  const socket = {
    readyState: 0,
    addEventListener: (event, callback) => listen(clientEvents, event, callback),
    send: encoded => emit(serverEvents, 'message', encoded),
    close() { if (this.readyState !== 1) return; this.readyState = 3; endpoint.readyState = 3; emit(serverEvents, 'close'); emit(clientEvents, 'close', { code: 1000 }) },
  }
  const endpoint = {
    readyState: 1,
    on: (event, callback) => listen(serverEvents, event, callback),
    send: data => queueMicrotask(() => { if (socket.readyState === 1) emit(clientEvents, 'message', { data }) }),
    ping: () => emit(serverEvents, 'pong'), close: () => socket.close(), terminate: () => socket.close(),
  }
  const result = connectLAN({ ...handlers, onStatus: () => handlers.onStatus('Đang chơi một mình · Phòng online chưa được bật'), createSocket: url => {
    queueMicrotask(() => { socket.readyState = 1; emit(clientEvents, 'open', {}); accept(endpoint, { url: new URL(url).pathname }) })
    return socket
  } })
  window.addEventListener('pagehide', closeSimulation)
  return result
}