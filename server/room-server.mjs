import { WebSocketServer } from 'ws'
import { createRoomSimulation } from '../src/room-simulation.js'
export { healingFromGrass } from '../src/room-simulation.js'

export function createRoomServer(httpServer, options = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 })
  const close = createRoomSimulation(wss, options)
  const upgrade = (request, socket, head) => {
    if (request.url?.split('?')[0] !== '/game-room') return
    wss.handleUpgrade(request, socket, head, client => wss.emit('connection', client, request))
  }
  httpServer.on('upgrade', upgrade)
  return () => { httpServer.off('upgrade', upgrade); close() }
}