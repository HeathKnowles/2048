"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Board,
  Direction,
  initializeBoard,
  createEmptyBoard,
  move,
  spawnRandomTile,
  hasMoves,
  has2048,
  createSeededRng,
} from "@/lib/2048"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type Status = "playing" | "won" | "over"

const DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
}

export function Game2048({ defaultSize = 4 }: { defaultSize?: number }) {
    const [size, setSize] = useState(defaultSize)
    const [board, setBoard] = useState<Board>(() => createEmptyBoard(defaultSize))
    const [score, setScore] = useState(0)
    const [status, setStatus] = useState<Status>("playing")

    const rngRef = useRef<() => number>(Math.random)
    const boardRef = useRef<HTMLDivElement | null>(null)

    // UI state
    const [moves, setMoves] = useState(0)
    const [seed, setSeed] = useState<string>("")
    const [initialized, setInitialized] = useState(false)
    const [isRunning, setIsRunning] = useState(true)
    const [seconds, setSeconds] = useState(0)
    const [undoStack, setUndoStack] = useState<Array<{ board: Board; score: number }>>([])
    const [best, setBest] = useState<number>(0)

    // Responsive board sizing
    const gridTemplate = useMemo(
        () => ({
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            width: "100%",
            maxWidth: "min(90vw, 90vh, 600px)",
            height: "auto",
            aspectRatio: "1 / 1",
            minHeight: "min(90vw, 90vh, 600px)",
            minWidth: "min(90vw, 90vh, 600px)",
        }),
        [size]
    )

    const restart = useCallback(
        (newSize = size) => {
            setSize(newSize)
            if (seed.trim() !== "") {
                const n = Number.parseInt(seed, 10)
                rngRef.current = createSeededRng(Number.isFinite(n) ? n : Date.now())
            } else {
                rngRef.current = Math.random
            }
            setBoard(initializeBoard(newSize, rngRef.current))
            setInitialized(true)
            setScore(0)
            setMoves(0)
            setUndoStack([])
            setSeconds(0)
            setStatus("playing")
        },
        [size, seed],
    )

    const applyMove = useCallback(
        (dir: Direction) => {
            if (status !== "playing" || !isRunning) return
            const { board: movedBoard, gained, moved } = move(board, dir)
            if (!moved) return

            setUndoStack((u) => [{ board: board.map((r) => [...r]), score }, ...u.slice(0, 9)])

            const next = spawnRandomTile(movedBoard, rngRef.current)
            const nextScore = score + gained
            const nextStatus: Status = has2048(next) ? "won" : hasMoves(next) ? "playing" : "over"
            setBoard(next)
            setScore(nextScore)
            setMoves((m) => m + 1)
            setStatus(nextStatus)
        },
        [board, score, status, isRunning],
    )

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const dir = DIRECTIONS[e.key]
            if (!dir) return
            if (!isRunning) return
            e.preventDefault()
            applyMove(dir)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [applyMove, isRunning])

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search)
            const seedParam = params.get("seed")
            if (seedParam) setSeed(seedParam)
            if (seedParam && seedParam.trim() !== "") {
                const n = Number.parseInt(seedParam, 10)
                rngRef.current = createSeededRng(Number.isFinite(n) ? n : Date.now())
            } else {
                rngRef.current = Math.random
            }
            setBoard(initializeBoard(size, rngRef.current))
            setInitialized(true)
        } catch (err) {
            rngRef.current = Math.random
            setBoard(initializeBoard(size, rngRef.current))
            setInitialized(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const el = boardRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
        }
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault()
        }

        el.addEventListener("wheel", onWheel, { passive: false })
        el.addEventListener("touchmove", onTouchMove, { passive: false })

        return () => {
            el.removeEventListener("wheel", onWheel)
            el.removeEventListener("touchmove", onTouchMove)
        }
    }, [boardRef, initialized])

    useEffect(() => {
        if (!isRunning) return
        const t = setInterval(() => setSeconds((s) => s + 1), 1000)
        return () => clearInterval(t)
    }, [isRunning])

    useEffect(() => {
        try {
            const v = localStorage.getItem("2048:best")
            if (v) setBest(Number.parseInt(v, 10))
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        if (score > best) {
            setBest(score)
            try {
                localStorage.setItem("2048:best", String(score))
            } catch {
                // ignore
            }
        }
    }, [score, best])

    const undo = useCallback(() => {
        setUndoStack((u) => {
            if (u.length === 0) return u
            const [{ board: prev, score: prevScore }, ...rest] = u
            setBoard(prev)
            setScore(prevScore)
            setStatus("playing")
            return rest
        })
    }, [])

    const handleSizeChange = (val: string) => {
        const n = Number.parseInt(val, 10)
        if (Number.isFinite(n) && n >= 3 && n <= 8) {
            restart(n)
        }
    }

    const handleSeedChange = (val: string) => {
        setSeed(val)
    }

    const applySeedAndRestart = () => {
        restart(size)
    }

    const baseUrl = () => `${window.location.origin}${window.location.pathname}`

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            return false
        }
    }

    const shareSeed = async () => {
        const url = `${baseUrl()}?seed=${encodeURIComponent(seed)}`
        if (navigator.share) {
            try {
                await navigator.share({ title: "2048 (seed)", url })
                return
            } catch {
            }
        }
        await copyToClipboard(url)
    }


    return (
        <div className="max-w-2xl w-full mx-auto">
            <div className="flex flex-col items-center">

                <div className="w-full flex flex-col sm:flex-row items-center gap-2">
                    <div className="w-full sm:w-32 flex flex-col items-center sm:items-start gap-2">
                        <CardTitle className="text-balance text-lg">2048</CardTitle>
                        <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="text-xs">Score: {score}</Badge>
                            <Badge variant="secondary" className="text-xs">Best: {best}</Badge>
                        </div>
                    </div>

                    {/* center column: game card */}
                    <div className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-center justify-center mb-1">
                            <div className="text-xs">Moves: {moves} · Time: {Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}</div>
                        </div>

                        <Card className="w-full flex items-center justify-center">
                            <CardContent className="space-y-2 p-1 flex flex-col items-center justify-center">
                                {!initialized ? (
                                    <div
                                        className="grid gap-1 p-1 rounded-xl bg-secondary animate-pulse"
                                        style={{ ...gridTemplate, maxWidth: "min(80vw, 80vh, 420px)", minWidth: "min(80vw, 80vh, 420px)", minHeight: "min(80vw, 80vh, 420px)" }}
                                    >
                                        {Array.from({ length: size * size }).map((_, i) => (
                                            <div key={i} className="aspect-square rounded-lg bg-muted" />
                                        ))}
                                    </div>
                                ) : (
                                    <BoardView
                                        board={board}
                                        size={size}
                                        style={{ ...gridTemplate, maxWidth: "min(80vw, 80vh, 420px)", minWidth: "min(80vw, 80vh, 420px)", minHeight: "min(80vw, 80vh, 420px)" }}
                                        containerRef={boardRef}
                                    />
                                )}

                                <Controls onMove={applyMove} disabled={status !== "playing" || !isRunning} />
                            </CardContent>
                        </Card>

                        {status !== "playing" && (
                            <div
                                className={cn(
                                    "rounded-lg p-2 mt-2",
                                    status === "won" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                                )}
                                role="status"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium text-sm">{status === "won" ? "You reached 2048!" : "No more moves"}</div>
                                    <Button variant={status === "won" ? "secondary" : "default"} size="sm" onClick={() => restart()}>
                                        Play again
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full sm:w-30 flex flex-col items-center sm:items-end gap-1">
                        <div className="flex flex-col gap-1 items-center sm:items-end">
                            <Select defaultValue={String(defaultSize)} onValueChange={handleSizeChange}>
                                <SelectTrigger className="w-20 h-8 text-xs">
                                    <SelectValue placeholder={`${size} x ${size}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {[3, 4, 5, 6, 7, 8].map((n) => (
                                        <SelectItem key={n} value={String(n)}>{`${n} x ${n}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <input
                                aria-label="Seed"
                                placeholder="seed (optional)"
                                value={seed}
                                onChange={(e) => handleSeedChange(e.target.value)}
                                className="input input-sm rounded-md h-7 max-w-[7rem] border-transparent text-xs"
                            />

                            <Button variant="outline" size="sm" onClick={applySeedAndRestart}>
                                Restart
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => undo()} disabled={undoStack.length === 0}>
                                Undo
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsRunning((s) => !s)}>
                                {isRunning ? "Pause" : "Resume"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={shareSeed} disabled={!seed} title="Share seed URL">
                                Share Seed
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BoardView({
  board,
  size,
  style,
  containerRef,
}: {
  board: Board
  size: number
  style: React.CSSProperties
  containerRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={containerRef}
      className="grid gap-2 p-2 rounded-xl bg-secondary"
      style={{ ...style, gridAutoRows: '1fr', touchAction: 'none', overscrollBehavior: 'contain' }}
      role="grid"
      aria-label={`${size} by ${size} game board`}
    >
      {board.map((row, r) => (
        <div key={r} className="contents" role="row">
          {row.map((val, c) => (
            <Tile key={`${r}-${c}`} value={val} />
          ))}
        </div>
      ))}
    </div>
  )
}

function Tile({ value }: { value: number }) {
  // color map for values 2..2048
  const colors: Record<number, { bg: string; color: string }> = {
    2: { bg: "#eee4da", color: "#776e65" },
    4: { bg: "#ede0c8", color: "#776e65" },
    8: { bg: "#f2b179", color: "#f9f6f2" },
    16: { bg: "#f59563", color: "#f9f6f2" },
    32: { bg: "#f67c5f", color: "#f9f6f2" },
    64: { bg: "#f65e3b", color: "#f9f6f2" },
    128: { bg: "#edcf72", color: "#f9f6f2" },
    256: { bg: "#edcc61", color: "#f9f6f2" },
    512: { bg: "#edc850", color: "#f9f6f2" },
    1024: { bg: "#edc53f", color: "#f9f6f2" },
    2048: { bg: "#edc22e", color: "#f9f6f2" },
  }

  const style: React.CSSProperties = value === 0 ? { background: 'transparent' } : (colors[value] || { bg: '#3c3a32', color: '#fff' })

  const bg = value === 0 ? undefined : (colors[value]?.bg || '#3c3a32')
  const color = value === 0 ? undefined : (colors[value]?.color || '#fff')

  return (
    <div
      style={{ background: bg, color }}
      className={cn(
        "aspect-square rounded-lg flex items-center justify-center text-lg md:text-xl font-bold select-none",
        "shadow-sm",
        value === 0 ? 'bg-muted text-muted-foreground' : ''
      )}
      role="gridcell"
      aria-label={value === 0 ? "empty" : String(value)}
    >
      {value === 0 ? "" : value}
    </div>
  )
}

function Controls({ onMove, disabled }: { onMove: (d: Direction) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-center">
      <div className="grid grid-cols-3 gap-2">
        <div />
        <Button variant="outline" disabled={disabled} onClick={() => onMove("up")} aria-label="Move up">
          ↑
        </Button>
        <div />
        <Button variant="outline" disabled={disabled} onClick={() => onMove("left")} aria-label="Move left">
          ←
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => onMove("down")} aria-label="Move down">
          ↓
        </Button>
        <Button variant="outline" disabled={disabled} onClick={() => onMove("right")} aria-label="Move right">
          →
        </Button>
      </div>
    </div>
  )
}
