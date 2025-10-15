# 2048 Game (GUI)

The 2048 game - state based

## Features

- Functional core logic (no in-place mutation) in `lib/2048.ts`
- Keyboard (arrow keys) and on-screen controls
- Configurable board size (3–8), default 4x4
- Dynamic GUI updates, score tracking, win/lose detection
- Restart from the UI
- Accessible roles/labels for the board and tiles

## Run Locally

- git clone https://github.com/HeathKnowles/2048
- cd 2048
- npm i
- npm run dev


## Code Structure

- `lib/2048.ts` – Pure functions: initialize, move, spawn, hasMoves, has2048
- `components/2048/game-2048.tsx` – UI: board render, controls, keyboard handling, score/status
- `app/page.tsx` – Mounts the game

## Gameplay

- Use arrow keys or on-screen buttons to slide tiles.
- Merging tiles increases your score by the merged value.
- A random tile (2 or 4) appears after each valid move.
- You win at 2048. The game ends when no moves remain.

## Implementation Notes

- Functional programming: all core operations return new board/score without mutation.
- Limited, token-based color palette for readability and contrast.
- Mobile-friendly layout and accessible ARIA roles.
