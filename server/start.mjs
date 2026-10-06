import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRoomServer } from './room-server.mjs'
import { lanUrl } from './lan-info.mjs'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || '0.0.0.0'
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/room-info') {
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ lanUrl: lanUrl(server.address().port) }))
      return
    }
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
    const path = resolve(root, relative)
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403); response.end(); return }
    const info = await stat(path)
    if (!info.isFile()) { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream')
    createReadStream(path).on('error', () => response.destroy()).pipe(response)
  } catch {
    response.writeHead(404)
    response.end('Không tìm thấy trang')
  }
})
createRoomServer(server)
server.on('upgrade', (request, socket) => {
  if (request.url?.split('?')[0] !== '/game-room') socket.destroy()
})
server.on('error', error => { console.error(error.message); process.exitCode = 1 })
server.listen(port, host, () => {
  const activePort = server.address().port
  console.log(`Phòng chung đang chạy: ${host === '127.0.0.1' ? `http://127.0.0.1:${activePort}` : lanUrl(activePort)}`)
})
