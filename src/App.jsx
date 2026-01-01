// src/App.jsx
import { useState, useMemo, useRef } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — wait for ready, drawer drinks first",
  2: "Pick someone to drink",
  3: "Me — drawer drinks",
  4: "Women drink",
  5: "Guys drink",
  6: "Everyone drinks",
  7: "Heaven — last to press drinks",
  8: "Pick a mate",
  9: "Rhyme — drawer enforces",
  10: "Categories — drawer enforces",
  J: "Thumbmaster — last to press drinks",
  Q: "Question Master — answer = drink",
  K: "Make a rule",
};

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach((r) => SUITS.forEach((s) => deck.push({ rank: r, suit: s })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState("WAITING");
  // WAITING | IDLE | WATERFALL_READY | WATERFALL_ACTIVE | PICK_MATE | PICK_DRINK | RHYME | CATEGORIES | MAKE_RULE

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // default; future UI hook
      mates: [],
      status: null,
      ready: false,
    }))
  );

  const [statusText, setStatusText] = useState(
    "Waiting for everyone to be ready"
  );
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // UI-only flash for "drink owed" (2s)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % players.length);
  }

  function addDrink(name) {
    setPlayers((p) =>
      p.map((pl) => (pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl))
    );
  }

  function flashPlayers(names) {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    const next = new Set(names);
    setFlashNames(next);

    flashTimerRef.current = setTimeout(() => {
      setFlashNames(new Set());
      flashTimerRef.current = null;
    }, 2000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);

    addDrink(name);

    const player = players.find((p) => p.name === name);
    player?.mates.forEach((m) => propagateDrink(m, visited));
  }

  function setStatusWithTurn(message) {
    const turn = currentPlayer?.name ? ` — ${currentPlayer.name}'s turn` : "";
    setStatusText(`${message}${turn}`);
  }

  /* =========================
     GAME FLOW
  ========================= */

  function startGame() {
    setPhase("IDLE");
    setStatusWithTurn("Draw a card");
  }

  function drawCard() {
    if (phase !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    setStatusWithTurn(RULE_TEXT[r]);

    // === RULE HANDLING ===

    if (r === "A") {
      setPhase("WATERFALL_READY");
      setPlayers((p) => p.map((pl) => ({ ...pl, ready: false })));
      return;
    }

    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    if (r === "3") {
      flashPlayers([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
      return;
    }

    if (r === "4") {
      const women = players.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) flashPlayers(women);
      women.forEach((n) => propagateDrink(n));
      nextTurn();
      return;
    }

    if (r === "5") {
      const guys = players.filter((p) => p.gender === "M").map((p) => p.name);
      if (guys.length) flashPlayers(guys);
      guys.forEach((n) => propagateDrink(n));
      nextTurn();
      return;
    }

    if (r === "6") {
      const all = players.map((p) => p.name);
      flashPlayers(all);
      all.forEach((n) => propagateDrink(n));
      nextTurn();
      return;
    }

    if (r === "7") {
      // Heaven trigger handled via Heaven button (later)
      setPhase("IDLE");
      nextTurn();
      return;
    }

    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    if (r === "9") {
      setPhase("RHYME");
      return;
    }

    if (r === "10") {
      setPhase("CATEGORIES");
      return;
    }

    if (r === "J") {
      setStatusWithTurn("Thumbmaster active — can be triggered anytime");
      nextTurn();
      return;
    }

    if (r === "Q") {
      setStatusWithTurn("Question Master active — answers cause drinks");
      nextTurn();
      return;
    }

    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }
  }

  /* =========================
     INTERACTIONS
  ========================= */

  function tapPlayer(name) {
    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`Picked ${name} to drink`);
      return;
    }

    if (phase === "PICK_MATE" && name !== currentPlayer.name) {
      setPlayers((p) =>
        p.map((pl) =>
          pl.name === currentPlayer.name && !pl.mates.includes(name)
            ? { ...pl, mates: [...pl.mates, name] }
            : pl
        )
      );
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${currentPlayer.name} picked ${name} as a mate`);
      return;
    }
  }

  function submitRule() {
    if (!ruleDraft.trim()) return;
    setRules((r) => [...r, ruleDraft.trim()]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
    setStatusWithTurn("Rule saved");
  }

  function onThumb() {
    if (phase === "WAITING") return;
    setStatusWithTurn("Thumb pressed");
  }

  function onHeaven() {
    if (phase === "WAITING") return;
    setStatusWithTurn("Heaven pressed");
  }

  function onReadyAction() {
    if (phase === "WAITING") {
      startGame();
      return;
    }

    if (phase === "WATERFALL_READY") {
      // Placeholder (logic later)
      setStatusWithTurn("Waterfall ready (logic coming next)");
      setPhase("IDLE");
      nextTurn();
      return;
    }

    setStatusWithTurn("Ready");
  }

  function enterFullscreen() {
    const el = document.documentElement;

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
        return;
      }
      el.requestFullscreen?.();
    } catch {
      // do nothing; browser may block
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <button
          className="fullscreen-btn"
          onClick={enterFullscreen}
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          ⛶
        </button>
      </header>

      {/* TOP GRID */}
      <section className="top-grid">
        <Panel title="🤝 Mates" />
        <div className="panel card-panel">
          {!card ? (
            <div className="card draw" onClick={drawCard}>
              DRAW
            </div>
          ) : (
            <div className="card active">
              <div className="rank">
                {card.rank}
                {card.suit}
              </div>
              <div className="rule-text">{RULE_TEXT[card.rank]}</div>
              <div className="sub">{deck.length} cards remaining</div>
            </div>
          )}
        </div>
        <Panel title="📜 Rules" items={rules} />
      </section>

      {/* ACTION BUTTONS (RESTORED) */}
      <section className="actions">
        <button
          className="btn thumb"
          onClick={onThumb}
          disabled={phase === "WAITING"}
        >
          👍 Thumb
        </button>

        <button className="btn ready" onClick={onReadyAction}>
          Ready
        </button>

        <button
          className="btn heaven"
          onClick={onHeaven}
          disabled={phase === "WAITING"}
        >
          ☁ Heaven
        </button>
      </section>

      {/* STATUS BAR */}
      <section className="status-bar">
        <span>{statusText}</span>
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => {
          const isTurn = p.name === currentPlayer.name;
          const isFlashing = flashNames.has(p.name);

          return (
            <div
              key={p.name}
              className={`player ${isTurn ? "TURN" : ""} ${
                isFlashing ? "FLASH" : ""
              }`}
              onClick={() => tapPlayer(p.name)}
            >
              <div className="video-slot" />
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          );
        })}
      </section>

      {/* RULE INPUT */}
      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule…"
          />
          <button onClick={submitRule}>Save Rule</button>
        </div>
      )}

      {/* START (KEPT) */}
      {phase === "WAITING" && (
        <button className="start" onClick={startGame}>
          Ready
        </button>
      )}
    </div>
  );
}

function Panel({ title, items = [] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row">
          {items[i] || "—"}
        </div>
      ))}
    </div>
  );
         }
