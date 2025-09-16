import { useEffect, useState } from 'react'

type Puzzle = { seed: string; board: string }

function cellKey(i: number) {
  const r = Math.floor(i / 9), c = i % 9
  return `${r}-${c}`
}

export default function App() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [board, setBoard] = useState<string>('0'.repeat(81))

  useEffect(() => {
    fetch('/api/puzzle')
      .then(r => r.json())
      .then((p: Puzzle) => { setPuzzle(p); setBoard(p.board) })
      .catch(console.error)
  }, [])

  const handleInput = (i: number, val: string) => {
    const d = val.replace(/[^0-9]/g, '')
    const v = d === '' ? '0' : d[0]
    setBoard(b => b.slice(0, i) + v + b.slice(i + 1))
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Sudoko</h1>
      <div className="grid grid-cols-9 border-2 border-black">
        {Array.from({ length: 81 }).map((_, i) => (
          <input
            key={cellKey(i)}
            value={board[i] === '0' ? '' : board[i]}
            onChange={e => handleInput(i, e.target.value)}
            maxLength={1}
            className="w-10 h-10 text-center border outline-none [appearance:textfield]"
          />
        ))}
      </div>
      <pre className="bg-gray-100 p-3 rounded">Seed: {puzzle?.seed}</pre>
    </div>
  )
}
