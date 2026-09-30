// Load the JavaScript config directly to support restricted Windows environments.
import { build, createServer, preview } from 'vite'
import config from '../vite.config.js'

const options = { ...config, configFile: false }
const command = process.argv[2] || 'dev'

if (command === 'build') {
  await build({ ...options, build: { ...config.build, emptyOutDir: true } })
} else if (command === 'preview') {
  const server = await preview(options)
  server.printUrls()
} else {
  const server = await createServer(options)
  await server.listen()
  server.printUrls()
}
