export type Board = number[][]
export type Direction = "left" | "right" | "up" | "down"

export type RNG = () => number

/** Seeded RNG (mulberry32) producing values in [0,1) */
export const createSeededRng = (seed: number): RNG => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export const createEmptyBoard = (size: number): Board =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 0))

const cloneBoard = (board: Board): Board => board.map((row) => [...row])

const rand = (n: number, rng: RNG = Math.random) => Math.floor(rng() * n)

const getEmptyCells = (board: Board): Array<{ r: number; c: number }> => {
  const empty: Array<{ r: number; c: number }> = []
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === 0) empty.push({ r, c })
    }
  }
  return empty
}

export const spawnRandomTile = (board: Board, rng: RNG = Math.random): Board => {
  const empty = getEmptyCells(board)
  if (empty.length === 0) return board
  const { r, c } = empty[rand(empty.length, rng)]
  const value = rng() < 0.9 ? 2 : 4
  const next = cloneBoard(board)
  next[r][c] = value
  return next
}

export const initializeBoard = (size = 4, rng: RNG = Math.random): Board => {
  let b = createEmptyBoard(size)
  b = spawnRandomTile(b, rng)
  b = spawnRandomTile(b, rng)
  return b
}

const arraysEqual = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

const slideAndMergeLine = (line: number[]) => {
  const filtered = line.filter((v) => v !== 0)
  const merged: number[] = []
  let gain = 0
  for (let i = 0; i < filtered.length; i++) {
    const current = filtered[i]
    const next = filtered[i + 1]
    if (next !== undefined && current === next) {
      const val = current + next
      merged.push(val)
      gain += val
      i++
    } else {
      merged.push(current)
    }
  }
  // pad with zeros
  const result = [...merged, ...Array(line.length - merged.length).fill(0)]
  const moved = !arraysEqual(result, line)
  return { result, gain, moved }
}

const transpose = (board: Board): Board => {
  const size = board.length
  const t: Board = Array.from({ length: size }, () => Array(size).fill(0))
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      t[c][r] = board[r][c]
    }
  }
  return t
}

const reverseRows = (board: Board): Board => board.map((row) => [...row].reverse())

export const move = (board: Board, direction: Direction): { board: Board; gained: number; moved: boolean } => {
  const size = board.length
  let working = cloneBoard(board)
  let totalGain = 0
  let anyMoved = false

  if (direction === "left" || direction === "right") {
    if (direction === "right") working = reverseRows(working)
    const processed = working.map((row) => {
      const { result, gain, moved } = slideAndMergeLine(row)
      totalGain += gain
      if (moved) anyMoved = true
      return result
    })
    working = direction === "right" ? reverseRows(processed) : processed
  } else {
    // up/down via transpose + left/right
    working = transpose(working)
    if (direction === "down") working = reverseRows(working)
    const processed = working.map((row) => {
      const { result, gain, moved } = slideAndMergeLine(row)
      totalGain += gain
      if (moved) anyMoved = true
      return result
    })
    working = direction === "down" ? reverseRows(processed) : processed
    working = transpose(working)
  }

  return { board: working, gained: totalGain, moved: anyMoved }
}

export const has2048 = (board: Board) => board.some((row) => row.some((v) => v >= 2048))

export const hasMoves = (board: Board) => {
  if (board.some((row) => row.some((v) => v === 0))) return true
  const size = board.length
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = board[r][c]
      if (c + 1 < size && board[r][c + 1] === v) return true
      if (r + 1 < size && board[r + 1][c] === v) return true
    }
  }
  return false
}
