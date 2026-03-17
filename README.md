# Bitboard

Bitboard is a lightweight, cloud-hosted social platform centered around sharing and interacting through **drawn images instead of text**.

Rather than uploading images, users create them directly on the platform using a constrained drawing interface. These drawings are stored as **low-resolution bitmaps** (e.g., small pixel grids with limited colors), encouraging creativity through limitation.

The core experience resembles a simplified, image-first social feed:

* Users post drawings
* Follow other users
* Like and interact with content

Bitboard explores how **creative constraints and interactivity** can reshape social platforms.

## Key Design Principle

Bitboard is built around constraint-driven creativity.

The limitations (low resolution, no uploads, simple tools) are intentional—they are not technical limitations, but part of the artistic and social design.

\---

## Tech Stack (Planned)

* **Frontend:** React (JavaScript)
* **Backend:** Node.js (Express + REST/WebSockets)
* **Database:** PostgreSQL (or similar)
* **Authentication:** Managed auth service (e.g., Supabase / Firebase / Auth0)
* **Storage:** Cloud object storage (for bitmap data)
* **Hosting:** Cloud platform (e.g., Render, Fly.io, AWS)

\---

## Project Structure

bitboard/
frontend/ # React app (UI, drawing engine, feed)
backend/ # Node.js API + WebSocket server
docs/ # Documentation, specs
infrastructure/ # Deployment configs (optional)



\---

## Core Features (MVP)

* Drawing canvas (low-res bitmap editor)
* Posting drawings
* Image-based feed
* User accounts \& authentication
* Likes and basic interactions

### Planned Extensions

* Cooperative frame-by-frame animation
* Simple social games (e.g., hangman)
* Additional modular creative tools

\---

## How to Contribute

### 1. Clone the Repository

git clone https://github.com/ludensg/bitboard.git
cd bitboard

### 2. Create a Branch

Never work directly on main.

git checkout -b feature/your-feature-name

Branch naming examples:

feature/drawing-canvas
feature/auth-setup
feature/feed-api
fix/websocket-bug

### 3. Make Your Changes

Keep changes focused and small

Follow existing structure and conventions

Test locally before committing

### 4. Commit Your Work

git push origin feature/your-feature-name


Then:

Open a Pull Request on GitHub

Request at least one review

Merge only after approval


### 6. Pull Latest Changes

Before starting new work:

git checkout main
git pull


## Development Setup

### Frontend

cd frontend
npm install
npm run dev

### Backend

cd backend
npm install
node index.js
