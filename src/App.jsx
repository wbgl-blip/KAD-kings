// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

/* =====================================================
   CONSTANTS
===================================================== */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const CARD_LABEL = {
  A: "Waterfall",
  2: "Pick Drink",
  3: "Me",
  4: "Women",
  5: "Guys",
  6: "Everyone",
  7: "Heaven",
  8: "Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumb",
  Q: "Questions",
  K: "Rule",
};

const DRINK_FLASH_MS = 2000;

// Waterfall (Ace)
const WF_MIN_S = 3;
const WF_MAX_S = 20;

/* =====================================================
   DECK
===================================================== */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  /**
   * PHASES
   * IDLE
   * WATERFALL_READY
   * WATERFALL_RUNNING
   * PICK_DRINK
   * PICK_MATE
   * PICK_LOSER
   * MAKE_RULE
   * REACTION_ACTIVE
   * QM_PICK
   * RULE_BREAK_PICK
   */
  const [phase, setPhase] = useState("IDLE");

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [heavenMaster, setHeavenMaster] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");
  const [pendingLoserMode, setPendingLoserMode] = useState(null);

  const [reaction, setReaction] = useState({
    type: null,
    owner: null,
    tapped: [],
  });

  const [flashNames, setFlashNames] = useState(new Set());
  const flashTimerRef = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const currentPlayer = players[turnIndex];

  // Waterfall
  const [wfRemaining, setWfRemaining] = useState(0);
  const wfIntervalRef = useRef(null);

  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (wfIntervalRef.current) clearInterval(wfIntervalRef.current);
    };
  }, []);

  /* =====================================================
     HELPERS
  ===================================================== */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function flashPlayers(names) {
    clearTimeout(flashTimerRef.current);
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(
      () => setFlashNames(new Set()),
      DRINK_FLASH_MS
    );
  }

  function mateClosure(start) {
    const visited = new Set();
    const stack = [start];
    while (stack.length) {
      const n = stack.pop();
      if (!n || visited.has(n)) continue;
      visited.add(n);
      const mates =
        playersRef.current.find((p) => p.name === n)?.mates || [];
      mates.forEach((m) => stack.push(m));
    }
    return visited;
  }

  function giveDrinkWithFlash(name) {
    const affected = mateClosure(name);
    setPlayers((prev) =>
      prev.map((p) =>
        affected.has(p.name) ? { ...p, beers: p.beers + 1 } : p
      )
    );
    flashPlayers([...affected]);
  }

  function giveManyWithFlash(names) {
    const union = new Set();
    names.forEach((n) => mateClosure(n).forEach((x) => union.add(x)));
    setPlayers((prev) =>
      prev.map((p) =>
        union.has(p.name) ? { ...p, beers: p.beers + 1 } : p
      )
    );
    flashPlayers([...union]);
  }

  function addEveryoneNoMates() {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, beers: p.beers + 1 }))
    );
  }

  /* =====================================================
     WATERFALL (ACE) — FINAL
===================================================== */

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const seconds = randInt(WF_MIN_S, WF_MAX_S);
    setWfRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    wfIntervalRef.current = setInterval(() => {
      setWfRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(wfIntervalRef.current);
          wfIntervalRef.current = null;
          setPhase("IDLE");
          nextTurn();
          return 0;
        }

        // +1 EVERY SECOND (no mates, no flash)
        addEveryoneNoMates();
        return prev - 1;
      });
    }, 1000);
  }

  /* =====================================================
     DRAW CARD
===================================================== */

  function applyDraw(rank) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (rank === "A") return setPhase("WATERFALL_READY");
    if (rank === "2") return setPhase("PICK_DRINK");
    if (rank === "3") {
      giveDrinkWithFlash(drawer);
      return nextTurn();
    }
    if (rank === "4") {
      giveManyWithFlash(playersRef.current.filter(p => p.gender === "F").map(p => p.name));
      return nextTurn();
    }
    if (rank === "5") {
      giveManyWithFlash(playersRef.current.filter(p => p.gender === "M").map(p => p.name));
      return nextTurn();
    }
    if (rank === "6") {
      giveManyWithFlash(playersRef.current.map(p => p.name));
      return nextTurn();
    }
    if (rank === "7") {
      setHeavenMaster(drawer);
      return nextTurn();
    }
    if (rank === "8") return setPhase("PICK_MATE");
    if (rank === "9") {
      setPendingLoserMode("RHYME");
      return setPhase("PICK_LOSER");
    }
    if (rank === "10") {
      setPendingLoserMode("CATEGORIES");
      return setPhase("PICK_LOSER");
    }
    if (rank === "J") {
      setThumbMaster(drawer);
      return nextTurn();
    }
    if (rank === "Q") {
      setQuestionMaster(drawer);
      return nextTurn();
    }
    if (rank === "K") return setPhase("MAKE_RULE");

    nextTurn();
  }

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    const [next, ...rest] = deckRef.current;
    if (!next) return;
    setDeck(rest);
    setCard(next);
    applyDraw(next.rank);
  }

  /* =====================================================
     STATUS
===================================================== */

  function statusCopy() {
    if (!card) return "Tap the deck to start";
    if (phase === "WATERFALL_READY")
      return "Waterfall — tap Start when ready";
    if (phase === "WATERFALL_RUNNING")
      return `🌊 Waterfall — +1 drink per second (${wfRemaining}s)`;
    if (phase === "PICK_MATE") return "Pick ONE mate";
    if (phase === "PICK_DRINK") return "Pick someone to drink";
    if (phase === "PICK_LOSER")
      return `${pendingLoserMode === "CATEGORIES" ? "Categories" : "Rhyme"} — tap loser`;
    if (phase === "MAKE_RULE") return "Make a rule";
    return CARD_LABEL[card.rank];
  }

  /* =====================================================
     RENDER
===================================================== */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
      </header>

      <section className="top-grid">
        <Panel title="🤝 Mates" items={[]} />

        <div className="panel card-panel">
          <div className={`card ${card ? "active" : "draw"}`} onClick={drawCard}>
            <div className="card-face">
              <div className="card-rank">
                {card ? `${card.rank}${card.suit}` : "DECK"}
              </div>
              <div className="card-label">
                {card ? CARD_LABEL[card.rank] : "Tap to Start"}
              </div>
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {phase === "WATERFALL_READY" && (
        <div className="banner waterfall">
          <button className="wf-start" onClick={startWaterfall}>
            🌊 Start Waterfall
          </button>
        </div>
      )}

      <section className="status-bar">
        <div className="status-main">{statusCopy()}</div>
      </section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${
              p.name === currentPlayer?.name ? "TURN" : ""
            } ${flashNames.has(p.name) ? "FLASH" : ""}`}
          >
            <div className="video-slot" />
            <div className="player-footer">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule…"
          />
          <button
            onClick={() => {
              if (!ruleDraft.trim()) return;
              setRules((r) => [...r, ruleDraft.trim()]);
              setRuleDraft("");
              setPhase("IDLE");
              nextTurn();
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PANEL
===================================================== */

function Panel({ title, items }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row">
          <span className="row-text">{items[i] || "—"}</span>
        </div>
      ))}
    </div>
  );
}
