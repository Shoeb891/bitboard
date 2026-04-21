// HangmanDrawing — SVG gallows that reveals body parts as wrong guesses accumulate.
// wrongCount: 0 = just the gallows, 6 = full figure (game over).

export default function HangmanDrawing({ wrongCount = 0 }) {
  const w = wrongCount;
  const lineProps = {
    stroke: "var(--black, #1a1a1a)",
    strokeWidth: 3,
    strokeLinecap: "round",
  };

  return (
    <svg
      viewBox="0 0 200 220"
      width="200"
      height="220"
      style={{ display: "block" }}
    >
      {/* ── Gallows (always visible) ── */}
      {/* Base */}
      <line x1="10" y1="210" x2="100" y2="210" {...lineProps} />
      {/* Pole */}
      <line x1="40" y1="210" x2="40" y2="15" {...lineProps} />
      {/* Beam */}
      <line x1="40" y1="15" x2="140" y2="15" {...lineProps} />
      {/* Rope */}
      <line x1="140" y1="15" x2="140" y2="38" {...lineProps} />

      {/* ── Body parts appear one per wrong guess ── */}

      {/* 1 — Head */}
      {w >= 1 && (
        <circle cx="140" cy="58" r="20" fill="none" {...lineProps} />
      )}

      {/* 2 — Body */}
      {w >= 2 && (
        <line x1="140" y1="78" x2="140" y2="140" {...lineProps} />
      )}

      {/* 3 — Left arm */}
      {w >= 3 && (
        <line x1="140" y1="95" x2="110" y2="125" {...lineProps} />
      )}

      {/* 4 — Right arm */}
      {w >= 4 && (
        <line x1="140" y1="95" x2="170" y2="125" {...lineProps} />
      )}

      {/* 5 — Left leg */}
      {w >= 5 && (
        <line x1="140" y1="140" x2="110" y2="178" {...lineProps} />
      )}

      {/* 6 — Right leg */}
      {w >= 6 && (
        <line x1="140" y1="140" x2="170" y2="178" {...lineProps} />
      )}
    </svg>
  );
}
