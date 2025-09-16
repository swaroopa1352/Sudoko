// Simple Sudoku utilities: board is 81-char string, '0' for blank.

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

const PUZZLES: Record<Difficulty, string[]> = {
  easy: [
    // 3 sample easy puzzles (81 chars each)
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
    "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
  ],
  medium: [
    "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
    "000900002050000079002000100001006004000830000300400700003000800820000040700004000",
    "300200000000107000706030500070009080900020004010800050009040301000702000000008006",
  ],
  hard: [
    "000000080700009000010805000000700306006000700102004000000406050000100008080000000",
    "000000000000000123004806000000000600020040030007000000000605800185000000000000000",
    "050807020600010090702000000070502080000603000040109030000000701090080005010904060",
  ],
  expert: [
    "000000000000000000700010000000907000060000080000304000000020003000000000000000000",
    "000000001000090000030000000000001900040000050005600000000000020000040000600000000",
    "000100000000000030000000400020000005080070010300000020005000000070000000000006000",
  ],
};

function idx(r: number, c: number) { return r * 9 + c; }

function isSafe(board: string, r: number, c: number, d: number): boolean {
  const ch = String(d);
  // row/col
  for (let i = 0; i < 9; i++) {
    if (board[idx(r, i)] === ch) return false;
    if (board[idx(i, c)] === ch) return false;
  }
  // box
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (board[idx(rr, cc)] === ch) return false;
    }
  }
  return true;
}

export function solve(board: string): string | null {
  // backtracking with MRV-ish simple scan
  const arr = board.split('');
  function nextEmpty(): number {
    let bestIndex = -1; let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (arr[i] === '0') {
        const r = Math.floor(i / 9), c = i % 9;
        let cnt = 0;
        for (let d = 1; d <= 9; d++) if (isSafe(arr.join(''), r, c, d)) cnt++;
        if (cnt < bestCount) { bestCount = cnt; bestIndex = i; if (cnt === 1) break; }
      }
    }
    return bestIndex;
  }
  function bt(): boolean {
    const i = nextEmpty();
    if (i === -1) return true;
    const r = Math.floor(i / 9), c = i % 9;
    for (let d = 1; d <= 9; d++) {
      if (isSafe(arr.join(''), r, c, d)) {
        arr[i] = String(d);
        if (bt()) return true;
        arr[i] = '0';
      }
    }
    return false;
  }
  return bt() ? arr.join('') : null;
}

export function randomPuzzle(difficulty: Difficulty): { seed: string; board: string; solved: string } {
  const list = PUZZLES[difficulty] ?? PUZZLES.easy;
  const pick = list[Math.floor(Math.random() * list.length)];
  const solved = solve(pick);
  if (!solved) {
    // extremely unlikely with curated puzzles; fall back to an easy one
    const fallback = PUZZLES.easy[0];
    return { seed: `fallback-${Date.now()}`, board: fallback, solved: solve(fallback)! };
  }
  return { seed: `${difficulty}-${Date.now()}`, board: pick, solved };
}
