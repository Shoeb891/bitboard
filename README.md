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



## Tech Stack

* **Frontend:** React 18 + Vite + Tailwind CSS v4
* **Backend:** Node.js (Express + REST/WebSockets) — *not yet implemented*
* **Database:** PostgreSQL (or similar) — *not yet implemented*
* **Authentication:** Managed auth service (e.g., Supabase / Firebase / Auth0) — *not yet implemented*
* **Storage:** Cloud object storage (for bitmap data) — *not yet implemented*
* **Hosting:** Cloud platform (e.g., Render, Fly.io, AWS) — *not yet implemented*



## Project Structure
```
bitboard/
├── frontend/               # React app (UI, drawing engine, feed)
│   ├── src/
│   │   ├── api/            # Mock API layer (swap for real fetch calls later)
│   │   ├── assets/         # Mock data and static assets
│   │   ├── Components/     # Reusable UI components
│   │   │   ├── animation/  # Frame-by-frame animation builder
│   │   │   ├── canvas/     # Drawing canvas components
│   │   │   ├── common/     # NavBar, NotificationBell, ThemeToggle
│   │   │   ├── feed/       # PostCard, Feed, LikeButton
│   │   │   └── profile/    # ProfileHeader, PostGrid, FollowButton
│   │   ├── context/        # AppContext (user/theme/notifications) + FeedContext (posts)
│   │   ├── hooks/          # useFeed, useCanvas, useWebSocket
│   │   ├── Pages/          # Full page components (FeedPage, DrawPage, ProfilePage, etc.)
│   │   ├── styles/         # globals.css (design tokens) + theme.css (dark mode)
│   │   └── utils/          # bitmap.js (canvas rendering) + palette.js (colours)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                # Node.js API + WebSocket server (not yet implemented)
└── docs/                   # Documentation, specs
```



## Current Status

### Frontend — Complete
* Pixel drawing canvas (brush, eraser, fill, 16 colours, 5 canvas sizes)
* Post drawings to the feed
* Chronological feed with like / unlike
* Explore / discovery page with hashtag filtering
* User profiles with posts and liked posts tabs
* Follow / unfollow other users
* Inline bio editing on your own profile
* Frame-by-frame animation builder with playback
* Real-time notification bell (simulated)
* Dark mode / light mode toggle
* Animated grid background throughout

### Backend — Not yet implemented
* All data currently runs on mock in-memory state in the frontend
* The `src/api/` files are structured to make swapping to real API calls straightforward

### Not yet implemented
* User authentication (login / register)
* Database persistence
* Cloud storage for bitmaps
* Mini-game module (Hangman)



## Development Setup

### Prerequisites
* Node.js 18+
* npm 9+

### Frontend

```
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173/**

It opens on the feed page (`/feed`) automatically. No backend or database is required — all data is mock in-memory state.

Available routes:

| Route | Page |
|---|---|
| `/feed` | Home feed — all posts newest first |
| `/explore` | Discovery feed with hashtag filters |
| `/draw` | Pixel drawing editor → post to feed |
| `/animate` | Frame-by-frame animation builder |
| `/profile` | Your own profile |
| `/profile/:username` | Another user's profile |
| `/settings` | Theme, bio, grid density |
| `/demo` | Original standalone demo (reference) |

### Backend

> The backend is not yet implemented. The files in `backend/` are empty scaffolding.

```
cd backend
npm install
node server.js
```



## How to Contribute

### 1. Clone the Repository

```
git clone https://github.com/ludensg/bitboard.git
cd bitboard
```

### 2. Create a Branch

* Never work directly on main.

```
git checkout -b feature/your-feature-name
```

Branch naming examples:
```
feature/drawing-canvas
feature/auth-setup
feature/feed-api
fix/websocket-bug
```

### 3. Make Your Changes

* Keep changes focused and small

* Follow existing structure and conventions

* Test locally before committing

### 4. Commit Your Work

```
git push origin feature/your-feature-name
```

Then:

* Open a Pull Request on GitHub

* Request at least one review

* Merge only after approval

### 5. Pull Latest Changes

Before starting new work:
```
git checkout main
git pull
```
