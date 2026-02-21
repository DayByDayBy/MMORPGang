interface LobbyPlayer {
  id: string
  name: string
}

interface LobbyProps {
  name: string
  players: LobbyPlayer[]
  onNameChange: (name: string) => void
  onJoin: () => void
  onStart: () => void
}

export default function Lobby({
  name,
  players,
  onNameChange,
  onJoin,
  onStart,
}: LobbyProps) {
  const trimmed = name.trim()

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ margin: 0, marginBottom: 16 }}>MMORPGang</h1>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your name"
            style={{ flex: 1, padding: '10px 12px' }}
          />
          <button onClick={onJoin} disabled={!trimmed}>
            Join
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Players ({players.length})</strong>
          <button onClick={onStart} disabled={players.length < 2}>
            Start Game
          </button>
        </div>

        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
