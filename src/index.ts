import { app } from './app'
import { logger } from './logger'
import { mongodb } from './mongodb'
import { redis } from './redis'

const port = app.get('port')
const host = app.get('host')

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: Promise ', p, reason)
})

async function start() {
  await mongodb(app)
  await redis(app)

  const server = await app.listen(port)
  logger.info(`Feathers app listening on http://${host}:${port}`)
}

start()
