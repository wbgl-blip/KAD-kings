// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================================================
   CONFIG
========================================================= */

const DEV_MODE = true;

/* =========================================================
   CONSTANTS
========================================================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — drawer starts when ready",
  2: "Pick someone to drink",
  3: "Me — drawer drinks",
  4: "Women drink",
  5: "Guys drink",
  6: "Everyone drinks",
  7: "Heaven — power",
  8: "Pick a mate",
  9: "Rhyme — loser drinks",
  10: "Categories — loser drinks",
  J: "Thumbmaster — power",
  Q: "Question Master",
  K: "Make a rule",
};

const FLASH_MS = 2000;

/* =========================================================
   DECK
========================================================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({ rank: r, suit: s });
    }
  }

  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* ---------- CORE STATE ---------- */

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [phase, setPhase] = useState("IDLE");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      mates: [],
      gender: "M",
    }))
  );

  /* ---------- POWERS ---------- */

  const [heavenMaster, setHeavenMaster] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  /* ---------- RULES ---------- */

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  /* ---------- REACTION ---------- */

  const [reaction, setReaction] = useState({
    type: null,
    owner: null,
    tapped: [],
  });

  /* ---------- FLASH ---------- */

  const [flashNames, setFlashNames] = useState(new Set());
  const flashTimer = useRef(null);

  /* ---------- DEV ---------- */

  const [showDeckInspector, setShowDeckInspector] = useState(false);

  /* ---------- REFS ---------- */

  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const currentPlayer = players[turnIndex];

  const isActionPhase = phase !== "IDLE";

  /* =========================================================
     HELPERS
  ========================================================= */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function flash(names) {
    clearTimeout(flashTimer.current);
    setFlashNames(new Set(names));
    flashTimer.current = setTimeout(
      () => setFlashNames(new Set()),
      FLASH_MS
    );
  }

  function addDrinkRecursive(name, visited = new Set()) {
    if (visited.has(name)) return visited;
    visited.add(name);

    setPlayers((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, beers: p.beers + 1 } : p
      )
    );

    const p = playersRef.current.find((x) => x.name === name);
    p?.mates.forEach((m) => addDrinkRecursive(m, visited));

    return visited;
  }

  function giveDrink(name) {
    const affected = addDrinkRecursive(name);
    flash([...affected]);
  }

  /* =========================================================
     DRAW CARD
  ========================================================= */

  function drawCard() {
    if (phase !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = currentPlayer.name;

    if (r === "A") return setPhase("WATERFALL");
    if (r === "2") return setPhase("PICK_DRINK");
    if (r === "3") {
      giveDrink(drawer);
      return nextTurn();
    }
    if (r === "4") {
      playersRef.current.filter(p => p.gender === "F")
        .forEach(p => giveDrink(p.name));
      return nextTurn();
    }
    if (r === "5") {
      playersRef.current.filter(p => p.gender === "M")
        .forEach(p => giveDrink(p.name));
      return nextTurn();
    }
    if (r === "6") {
      playersRef.current.forEach(p => giveDrink(p.name));
      return nextTurn();
    }
    if (r === "7") {
      setHeavenMaster(drawer);
      return nextTurn();
    }
    if (r === "8") return setPhase("PICK_MATE");
    if (r === "9" || r === "10") return setPhase("PICK_LOSER");
    if (r === "J") {
      setThumbMaster(drawer);
      return nextTurn();
    }
    if (r === "Q") {
      setQuestionMaster(drawer);
      return nextTurn();
    }
    if (r === "K") return setPhase("MAKE_RULE");

    nextTurn();
  }

  /* =========================================================
     PLAYER TAP
  ========================================================= */

  function tapPlayer(name) {
    if (phaseRef.current === "PICK_DRINK") {
      giveDrink(name);
      setPhase("IDLE");
      return nextTurn();
    }

    if (phaseRef.current === "PICK_MATE") {
      if (name === currentPlayer.name) return;

      setPlayers((prev) =>
        prev.map((p) =>
          p.name === currentPlayer.name && !p.mates.includes(name)
            ? { ...p, mates: [...p.mates, name] }
            : p
        )
      );
      setPhase("IDLE");
      return nextTurn();
    }

    if (phaseRef.current === "PICK_LOSER") {
      giveDrink(name);
      setPhase("IDLE");
      return nextTurn();
    }

    if (phaseRef.current === "REACTION") {
      if (name === reaction.owner) return;
      if (reaction.tapped.includes(name)) return;

      const taps = [...reaction.tapped, name];
      setReaction({ ...reaction, tapped: taps });

      if (taps.length === players.length - 1) {
        giveDrink(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
    }
  }

  /* =========================================================
     ACTIONS
  ========================================================= */

  function startReaction(type) {
    if (phase !== "IDLE") return;
    const owner = type === "THUMB" ? thumbMaster : heavenMaster;
    if (!owner) return;

    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION");
  }

  function startWaterfall() {
    giveDrink(currentPlayer.name);
    setPhase("IDLE");
    nextTurn();
  }

  /* =========================================================
     DEV DECK
  ========================================================= */

  function forceDraw(c) {
    setDeck((d) => d.filter((x) => x !== c));
    setCard(c);
    setShowDeckInspector(false);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
        {DEV_MODE && (
          <button className="dev-toggle" onClick={() => setShowDeckInspector(true)}>
            DEV
          </button>
        )}
      </header>

      {/* TOP GRID */}
      <section className="top-grid">
        <Panel
          title="🤝 Mates"
          items={players.flatMap(p => p.mates.map(m => `${p.name} → ${m}`))}
        />

        <div className="panel card-panel">
          <div
            className={`card ${phase !== "IDLE" ? "disabled" : ""}`}
            onClick={drawCard}
          >
            {!card ? (
              <div className="deck-stack">DECK</div>
            ) : (
              <>
                <div className="rank">{card.rank}{card.suit}</div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards left</div>
              </>
            )}
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {/* WATERFALL */}
      {phase === "WATERFALL" && (
        <button className="banner waterfall" onClick={startWaterfall}>
          🌊 Start Waterfall
        </button>
      )}

      {/* ACTION ROW */}
      <section className="actions actions-four">
        <button onClick={() => startReaction("THUMB")} disabled={!thumbMaster || phase !== "IDLE"}>👍</button>
        <button onClick={() => startReaction("HEAVEN")} disabled={!heavenMaster || phase !== "IDLE"}>☁</button>
        <button onClick={() => setPhase("PICK_LOSER")} disabled={phase !== "IDLE"}>🚫</button>
        <button onClick={() => setPhase("QM")} disabled={!questionMaster || phase !== "IDLE"}>❓</button>
      </section>

      {/* STATUS */}
      <section className="status-bar">
        {phase === "IDLE" ? "Tap the deck to draw" : RULE_TEXT[card?.rank]}
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${flashNames.has(p.name) ? "FLASH" : ""}`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video-slot" />
            <div className="player-footer">
              <span className="player-name">{p.name}</span>
              <div className="badges">
                {p.name === heavenMaster && <span className="badge b7">7</span>}
                {p.name === thumbMaster && <span className="badge bJ">J</span>}
                {p.name === questionMaster && <span className="badge bQ">Q</span>}
              </div>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>

      {/* DEV MODAL */}
      {DEV_MODE && showDeckInspector && (
        <div className="deck-modal">
          <h3>Deck Inspector</h3>
          <div className="deck-list">
            {deck.map((c, i) => (
              <button key={i} onClick={() => forceDraw(c)}>
                {c.rank}{c.suit}
              </button>
            ))}
          </div>
          <button onClick={() => setShowDeckInspector(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PANEL
========================================================= */

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
