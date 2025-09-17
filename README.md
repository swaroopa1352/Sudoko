# Sudoko (Full-Stack Sudoku)

A production-style Sudoku (yes, **Sudoko** is the project name 😉) built with **React + TypeScript** (Vite) on the front end and **Fastify + TypeScript** on the back end, with a **PostgreSQL + Prisma** leaderboard. It features a real solver, difficulty-graded puzzles, a polished grid UI, a timer, limited hints, sticky state across refreshes, and a top-times leaderboard.

**Tech:** React, Vite, TypeScript, Tailwind CSS, Fastify, Zod, PostgreSQL, Prisma, Docker, pnpm

---

## ✨ Features

- **Sudoku engine**
  - Real solver (backtracking with a simple MRV heuristic)
  - Difficulty-graded puzzle bank: `easy | medium | hard | expert`
  - Compact 81-char board encoding (`'0'` = empty)

- **Gameplay**
  - 9×9 grid with **givens** locked (gray)
  - Conflict detection (row / column / 3×3 box)
  - Mistake highlighting toggle (compares to solved board)
  - **Hints (max 3)** — fills the **selected** empty cell
  - **Timer** — starts on first move, pause/resume, auto-stop on solve

- **Persistence & UX**
  - Snapshot saved to `localStorage` (`difficulty`, `puzzle`, `board`, `seconds`, `hintsLeft`)
  - Sticky across refresh (same seed & state), but **changing difficulty auto-fetches a new puzzle**

- **Leaderboard (PostgreSQL + Prisma)**
  - Submit `seed`, `difficulty`, `seconds`, `hintsUsed`
  - View top times per difficulty (sorted by time → hints → date)
 
## ⚙️ Environment

- API: Node 20+, Fastify, Zod, Prisma
- DB: PostgreSQL 16 (Docker)
- Web: Vite + React + TypeScript + Tailwind CSS
- Package manager: pnpm (workspace)

