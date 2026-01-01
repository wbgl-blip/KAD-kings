// src/App.jsx
import { useMemo, useRef, useState } from "react";
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
  9: "Rhyme — tap loser",
  10: "Categories — tap loser",
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
  // WAITING | IDLE | PICK_DRINK | PICK_MATE | RHYME | CATEGORIES | MAKE_RULE

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(
    () => players[turnIndex],
    [players, turnIndex]
  );

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function setStatusWithTurn(msg) {
    setStatusText(`${msg} — ${playersRef.current[turnIndex].name}'s turn`);
  }

  function addDrink(name) {
    setPlayers((p) =>
      p.map((pl) =>
        pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl
      )
    );
  }

  function flashPlayers(names) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(() => setFlashNames(new Set()), 2000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    addDrink(name);
    const p = playersRef.current.find((x) => x.name === name);
    (p?.mates || []).forEach((m) => propagateDrink(m, visited));
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

    if (r === "2") return setPhase("PICK_DRINK");
    if (r === "8") return setPhase("PICK_MATE");
    if (r === "9") return setPhase("RHYME");
    if (r === "10") return setPhase("CATEGORIES");

    if (r === "3") {
      flashPlayers([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
      return;
    }

    if (r === "4") {
      const women = playersRef.current.filter(p => p.gender === "F").map(p => p.name);
      flashPlayers(women);
      women.forEach(propagateDrink);
      nextTurn();
      return;
    }

    if (r === "5") {
      const guys = playersRef.current.filter(p => p.gender === "M").map(p => p.name);
      flashPlayers(guys);
      guys.forEach(propagateDrink);
      nextTurn();
      return;
    }

    if (r === "6") {
      const all = playersRef.current.map(p => p.name);
      flashPlayers(all);
      all.forEach(propagateDrink);
      nextTurn();
      return;
    }

    if (r === "K") return setPhase("MAKE_RULE");

    nextTurn();
  }

  /* =========================
     PLAYER TAP ROUTER (FIX)
  ========================= */

  function tapPlayer(name) {
    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${name} drinks`);
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
      setStatusWithTurn(`${currentPlayer.name} picked ${name} as mate`);
      return;
    }

    if (phase === "RHYME" || phase === "CATEGORIES") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${name} lost`);
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

  function enterFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  const matesLines = useMemo(() => {
    const out = [];
    players.forEach(p => p.mates.forEach(m => out.push(`${p.name} → ${m}`)));
    return out;
  }, [players]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
        <button className="fullscreen-btn" onClick={enterFullscreen}>⛶</button>
      </header>

      <section className="top-grid">
        <Panel title="🤝 Mates" items={matesLines} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"}`}
            onClick={drawCard}
          >
            {!card ? "DRAW" : (
              <>
                <div className="rank">{card.rank}{card.suit}</div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards remaining</div>
              </>
            )}
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {/* ACTIONS — FIXED: ALWAYS PRESENT */}
      <section className="actions">
        <button className="btn thumb">👍 Thumb</button>
        <button className="btn ready" onClick={startGame}>Ready</button>
        <button className="btn heaven">☁ Heaven</button>
      </section>

      <section className="status-bar">{statusText}</section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${p.name === currentPlayer?.name ? "TURN" : ""} ${flashNames.has(p.name) ? "FLASH" : ""}`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video-slot" />
            <span className="player-name">{p.name}</span>
            <span className="player-beers">🍺 {p.beers}</span>
          </div>
        ))}
      </section>

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input value={ruleDraft} onChange={(e) => setRuleDraft(e.target.value)} />
          <button onClick={submitRule}>Save Rule</button>
        </div>
      )}
    </div>
  );
}

function Panel({ title, items = [] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row">{items[i] || "—"}</div>
      ))}
    </div>
  );
}
