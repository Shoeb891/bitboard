import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// PIXEL DATA GENERATORS
// Each returns a flat Uint8Array(width * height), 0=empty 1=filled
// ============================================================

function genWave(w, h) {
  // Diagonal zigzag – mirrors the mockup's user_1 pattern
  const px = new Array(w * h).fill(0);
  const period = w / 2.5;
  for (let x = 0; x < w; x++) {
    const t = (x % period) / period;
    const raw = t < 0.5
      ? t * 2 * (h - 3)
      : (1 - t) * 2 * (h - 3);
    const y = Math.max(0, Math.min(h - 2, Math.round(raw)));
    px[y * w + x] = 1;
    px[(y + 1) * w + x] = 1;
  }
  return px;
}

function genBars(w, h) {
  // Barcode-style vertical bars – mirrors user_2 pattern
  const px = new Array(w * h).fill(0);
  const pattern = [3, 1, 3, 1, 2, 1, 3, 1, 1, 1];
  let x = 0, i = 0;
  while (x < w) {
    const bw = pattern[i % pattern.length];
    if (i % 2 === 0) {
      for (let bx = 0; bx < bw && x + bx < w; bx++)
        for (let y = 0; y < h; y++)
          px[y * w + (x + bx)] = 1;
    }
    x += bw; i++;
  }
  return px;
}

function genDiamond(w, h) {
  const px = new Array(w * h).fill(0);
  const cx = w / 2 - 0.5, cy = h / 2 - 0.5;
  const r1 = Math.min(cx, cy) - 1;
  const r2 = r1 - 5;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.abs(x - cx) + Math.abs(y - cy);
      if (Math.round(d) === Math.round(r1) || (r2 > 0 && Math.round(d) === Math.round(r2)))
        px[y * w + x] = 1;
    }
  return px;
}

function genGridPattern(w, h) {
  const px = new Array(w * h).fill(0);
  const step = 6;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (x % step === 0 || y % step === 0) px[y * w + x] = 1;
  return px;
}

function genNoise(w, h, density = 0.18) {
  // Used as placeholder when user posts without a real drawing
  return Array.from({ length: w * h }, () => Math.random() < density ? 1 : 0);
}

function genPulse(w, h) {
  // Concentric squares
  const px = new Array(w * h).fill(0);
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      if (d % 4 === 0) px[y * w + x] = 1;
    }
  return px;
}

// ============================================================
// BITMAP FORMAT DEFINITIONS
// scale = px per grid cell when rendered
// ============================================================
const FORMATS = {
  banner: { width: 64, height: 16, scale: 7 },
  square: { width: 32, height: 32, scale: 7 },
  wide:   { width: 96, height: 12, scale: 5 },
  tall:   { width: 16, height: 48, scale: 8 },
};

// ============================================================
// INITIAL MOCK POSTS
// ============================================================
const INIT_POSTS = [
  {
    id: 1, username: "user_1", timestamp: "2h",
    likes: 14, liked: false,
    bitmap: { ...FORMATS.banner, pixels: genWave(64, 16) },
  },
  {
    id: 2, username: "user_2", timestamp: "4h",
    likes: 7, liked: false,
    bitmap: { ...FORMATS.banner, pixels: genBars(64, 16) },
  },
  {
    id: 3, username: "pixel_dan", timestamp: "6h",
    likes: 23, liked: false,
    bitmap: { ...FORMATS.square, pixels: genDiamond(32, 32) },
  },
  {
    id: 4, username: "chkr_b0ard", timestamp: "1d",
    likes: 3, liked: false,
    bitmap: { ...FORMATS.wide, pixels: genGridPattern(96, 12) },
  },
  {
    id: 5, username: "pulse_wave", timestamp: "2d",
    likes: 11, liked: false,
    bitmap: { ...FORMATS.square, pixels: genPulse(32, 32) },
  },
];

// ============================================================
// USERNAME LABEL PALETTES (matching mockup colors)
// ============================================================
const PALETTES = [
  { bg: "#7fdbca", text: "#1a4a44" }, // mint  – user_1
  { bg: "#ffb3c6", text: "#5a1a2e" }, // pink  – user_2
  { bg: "#c8c8c8", text: "#2a2a2a" }, // grey
  { bg: "#b3c8f0", text: "#1a2a5a" }, // ice blue
];

