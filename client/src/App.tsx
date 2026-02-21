import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import type { GameState, LobbyState } from 'shared'
import GameCanvas from './GameCanvas'
import Lobby from './Lobby'
import type { GameSocket } from './socket'

export default function App() {
  const socket = useMemo(() => io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001') as GameSocket, [])
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<GameState['phase']>('lobby')
  const [players, setPlayers] = useState<LobbyState['players']>([])

  useEffect(() => {
    const onLobbyState = (state: LobbyState) => setPlayers(state.players)
    const onGameState = (state: GameState) => setPhase(state.phase)

    socket.on('lobbyState', onLobbyState)
    socket.on('gameState', onGameState)

    return () => {
      socket.off('lobbyState', onLobbyState)
      socket.off('gameState', onGameState)
      socket.disconnect()
    }
  }, [socket])

  const joinGame = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    socket.emit('joinGame', trimmed)
  }

  const startGame = () => {
    socket.emit('startGame')
  }

  if (phase === 'playing') {
    return <GameCanvas socket={socket} />
  }

  return (
    <Lobby
      name={name}
      players={players}
      onNameChange={setName}
      onJoin={joinGame}
      onStart={startGame}
    />
  )
}
