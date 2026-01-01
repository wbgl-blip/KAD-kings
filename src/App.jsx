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
  9: "Rhyme — drawer enforces",
  10: "Categories — drawer enforces",
  J: "Thumbmaster — last to press drinks",
  Q: "Question Master — answer = drink",
  K: "Make a rule",
};

function buildDeck() {
  const deck = [];
  RANKS.forEach((r) => SUITS.forEach((s) => deck.push({ rank: r, suit: s })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState("WAITING");

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [statusText, setStatusText] = useState(
    "Waiting for everyone to be ready"
  );
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const [flashNames, setFlashNames] = useState(new Set());
  const flashTimer = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(
    () => players[turnIndex],
    [players, turnIndex]
  );

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function setStatus(msg) {
    setStatusText(`${msg} — ${currentPlayer.name}'s turn`);
  }

  function addDrink(name) {
    setPlayers((p) =>
      p.map((pl) =>
        pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl
      )
    );
  }

  function flash(names) {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashNames(new Set(names));
    flashTimer.current = setTimeout(() => setFlashNames(new Set()), 2000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    addDrink(name);
    const p = playersRef.current.find((x) => x.name === name);
    p?.mates.forEach((m) => propagateDrink(m, visited));
  }

  function startGame() {
    setPhase("IDLE");
    setStatusText("Tap the deck to draw");
  }

  function drawCard() {
    if (phase !== "IDLE") return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    setStatus(RULE_TEXT[r]);

    if (r === "3") {
      flash([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
    }

    if (r === "4") {
      const women = playersRef.current.filter(p => p.gender === "F").map(p => p.name);
      flash(women);
      women.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "5") {
      const men = playersRef.current.filter(p => p.gender === "M").map(p => p.name);
      flash(men);
      men.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "6") {
      const all = playersRef.current.map(p => p.name);
      flash(all);
      all.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "8") setPhase("PICK_MATE");
    if (r === "K") setPhase("MAKE_RULE");
  }

  function tapPlayer(name) {
    if (phase === "PICK_MATE" && name !== currentPlayer.name) {
      setPlayers(p =>
        p.map(pl =>
          pl.name === currentPlayer.name && !pl.mates.includes(name)
            ? { ...pl, mates: [...pl.mates, name] }
            : pl
        )
      );
      setPhase("IDLE");
      nextTurn();
    }
  }

  function submitRule() {
    if (!ruleDraft.trim()) return;
    setRules(r => [...r, ruleDraft]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
  }

  function enterFullscreen() {
    const el = document.documentElement;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen();
  }

  const matesLines = useMemo(() => {
    const out = [];
    players.forEach(p => p.mates.forEach(m => out.push(`${p.name} → ${m}`)));
    return out;
  }, [players]);

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
        <button className="fullscreen-btn" onClick={enterFullscreen}>⛶</button>
      </header>

      <section className="top-grid">
        <Panel title="🤝 Mates" items={matesLines} />

        <div className="panel card-panel">
          <div className="card-wrapper">
            <div className={`card ${card ? "active" : "draw"}`} onClick={drawCard}>
              {!card ? (
                "DRAW"
              ) : (
                <>
                  <div className="rank">{card.rank}{card.suit}</div>
                  <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                  <div className="sub">{deck.length} cards left</div>
                </>
              )}
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rules.length ? rules : ["Draw K to add a rule"]} />
      </section>

      <section className="actions">
        <button className="btn thumb">👍 Thumb</button>
        <button className="btn ready" onClick={startGame}>Ready</button>
        <button className="btn heaven">☁ Heaven</button>
      </section>

      <section className="status-bar">{statusText}</section>

      <section className="players">
        {players.map(p => (
          <div
            key={p.name}
            className={`player ${p.name === currentPlayer.name ? "TURN" : ""} ${flashNames.has(p.name) ? "FLASH" : ""}`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video-slot" />
            <div className="player-name">{p.name}</div>
            <div className="player-beers">🍺 {p.beers}</div>
          </div>
        ))}
      </section>

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input value={ruleDraft} onChange={e => setRuleDraft(e.target.value)} />
          <button onClick={submitRule}>Save</button>
        </div>
      )}
    </div>
  );
}

function Panel({ title, items }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row">{items[i] || "—"}</div>
      ))}
    </div>
  );
}
