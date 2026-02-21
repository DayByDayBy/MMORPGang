import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { mmorpong } from 'shared'
import GameCanvas from './GameCanvas'
import Lobby from './Lobby'
import type { GameSocket } from './socket'

interface MMOGameProps {
  onExit: () => void
}

export function MMOGame({ onExit }: MMOGameProps) {
  const socket = useMemo(() => io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001') as GameSocket, [])
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<mmorpong.GameState['phase']>('lobby')
  const [players, setPlayers] = useState<mmorpong.LobbyState['players']>([])
  const [hostId, setHostId] = useState<string | null>(null)

  useEffect(() => {
    const onLobbyState = (state: mmorpong.LobbyState) => {
      setPlayers(state.players)
      setHostId(state.hostId)
    }
    const onGameState = (state: mmorpong.GameState) => setPhase(state.phase)

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
      isHost={hostId === socket.id}
      hostId={hostId}
      onNameChange={setName}
      onJoin={joinGame}
      onStart={startGame}
      onExit={onExit}
    />
  )
}