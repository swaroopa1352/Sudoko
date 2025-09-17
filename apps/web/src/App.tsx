import { useEffect, useState, useRef} from 'react'

type Puzzle = { seed: string; board: string; solved: string }
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type LBEntry = { id: string; seed: string; difficulty: string; seconds: number; hintsUsed: number; createdAt: string };
type Me = { email: string } | null;

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
  const [selected, setSelected] = useState<number | null>(null);
  const skipNextDifficultyEffect = useRef(true);
  const SHOW_DEBUG = false;
  const [me, setMe] = useState<Me>(null);


  function saveSnapshot(partial?: Partial<Saved>) {
    if (!puzzle) return;
    const snapshot: Saved = {
      difficulty,
      puzzle,
      board,
      seconds,
      hintsLeft,
      ...partial,
    };
    localStorage.setItem('sudoko:last', JSON.stringify(snapshot));
  }

  async function loadPuzzle(diff: Difficulty) {
    try {
      setStatus(`loading ${diff}…`);
      const res = await fetch(`/api/puzzle?difficulty=${diff}`);
      const p: Puzzle = await res.json();
      setPuzzle(p);
      setBoard(p.board);
      setGivens(Array.from(p.board).map(ch => ch !== '0'));
      setSubmitted(false);
      await loadLeaderboard(diff);
      setSeconds(0);          
      setRunning(false);
      setHasStarted(false);
      setHintsLeft(MAX_HINTS);
      setStatus(`loaded seed=${p.seed}`);
      setSelected(null);
      saveSnapshot({ difficulty: diff, puzzle: p, board: p.board, seconds: 0, hintsLeft: MAX_HINTS });
    } catch (e) {
      console.error(e);
      setStatus('error fetching puzzle');
    }
  }

  async function loadLeaderboard(diff: Difficulty) {
    const res = await fetch(`/api/leaderboard/${diff}?limit=10`);
    const data = await res.json();
    setLeaderboard(data.entries ?? []);
  }

  async function fetchMe() {
    const r = await fetch('/api/me', { credentials: 'include' });
    setMe(r.ok ? await r.json() : null);
  }

  async function register(email: string, password: string) {
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) await fetchMe();
    const e = await r.json().catch(() => ({}));
    alert(e.error || 'Register failed');
  }

  async function login(email: string, password: string) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) {
      await fetchMe();
      return;
    }
    const e = await r.json().catch(() => ({}));
    alert(e.error || 'Register failed');
  }
  
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setMe(null);
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

  type Saved = {
    difficulty: Difficulty;
    puzzle: Puzzle;
    board: string;
    seconds: number;     // from your timer
    hintsLeft: number;   // from your hint limit
  };
  
  useEffect(() => {
    if (skipNextDifficultyEffect.current) {
      // Skip this run (first mount OR programmatic set from restore)
      skipNextDifficultyEffect.current = false;
      return;
    }
    // User actually changed the dropdown -> fetch a new puzzle
    loadPuzzle(difficulty);
  }, [difficulty]);

  useEffect(() => {
    fetchMe().catch(() => {});
  }, []);


  useEffect(() => {
    saveSnapshot();
  }, [board, seconds, hintsLeft, difficulty, puzzle?.seed]);


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

  useEffect(() => {
    const raw = localStorage.getItem('sudoko:last');
    if (raw) {
      try {
        const s: Saved = JSON.parse(raw);
        setDifficulty(s.difficulty);
        setPuzzle(s.puzzle);
        setBoard(s.board || s.puzzle.board);
        setGivens(Array.from(s.puzzle.board).map(ch => ch !== '0'));
        skipNextDifficultyEffect.current = true;

        // if you implemented timer + hint limit earlier:
        setSeconds(s.seconds ?? 0);
        setHintsLeft(s.hintsLeft ?? MAX_HINTS);
        setStatus(`loaded seed=${s.puzzle.seed} (saved)`);
        return;
      } catch (e) {
        console.error('restore failed', e);
      }
    }
    setStatus('Click "New puzzle" to begin');
  }, []);


  const handleInput = (i: number, val: string) => {
    setSelected(i);
    // if (!hasStarted) { setHasStarted(true); setRunning(true); }
    if (givens[i]) return
    if (!running) setRunning(true);
    if (!hasStarted) setHasStarted(true);
    const d = val.replace(/[^1-9]/g, '');
    const v = d === '' ? '0' : d[0];
    setBoard(b => b.slice(0, i) + v + b.slice(i + 1));
  };

  const reset = () => {
    if (!puzzle) return;
    setBoard(puzzle.board);
    setSeconds(0);
    setRunning(false);
    setHasStarted(false);
    setHintsLeft(MAX_HINTS);          
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
    if (!puzzle) return;
    if (board === puzzle.solved) {  // optional: don’t hint after completion
      alert('Already solved!');
      return;
    }
    if (hintsLeft <= 0) {
      alert('No hints left (max 3 per puzzle).');
      return;
    }
    if (selected === null) { alert('Click/select a cell to place a hint.'); return; }
    if (givens[selected]) { alert('Cannot place a hint on a given cell.'); return; }
    if (board[selected] !== '0') { alert('Cell is not empty. Clear it or select another cell.'); return; }
    
    // const i = board.indexOf('0')
    // if (i === -1) { alert('Board already full!'); return }
    const next = board.slice(0, selected) + puzzle.solved[selected] + board.slice(selected + 1);
    setBoard(next);
    setHintsLeft(h => h - 1);
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

  const filled = board.indexOf('0') === -1
  const solved = !!puzzle && board === puzzle.solved
  

  // ---- Auth gate: show login/register until we're signed in ----
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm bg-white border rounded-xl p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-4">Sudoko</h1>
          <div className="flex flex-col gap-2">
            <input id="email" placeholder="email" className="border rounded px-3 py-2" />
            <input id="pwd" placeholder="password (min 6)" type="password" className="border rounded px-3 py-2" />
            <button
              onClick={() => {
                const email = (document.getElementById('email') as HTMLInputElement).value;
                const pwd = (document.getElementById('pwd') as HTMLInputElement).value;
                register(email, pwd);
              }}
              className="border rounded px-3 py-2 hover:bg-gray-100"
            >
              Register
            </button>
            <button
              onClick={() => {
                const email = (document.getElementById('email') as HTMLInputElement).value;
                const pwd = (document.getElementById('pwd') as HTMLInputElement).value;
                login(email, pwd);
              }}
              className="border rounded px-3 py-2 hover:bg-gray-100"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ---- end auth gate ----

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-center">Sudoko</h1>

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
        <button 
          onClick={giveHint} 
          disabled={hintsLeft <= 0} 
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

      {/* Status (hidden unless debugging) */}
      {SHOW_DEBUG ? (
        <div className="text-sm text-gray-600">
          {status} {puzzle && <>• seed: <span className="font-mono">{puzzle.seed}</span></>}
        </div>
      ) : (
        // keep status for screen readers but not visible
        <div className="sr-only" aria-live="polite">{status}</div>
      )}

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
              onFocus={() => setSelected(i)}
              onClick={() => setSelected(i)}
              maxLength={1}
              disabled={given}
              inputMode="numeric"
              pattern="[0-9]*"
              className={
                "size-12 md:size-12 lg:size-12 text-center border-gray-300 " +
                th + tb +
                (given ? " bg-gray-200 font-semibold cursor-not-allowed select-none" : " bg-white") +
                (conflict ? " text-red-600 border-red-500" : "") +
                (mistake ? " bg-rose-100 border-rose-400" : "") +
                (selected === i ? " ring-2 ring-blue-400" : "")
              }
            />
          )
        })}
      </div>
      
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Top Times — {difficulty}</h2>
        <div className="border rounded-xl shadow-sm bg-white">
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
        {solved ? (
           <span className="text-green-700 font-semibold">Solved!</span>
        ) : filled ? (
          <span className="text-amber-700">All cells filled — some are wrong.</span>
        ) : (
          'Keep going…'
        )}
      </div>
    </div>
  )
}

