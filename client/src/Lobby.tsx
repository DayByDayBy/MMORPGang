interface LobbyPlayer {
  id: string
  name: string
  joined: boolean
}

interface LobbyProps {
  name: string
  players: LobbyPlayer[]
  isHost: boolean
  hostId: string | null
  onNameChange: (name: string) => void
  onJoin: () => void
  onStart: () => void
}

const CYAN = '#00e5ff'
const BG   = '#03020a'
const SURFACE = '#0d0b18'
const MUTED = '#4a4760'
const TEXT = '#e0dff5'

const dotStyle = (joined: boolean): React.CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: joined ? CYAN : MUTED,
  flexShrink: 0,
})

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: BG,
    fontFamily: '"JetBrains Mono", "Fira Mono", "Courier New", monospace',
    color: TEXT,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
  },
  title: {
    margin: 0,
    marginBottom: 32,
    fontSize: 28,
    letterSpacing: '0.12em',
    color: CYAN,
    textTransform: 'uppercase' as const,
  },
  row: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: SURFACE,
    border: `1px solid ${MUTED}`,
    borderRadius: 4,
    color: TEXT,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  },
  btn: {
    padding: '10px 18px',
    background: 'transparent',
    border: `1px solid ${CYAN}`,
    borderRadius: 4,
    color: CYAN,
    fontFamily: 'inherit',
    fontSize: 13,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
  },
  btnDisabled: {
    padding: '10px 18px',
    background: 'transparent',
    border: `1px solid ${MUTED}`,
    borderRadius: 4,
    color: MUTED,
    fontFamily: 'inherit',
    fontSize: 13,
    letterSpacing: '0.08em',
    cursor: 'not-allowed',
    textTransform: 'uppercase' as const,
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: '0.14em',
    color: MUTED,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
  playerList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    marginBottom: 24,
  },
  playerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    borderBottom: `1px solid ${SURFACE}`,
    fontSize: 14,
  },
  hostBadge: {
    fontSize: 10,
    letterSpacing: '0.1em',
    color: CYAN,
    border: `1px solid ${CYAN}`,
    borderRadius: 3,
    padding: '1px 5px',
    textTransform: 'uppercase' as const,
  },
  waiting: {
    fontSize: 12,
    color: MUTED,
    letterSpacing: '0.08em',
    marginTop: 8,
  },
}

export default function Lobby({
  name,
  players,
  isHost,
  hostId,
  onNameChange,
  onJoin,
  onStart,
}: LobbyProps) {
  const trimmed = name.trim()
  const joinedCount = players.filter(p => p.joined).length
  const canStart = joinedCount >= 2

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>MMORPGang</h1>

        <div style={styles.row}>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && trimmed && onJoin()}
            placeholder="enter your name"
            style={styles.input}
          />
          <button
            onClick={onJoin}
            disabled={!trimmed}
            style={trimmed ? styles.btn : styles.btnDisabled}
          >
            Join
          </button>
        </div>

        <div style={styles.sectionLabel}>Players ({players.length})</div>

        <ul style={styles.playerList}>
          {players.map((p) => (
            <li key={p.id} style={styles.playerItem}>
              <span style={dotStyle(p.joined)} />
              <span style={{ flex: 1 }}>{p.name}</span>
              {p.id === hostId && (
                <span style={styles.hostBadge}>host</span>
              )}
            </li>
          ))}
        </ul>

        {isHost ? (
          <div>
            <button
              onClick={onStart}
              disabled={!canStart}
              style={canStart ? styles.btn : styles.btnDisabled}
            >
              Start Game
            </button>
            {!canStart && (
              <p style={styles.waiting}>waiting for {2 - joinedCount} more player{2 - joinedCount !== 1 ? 's' : ''} to join…</p>
            )}
          </div>
        ) : (
          <p style={styles.waiting}>
            {joinedCount < 2
              ? `waiting for players… (${joinedCount}/2 joined)`
              : 'waiting for host to start…'}
          </p>
        )}
      </div>
    </div>
  )
}
