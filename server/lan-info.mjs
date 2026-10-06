import { networkInterfaces } from 'node:os'

export function lanUrl(port) {
  const addresses = Object.values(networkInterfaces()).flat().filter(address => address && address.family === 'IPv4' && !address.internal)
  const local = addresses.find(address => address.address.startsWith('192.168.')) || addresses.find(address => address.address.startsWith('10.')) || addresses[0]
  return `http://${local?.address || 'localhost'}:${port}`
}
