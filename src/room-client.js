import { connectRoom as connectLAN } from './lan-room-client.js'
import { connectRealtimeRoom } from './realtime-room-client.js'
import { connectLocalRoom } from './local-room-client.js'

export function connectRoom(handlers) {
  const transport = import.meta.env.VITE_ROOM_TRANSPORT
  if (transport === 'lan') return connectLAN(handlers)
  if (handlers.account.configured) return connectRealtimeRoom(handlers)
  if (transport === 'local' || (import.meta.env.PROD && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname))) return connectLocalRoom(handlers)
  return connectLAN(handlers)
}
