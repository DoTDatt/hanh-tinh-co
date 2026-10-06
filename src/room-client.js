import { connectRoom as connectLAN } from './lan-room-client.js'
import { connectRealtimeRoom } from './realtime-room-client.js'
import { connectLocalRoom } from './local-room-client.js'
export function connectRoom(handlers) {
  if (handlers.account.configured && import.meta.env.VITE_ROOM_TRANSPORT !== 'lan') return connectRealtimeRoom(handlers)
  if (import.meta.env.VITE_ROOM_TRANSPORT === 'local' || (import.meta.env.PROD && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname))) return connectLocalRoom(handlers)
  return connectLAN(handlers)
}