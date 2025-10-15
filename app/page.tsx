import { Game2048 } from "@/components/2048/game-2048"

export default function Page() {
  return (
    <main className="min-h-dvh w-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Game2048 defaultSize={4} />
      </div>
    </main>
  )
}
