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
* **Backend:** Node.js with Express and Socket.io
* **Database:** PostgreSQL (managed by Supabase) with Prisma as the data layer
* **Authentication:** Supabase Auth — email / password with email confirmation and password reset
* **Hosting:** Render — one web service for the API and one static site for the frontend; Supabase handles the database and auth



## Project Structure
```
bitboard/
├── frontend/               # React app (UI, drawing engine, feed)
│   ├── src/
│   │   ├── api/            # API client — talks to the backend
│   │   ├── assets/         # Static assets
│   │   ├── Components/     # Reusable UI components
│   │   │   ├── animation/  # Frame-by-frame animation builder
│   │   │   ├── auth/       # Login / register / password reset forms
│   │   │   ├── canvas/     # Drawing canvas components
│   │   │   ├── common/     # NavBar, NotificationBell, ThemeToggle
│   │   │   ├── feed/       # PostCard, Feed, LikeButton, PreviewPanel
│   │   │   └── profile/    # ProfileHeader, PostGrid, FollowButton
│   │   ├── context/        # AuthContext, AppContext, FeedContext
│   │   ├── hooks/          # useFeed, useCanvas, useWebSocket
│   │   ├── lib/            # Supabase client
│   │   ├── Pages/          # Full page components (FeedPage, DrawPage, ProfilePage, AdminPage, etc.)
│   │   ├── styles/         # globals.css (design tokens) + theme.css (dark mode)
│   │   └── utils/          # bitmap.js (canvas rendering) + palette.js (colours)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/                # Node.js API + Socket.io server
│   └── src/
│       ├── routes/         # auth, posts, users, notifications, admin
│       ├── middleware/     # authenticate, requireAdmin, validateBitmap, errorHandler
│       ├── websockets/     # Socket.io server for real-time notifications
│       ├── db/             # Prisma client
│       └── utils/          # shared helpers
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma
│   └── migrations/
├── docs/                   # Deployment guide and UML / RTM
│   ├── DEPLOY.md
│   └── UML_and_RTM/
└── render.yaml             # Render deployment config
```



## Current Status

### What works today
* Account creation, login, email confirmation, and password reset
* Pixel drawing canvas — brush, eraser, fill, 16 colours, 5 canvas sizes
* Posting drawings to the feed with captions and hashtags
* Chronological feed with like / unlike and a preview panel that plays animations (play / pause)
* Frame-by-frame animation builder
* Explore / discovery page with hashtag filtering
* User profiles — posts tab and liked-posts tab, with inline bio editing on your own profile
* Follow / unfollow other users
* Real-time notifications (likes, follows, new posts from people you follow) via the notification bell
* Admin moderation tools — review flagged posts, suspend users, un-flag posts, un-suspend users, and hide deleted users
* Dark mode / light mode toggle and an animated grid background with adjustable density — both preferences are saved per account
* Deep links work on reload (shareable URLs that open the right page)

### In progress
* Mini-game module (Hangman) — not yet started



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

The app opens on the login page. After signing in it drops you on the feed (`/feed`). The frontend expects the backend to be running on port 3001 — see below.

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
| `/admin` | Moderation dashboard (admins only) |
| `/demo` | Original standalone demo (reference) |

### Backend

```
cd backend
npm install
npx prisma generate
npm start
```

The backend needs a `.env` file with:

* `DATABASE_URL` — Supabase pooled connection string
* `DIRECT_URL` — Supabase direct connection (used for migrations)
* `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — used to verify login tokens
* `CORS_ORIGIN` — where the frontend is served from (e.g. `http://localhost:5173` in dev)

The API runs on **http://localhost:3001** by default.



## Deployment

Bitboard is deployed on Render — one web service for the API and one static site for the frontend — with a Supabase project providing the database and auth. Full step-by-step instructions are in [`docs/DEPLOY.md`](docs/DEPLOY.md).



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
