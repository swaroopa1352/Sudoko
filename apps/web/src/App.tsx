import { useEffect, useState } from 'react'

type Puzzle = { seed: string; board: string; solved: string }
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type LBEntry = { id: string; seed: string; difficulty: string; seconds: number; hintsUsed: number; createdAt: string };

function cellKey(i: number) {
  const r = Math.floor(i / 9), c = i % 9
  return `${r}-${c}`
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [board, setBoard] = useState<string>('0'.repeat(81))
  const [givens, setGivens] = useState<boolean[]>(Array(81).fill(false))
  const [status, setStatus] = useState<string>('idle')
  const [showMistakes, setShowMistakes] = useState(false)
  const MAX_HINTS = 3;
  const [hintsLeft, setHintsLeft] = useState<number>(MAX_HINTS);
  //submitScoreIfComplete(seconds, MAX_HINTS - hintsLeft);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function loadPuzzle(diff: Difficulty) {
    try {
      setStatus(`loading ${diff}…`)
      const res = await fetch(`/api/puzzle?difficulty=${diff}`)
      const p: Puzzle = await res.json()
      setPuzzle(p)
      setBoard(p.board)
      setGivens(Array.from(p.board).map(ch => ch !== '0'))
      setSubmitted(false);
      await loadLeaderboard(diff);
      setSeconds(0);          
      setRunning(false);
      setHasStarted(false);
      setHintsLeft(MAX_HINTS) 
      setStatus(`loaded seed=${p.seed}`)
    } catch (e) {
      console.error(e)
      setStatus('error fetching puzzle')
    }
  }

  async function loadLeaderboard(diff: Difficulty) {
    const res = await fetch(`/api/leaderboard/${diff}?limit=10`);
    const data = await res.json();
    setLeaderboard(data.entries ?? []);
  }

  async function submitScoreIfComplete(seconds: number, hintsUsed: number) {
    if (!puzzle || submitted) return;
    // only submit when solved
    if (board !== puzzle.solved) return;
    const payload = {
      seed: puzzle.seed,
      difficulty,
      seconds,
      hintsUsed
    };
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setSubmitted(true);
      await loadLeaderboard(difficulty);
    }
  }


  useEffect(() => {
    loadPuzzle(difficulty).catch(console.error)
  }, [difficulty])

  // 🔒 Persist / Restore progress per seed
  useEffect(() => {
    if (!puzzle) return
    const saved = localStorage.getItem(`sudoko:${puzzle.seed}`)
    if (saved && saved.length === 81) setBoard(saved)
  }, [puzzle?.seed])

  useEffect(() => {
    if (!puzzle) return
    localStorage.setItem(`sudoko:${puzzle.seed}`, board)
  }, [board, puzzle?.seed])

  useEffect(() => {
    if (!puzzle) return;
    const solved = board === puzzle.solved;
    if (solved) {
      setRunning(false);                          // stop the timer
      submitScoreIfComplete(seconds, MAX_HINTS - hintsLeft); // use real hints state
    }
  }, [board, puzzle?.solved, seconds, hintsLeft]);



  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // load saved seconds for this seed
  useEffect(() => {
    if (!puzzle) return;
    const saved = Number(localStorage.getItem(`sudoko:${puzzle.seed}:seconds`) || '0');
    if (!Number.isNaN(saved)) setSeconds(saved);
  }, [puzzle?.seed]);

  // save on change
  useEffect(() => {
    if (!puzzle) return;
    localStorage.setItem(`sudoko:${puzzle.seed}:seconds`, String(seconds));
  }, [seconds, puzzle?.seed]);

  const handleInput = (i: number, val: string) => {
    if (!hasStarted) { setHasStarted(true); setRunning(true); }
    if (givens[i]) return
    const d = val.replace(/[^1-9]/g, '')
    const v = d === '' ? '0' : d[0]
    setBoard(b => b.slice(0, i) + v + b.slice(i + 1))
  }

  const reset = () => {
    if (!puzzle) return;
    setBoard(puzzle.board);
    setSeconds(0);
    setRunning(false);
    setHasStarted(false);
    setHintsLeft(MAX_HINTS);          
  }

  const checkSolution = () => {
    if (!puzzle) return
    const ok = board === puzzle.solved
    alert(ok ? '✅ Correct solution!' : '❌ Not correct yet. Keep going!')
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${m}:${String(ss).padStart(2, '0')}`;
  };

  const giveHint = () => {
    if (!puzzle) return
    if (hintsLeft <= 0) {
      alert('No hints left (max 3 per puzzle).')
      return
    }
    const i = board.indexOf('0')
    if (i === -1) { alert('Board already full!'); return }
    const next = board.slice(0, i) + puzzle.solved[i] + board.slice(i + 1)
    setBoard(next)
    setHintsLeft(h => h - 1)
  }

  const isConflict = (i: number): boolean => {
    const r = Math.floor(i / 9), c = i % 9
    const v = board[i]
    if (v === '0') return false
    for (let cc = 0; cc < 9; cc++) {
      const j = r * 9 + cc
      if (j !== i && board[j] === v) return true
    }
    for (let rr = 0; rr < 9; rr++) {
      const j = rr * 9 + c
      if (j !== i && board[j] === v) return true
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        const j = rr * 9 + cc
        if (j !== i && board[j] === v) return true
      }
    }
    return false
  }

  const complete = board.indexOf('0') === -1

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Sudoko</h1>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Difficulty</label>
        <select
          value={difficulty}
          onChange={e => setDifficulty(e.target.value as Difficulty)}
          className="border rounded px-2 py-1"
        >
          <option>easy</option>
          <option>medium</option>
          <option>hard</option>
          <option>expert</option>
        </select>
        <button onClick={() => loadPuzzle(difficulty)} className="border px-3 py-1 rounded hover:bg-gray-100">
          New puzzle
        </button>
        <button onClick={reset} className="border px-3 py-1 rounded hover:bg-gray-100">
          Reset
        </button>
        <button onClick={checkSolution} className="border px-3 py-1 rounded hover:bg-gray-100">
          Check solution
        </button>
        {/* Timer UI */}
        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm">Time:</span>
          <span className="font-mono">{formatTime(seconds)}</span>

          <button
            onClick={() => setRunning(r => !r)}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            {running ? 'Pause' : (hasStarted ? 'Resume' : 'Start')}
          </button>

          <button
            onClick={() => { setSeconds(0); setRunning(false); setHasStarted(false); }}
            className="border px-3 py-1 rounded hover:bg-gray-100"
          >
            Reset time
          </button>
        </div>
        <button onClick={giveHint} disabled={hintsLeft <= 0} 
          className= {
            "border px-3 py-1 rounded hover:bg-gray-100" + 
            (hintsLeft <= 0 ? "opacity-50 cursor-not-allowed" : "") 
          }
        >
          Hint
        </button>
        <span className="text-sm text-gray-600">Hints left: {hintsLeft}</span>
        <label className="ml-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showMistakes}
            onChange={e => setShowMistakes(e.target.checked)}
          />
          Show mistakes
        </label>
      </div>

      {/* Status */}
      <div className="text-sm text-gray-600">
        {status} {puzzle && <>• seed: <span className="font-mono">{puzzle.seed}</span></>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-9 gap-[2px] p-1 bg-black/10">
        {Array.from({ length: 81 }).map((_, i) => {
          const value = board[i] === '0' ? '' : board[i]
          const given = givens[i]
          const conflict = isConflict(i)

          // NEW: mistake highlighting when toggle is on
          const mistake =
            showMistakes &&
            !given &&
            board[i] !== '0' &&
            puzzle &&
            board[i] !== puzzle.solved[i]

          const r = Math.floor(i / 9), c = i % 9
          const th = (r % 3 === 0 ? ' border-t-2' : '') + (c % 3 === 0 ? ' border-l-2' : '')
          const tb = (r % 3 === 2 ? ' border-b-2' : '') + (c % 3 === 2 ? ' border-r-2' : '')

          return (
            <input
              key={cellKey(i)}
              value={value}
              onChange={e => handleInput(i, e.target.value)}
              maxLength={1}
              disabled={given}
              inputMode="numeric"
              pattern="[0-9]*"
              className={
                "w-10 h-10 text-center border " +
                th + tb +
                (given ? " bg-gray-200 font-semibold" : " bg-white") +
                (conflict ? " text-red-600 border-red-500" : "") +
                (mistake ? " bg-rose-100 border-rose-400" : "")
              }
            />
          )
        })}
      </div>
      
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Top Times — {difficulty}</h2>
        <div className="border rounded">
          <div className="grid grid-cols-4 text-xs font-medium bg-gray-100 px-2 py-1">
            <div>#</div><div>Time</div><div>Hints</div><div>Date</div>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-sm text-gray-500 px-2 py-2">No entries yet.</div>
          ) : leaderboard.map((e, idx) => (
            <div key={e.id} className="grid grid-cols-4 text-sm px-2 py-1 border-t">
              <div>{idx + 1}</div>
              <div className="font-mono">
                {Math.floor(e.seconds/60)}:{String(e.seconds%60).padStart(2,'0')}
              </div>
              <div>{e.hintsUsed}</div>
              <div className="text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {complete ? <span className="text-green-700 font-semibold">Complete!</span> : 'Keep going…'}
      </div>
    </div>
  )
}

