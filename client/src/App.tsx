import { useState } from 'react'
import { MMOGame } from './games/MMO/MMOGame'

type Mode = 'select' | 'mmo' | 'rpg'

export default function App() {
  const [mode, setMode] = useState<Mode>('select')

  if (mode === 'mmo') return <MMOGame onExit={() => setMode('select')} />
  if (mode === 'rpg') return <div>RPG mode coming soon</div>

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#03020a',
      fontFamily: '"JetBrains Mono", "Fira Mono", "Courier New", monospace',
      color: '#e0dff5',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#00ffe7', letterSpacing: '0.12em', marginBottom: 48 }}>MMORPGang</h1>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => setMode('mmo')} style={btnStyle}>MMO</button>
          <button onClick={() => setMode('rpg')} style={btnStyle}>RPG</button>
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '16px 48px',
  background: 'transparent',
  border: '1px solid #00ffe7',
  color: '#00ffe7',
  fontFamily: 'inherit',
  fontSize: 16,
  letterSpacing: '0.1em',
  cursor: 'pointer',
}