import { defineConfig } from 'vite'
import { createRoomServer } from './server/room-server.mjs'
import { lanUrl } from './server/lan-info.mjs'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [{
    name: 'cow-team-room',
    configureServer(server) {
      if (!server.httpServer) return
      const closeRoom = createRoomServer(server.httpServer)
      server.httpServer.once('close', closeRoom)
      server.middlewares.use('/room-info', (request, response) => {
        const port = server.httpServer.address()?.port || 5173
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ lanUrl: lanUrl(port) }))
      })
    },
  }],
})

