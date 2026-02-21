import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  console.log('client connected:', socket.id)
  socket.on('disconnect', () => console.log('client disconnected:', socket.id))
})

httpServer.listen(3001, () => console.log('server running on port 3001'))