// ============================================================
// BITMAP CANVAS RENDERER
// ============================================================
function BitCanvas({ bitmap }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const { width: w, height: h, pixels, scale: s } = bitmap;

    cv.width  = w * s;
    cv.height = h * s;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);

    // Filled pixels
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i < pixels.length; i++) {
      if (!pixels[i]) continue;
      const x = i % w;
      const y = Math.floor(i / w);
      ctx.fillRect(x * s, y * s, s, s);
    }

    // Subtle internal grid (like PictoChat's paper grid)
    ctx.strokeStyle = "rgba(210,210,210,0.6)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * s, 0);
      ctx.lineTo(x * s, h * s);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(w * s, y * s);
      ctx.stroke();
    }
  }, [bitmap]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", imageRendering: "pixelated", maxWidth: "100%" }}
    />
  );
}

// ============================================================
// ALL CSS — injected as a <style> tag
// ============================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --cell: 22px;
  --black: #1a1a1a;
  --white: #ffffff;
  --bg: #f1f1ef;
  --border: 2px solid #1a1a1a;
  --fp: 'Press Start 2P', monospace;
  --fb: 'VT323', monospace;
  --sw: 200px;
}

/* ─── GLOBAL GRID BACKGROUND ─── */
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  position: relative;
  font-family: var(--fb);
  color: var(--black);
  /* base checkerboard grid */
  background-color: var(--bg);
  background-image:
    linear-gradient(rgba(0,0,0,0.065) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.065) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
}

/* Animated secondary grid layer – shifts opacity slowly */
.app::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(rgba(80,80,80,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(80,80,80,0.06) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
  animation: gridBreath 8s ease-in-out infinite;
}

@keyframes gridBreath {
  0%,100% { opacity: 0.2; }
  40%      { opacity: 1;   }
  70%      { opacity: 0.6; }
}

/* ─── HOVER ZONE: grid darkens on hover ─── */
/* Applied to sidebar, topbar, and individual posts */
.zone {
  position: relative;
  z-index: 1;
}
.zone::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: 0;
}
.zone:hover::after { opacity: 1; }

/* ─── SIDEBAR ─── */
.sidebar {
  width: var(--sw);
  flex-shrink: 0;
  border-right: var(--border);
  display: flex;
  flex-direction: column;
  background: transparent;
}

.logo-wrap {
  padding: 14px 16px 14px;
  border-bottom: var(--border);
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}

/* Pixel "B" in a box */
.logo-b {
  font-family: var(--fp);
  font-size: 18px;
  display: inline-block;
  border: 2px solid var(--black);
  padding: 3px 5px;
  background: var(--white);
  line-height: 1;
  margin-right: 3px;
  flex-shrink: 0;
}

/* Cursive "it.board" */
.logo-script {
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-style: italic;
  font-size: 21px;
  letter-spacing: 0.5px;
  line-height: 1;
}

.logo-pen {
  font-size: 15px;
  margin-left: 3px;
  opacity: 0.7;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 11px 16px;
  font-family: var(--fp);
  font-size: 7px;
  letter-spacing: 0.5px;
  color: var(--black);
  text-align: left;
  position: relative;
  z-index: 1;
  transition: background 0.15s;
}
.nav-btn:hover { background: rgba(0,0,0,0.05); }
.nav-btn.active { background: rgba(0,0,0,0.04); }
.nav-btn.active::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--black);
}
.nav-icon {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.spacer { flex: 1; }

.create-btn {
  margin: 14px;
  padding: 12px;
  background: var(--black);
  color: var(--white);
  border: none;
  cursor: pointer;
  font-family: var(--fp);
  font-size: 7px;
  letter-spacing: 1.5px;
  position: relative;
  z-index: 1;
  transition: background 0.15s, transform 0.1s;
}
.create-btn:hover { background: #2d2d2d; transform: translateY(-1px); }
.create-btn:active { transform: translateY(0); }

/* ─── MAIN COLUMN ─── */
.main { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

/* ─── TOPBAR ─── */
.topbar {
  border-bottom: var(--border);
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  flex-shrink: 0;
}
.topbar-title {
  font-family: var(--fp);
  font-size: 9px;
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
}
.avatar {
  width: 30px; height: 30px;
  border: 2px solid var(--black);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  cursor: pointer;
  background: var(--white);
  position: relative;
  z-index: 1;
  transition: background 0.15s;
}
.avatar:hover { background: #f0f0f0; }

/* ─── FEED ─── */
.feed {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.feed::-webkit-scrollbar { width: 5px; }
.feed::-webkit-scrollbar-track { background: transparent; }
.feed::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); }

.feed-empty {
  font-family: var(--fp);
  font-size: 8px;
  color: #aaa;
  text-align: center;
  margin-top: 60px;
  letter-spacing: 1px;
  line-height: 2.5;
}

/* ─── POST ─── */
.post {
  border: var(--border);
  background: var(--white);
  margin-bottom: -2px;        /* collapse shared borders */
  position: relative;
  z-index: 1;
  transition: box-shadow 0.15s;
}
.post:hover {
  box-shadow: 4px 4px 0 var(--black);
  z-index: 3;
}

.post-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-bottom: 1px solid #eaeaea;
  position: relative;
  z-index: 2;
}

/* Diagonal-cut username badge — directly from mockup */
.user-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 14px 3px 8px;
  font-family: var(--fp);
  font-size: 6.5px;
  letter-spacing: 0.5px;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
  white-space: nowrap;
}

.timestamp {
  font-family: var(--fb);
  font-size: 16px;
  color: #aaa;
}

.post-canvas {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  z-index: 2;
}
.post-canvas canvas {
  border: 1px solid #e8e8e8;
}

.post-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px 12px;
  position: relative;
  z-index: 2;
}

.like-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--fp);
  font-size: 6.5px;
  color: #bbb;
  padding: 4px 8px;
  transition: color 0.15s, transform 0.1s;
}
.like-btn:hover { color: #e04060; }
.like-btn.liked { color: #e04060; }
.like-btn:active { transform: scale(0.88); }
.like-heart { font-size: 14px; }

/* ─── CREATE MODAL ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--bg);
  border: var(--border);
  box-shadow: 7px 7px 0 var(--black);
  width: min(460px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background-image:
    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
  background-size: var(--cell) var(--cell);
}

.modal-head {
  border-bottom: var(--border);
  padding: 11px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--black);
  color: var(--white);
  flex-shrink: 0;
}
.modal-title { font-family: var(--fp); font-size: 8px; letter-spacing: 2px; }
.modal-x {
  background: none; border: none; color: var(--white);
  cursor: pointer; font-size: 15px; padding: 2px 6px; line-height: 1;
}
.modal-x:hover { opacity: 0.7; }

.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 18px; }

.section-label {
  font-family: var(--fp);
  font-size: 6.5px;
  letter-spacing: 1px;
  margin-bottom: 10px;
  color: #555;
  display: block;
}

.fmt-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.fmt-opt {
  border: 2px solid #d4d4d4;
  background: var(--white);
  cursor: pointer;
  padding: 10px 4px 9px;
  font-family: var(--fp);
  font-size: 5.5px;
  text-align: center;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.fmt-opt:hover { border-color: #888; color: #555; }
.fmt-opt.sel  { border-color: var(--black); color: var(--black); background: #f8f8f6; }

/* The little aspect-ratio icon inside each format button */
.fmt-icon { background: currentColor; display: block; }
.fmt-dims { font-size: 5px; color: #c0c0c0; margin-top: -2px; }

/* Crosshatched canvas placeholder */
.canvas-ph {
  border: 2px dashed #ccc;
  min-height: 155px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--fp);
  font-size: 7px;
  color: #ccc;
  letter-spacing: 1px;
  text-align: center;
  line-height: 2.2;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(0,0,0,0.018) 6px,
    rgba(0,0,0,0.018) 12px
  );
}

.modal-foot {
  border-top: var(--border);
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: var(--white);
  flex-shrink: 0;
}

.btn {
  border: 2px solid var(--black);
  padding: 8px 18px;
  font-family: var(--fp);
  font-size: 6.5px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: transform 0.1s;
}
.btn:active { transform: translateY(1px); }
.btn-ghost { background: transparent; }
.btn-ghost:hover { background: rgba(0,0,0,0.04); }
.btn-solid { background: var(--black); color: var(--white); }
.btn-solid:hover { background: #2d2d2d; }

/* ─── RESPONSIVE ─── */
@media (max-width: 600px) {
  :root { --sw: 52px; }
  .logo-b   { font-size: 14px; }
  .logo-script, .logo-pen { display: none; }
  .nav-btn span.nav-label { display: none; }
  .nav-btn  { justify-content: center; padding: 13px 0; }
  .create-btn { margin: 8px; padding: 11px 4px; font-size: 5.5px; letter-spacing: 0; }
  .topbar   { padding: 8px 12px; }
  .feed     { padding: 12px; }
}
`;

// ============================================================
// COMPONENTS
// ============================================================

function UserTag({ name, id }) {
  const p = PALETTES[id % PALETTES.length];
  return (
    <span className="user-tag" style={{ background: p.bg, color: p.text }}>
      {name}
    </span>
  );
}

function Post({ post, onLike }) {
  return (
    // .zone gives the hover-darkening grid effect per post
    <article className="post zone">
      <div className="post-head">
        <UserTag name={post.username} id={post.id} />
        <span className="timestamp">{post.timestamp}</span>
      </div>
      <div className="post-canvas">
        <BitCanvas bitmap={post.bitmap} />
      </div>
      <div className="post-foot">
        <button
          className={`like-btn${post.liked ? " liked" : ""}`}
          onClick={() => onLike(post.id)}
          aria-label="like"
        >
          <span className="like-heart">{post.liked ? "♥" : "♡"}</span>
          <span>{post.likes}</span>
        </button>
      </div>
    </article>
  );
}

function Feed({ posts, onLike }) {
  if (posts.length === 0) {
    return (
      <div className="feed">
        <div className="feed-empty">NO POSTS YET<br/>HIT + CREATE</div>
      </div>
    );
  }
  return (
    <div className="feed">
      {posts.map(p => <Post key={p.id} post={p} onLike={onLike} />)}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "feed",    icon: "⊞", label: "Feed"    },
  { id: "profile", icon: "◉", label: "Profile"  },
  { id: "explore", icon: "⊕", label: "Explore"  },
];

function Sidebar({ active, onChange, onCreate }) {
  return (
    <nav className="sidebar zone">
      {/* LOGO — mimics the mockup's "B it.board ✏" logo */}
      <div className="logo-wrap">
        <span className="logo-b">B</span>
        <span className="logo-script">it.board</span>
        <span className="logo-pen">✏</span>
      </div>

      {NAV_ITEMS.map(n => (
        <button
          key={n.id}
          className={`nav-btn${active === n.id ? " active" : ""}`}
          onClick={() => onChange(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          <span className="nav-label">{n.label}</span>
        </button>
      ))}

      <div className="spacer" />
      <button className="create-btn" onClick={onCreate}>+ CREATE</button>
    </nav>
  );
}

function Topbar({ title }) {
  return (
    <header className="topbar zone">
      <span className="topbar-title">{title.toUpperCase()}</span>
      <div className="avatar">◉</div>
    </header>
  );
}

// Format options for the Create modal
// w/h here are just the aspect-ratio icon dimensions (visual only)
const FMT_OPTS = [
  { key: "banner", label: "Banner", dims: "64×16", aw: 40, ah: 10 },
  { key: "square", label: "Square", dims: "32×32", aw: 24, ah: 24 },
  { key: "wide",   label: "Wide",   dims: "96×12", aw: 46, ah:  6 },
  { key: "tall",   label: "Tall",   dims: "16×48", aw: 12, ah: 36 },
];

function CreateModal({ onClose, onPost }) {
  const [fmt, setFmt] = useState("banner");

  const handlePost = () => {
    const F = FORMATS[fmt] || FORMATS.banner;
    // Placeholder: random sparse noise until the real drawing engine connects
    const pixels = genNoise(F.width, F.height, 0.18);
    onPost({ bitmap: { ...F, pixels }, format: fmt });
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">NEW POST</span>
          <button className="modal-x" onClick={onClose} aria-label="close">✕</button>
        </div>

        <div className="modal-body">
          {/* FORMAT SELECTOR */}
          <div>
            <span className="section-label">FORMAT</span>
            <div className="fmt-grid">
              {FMT_OPTS.map(f => (
                <button
                  key={f.key}
                  className={`fmt-opt${fmt === f.key ? " sel" : ""}`}
                  onClick={() => setFmt(f.key)}
                >
                  {/* Aspect-ratio icon */}
                  <span
                    className="fmt-icon"
                    style={{ width: f.aw, height: f.ah }}
                  />
                  {f.label}
                  <span className="fmt-dims">{f.dims}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CANVAS PLACEHOLDER — drawing engine plugs in here */}
          <div>
            <span className="section-label">CANVAS</span>
            <div className="canvas-ph">
              DRAWING ENGINE<br />COMING SOON
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-solid" onClick={handlePost}>Post</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROOT APP
// ============================================================
export default function Bitboard() {
  const [posts,     setPosts]     = useState(INIT_POSTS);
  const [activeNav, setActiveNav] = useState("feed");
  const [modal,     setModal]     = useState(false);

  // Toggle like — immutable update
  const handleLike = useCallback(id =>
    setPosts(prev => prev.map(p =>
      p.id !== id ? p : {
        ...p,
        liked: !p.liked,
        likes: p.liked ? p.likes - 1 : p.likes + 1,
      }
    )), []);

  // Prepend new post to feed
  const handlePost = useCallback(({ bitmap, format }) =>
    setPosts(prev => [{
      id:        Date.now(),
      username:  "you",
      timestamp: "now",
      likes:     0,
      liked:     false,
      bitmap,
      format,
    }, ...prev]), []);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <Sidebar
          active={activeNav}
          onChange={setActiveNav}
          onCreate={() => setModal(true)}
        />
        <div className="main">
          <Topbar title={activeNav} />
          <Feed posts={posts} onLike={handleLike} />
        </div>
        {modal && (
          <CreateModal
            onClose={() => setModal(false)}
            onPost={handlePost}
          />
        )}
      </div>
    </>
  );
}

