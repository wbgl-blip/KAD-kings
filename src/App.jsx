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
  7: "Heaven (Power) — owner can start anytime",
  8: "Pick a mate",
  9: "Rhyme — loser drinks",
  10: "Categories — loser drinks",
  J: "Thumbmaster (Power) — owner can start anytime",
  Q: "Question Master — QM taps who answered",
  K: "Make a rule",
};

const LOSER_REASON_TEXT = {
  HEAVEN: "Heaven",
  THUMB: "Thumb",
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
};

const DRINK_FLASH_MS = 2000;

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });

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

  // WAITING | IDLE | PICK_DRINK | PICK_MATE | PICK_LOSER | MAKE_RULE | WATERFALL_READY | REACTION_ACTIVE | QM_PICK
  const [phase, setPhase] = useState("WAITING");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [thumbMaster, setThumbMaster] = useState(null);
  const [heavenMaster, setHeavenMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const [loserReason, setLoserReason] = useState(null);

  const [reaction, setReaction] = useState({
    type: null,
    owner: null,
    tapped: [],
  });

  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  // HARD LOCKS (critical)
  const mateLockRef = useRef(false);
  const reactionLockRef = useRef(false);

  const currentPlayer = players[turnIndex];

  const isActionPhase = [
    "PICK_DRINK",
    "PICK_MATE",
    "PICK_LOSER",
    "MAKE_RULE",
    "WATERFALL_READY",
    "REACTION_ACTIVE",
    "QM_PICK",
  ].includes(phase);

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function setStatusWithTurn(text) {
    const name = playersRef.current[turnIndex]?.name;
    setStatusText(name ? `${text} — ${name}'s turn` : text);
  }

  function flashPlayers(names) {
    clearTimeout(flashTimerRef.current);
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(
      () => setFlashNames(new Set()),
      DRINK_FLASH_MS
    );
  }

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, beers: p.beers + 1 } : p
      )
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    addDrink(name);
    const p = playersRef.current.find((x) => x.name === name);
    p?.mates.forEach((m) => propagateDrink(m, visited));
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = currentPlayer?.name;

    setStatusWithTurn(RULE_TEXT[r]);

    if (r === "8") {
      mateLockRef.current = false;
      setPhase("PICK_MATE");
      return;
    }

    if (r === "7") {
      setHeavenMaster(drawer);
      nextTurn();
      return;
    }

    if (r === "J") {
      setThumbMaster(drawer);
      nextTurn();
      return;
    }

    if (r === "Q") {
      setQuestionMaster(drawer);
      nextTurn();
      return;
    }

    nextTurn();
  }

  /* =========================
     PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    const drawer = currentPlayer?.name;

    // PICK MATE (LOCKED)
    if (phase === "PICK_MATE") {
      if (mateLockRef.current) return;
      if (name === drawer) return;

      let added = false;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          added = true;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      if (!added) {
        setStatusWithTurn("That mate is already selected — pick someone else");
        return;
      }

      mateLockRef.current = true;
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Mate selected. Tap the deck to draw");
      return;
    }

    // REACTION (7 / J) — LAST TAP DRINKS
    if (phase === "REACTION_ACTIVE") {
      if (reactionLockRef.current) return;
      if (name === reaction.owner) return;
      if (reaction.tapped.includes(name)) return;

      const tapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped }));

      if (tapped.length === players.length - 1) {
        reactionLockRef.current = true;
        const loser = tapped[tapped.length - 1];
        flashPlayers([loser]);
        propagateDrink(loser);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
        setStatusWithTurn(`${loser} was last — drinks`);
      }
      return;
    }

    // QM
    if (phase === "QM_PICK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      setStatusWithTurn(`${name} answered (+1)`);
    }
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function onReady() {
    if (phase === "WAITING") {
      setPhase("IDLE");
      setStatusWithTurn("Tap the deck to draw");
    }
  }

  function startReaction(type) {
    if (phase !== "IDLE") return;
    const owner = type === "THUMB" ? thumbMaster : heavenMaster;
    if (!owner) return;

    reactionLockRef.current = false;
    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION_ACTIVE");
    setStatusWithTurn(`${type} active — tap your tile`);
  }

  function onQM() {
    if (phase !== "IDLE" || !questionMaster) return;
    setPhase("QM_PICK");
    setStatusWithTurn(`QM active (${questionMaster}) — tap who answered`);
  }

  /* =========================
     LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    players.forEach((p) =>
      p.mates.forEach((m) => out.push(`${p.name} → ${m}`))
    );
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
            className={`card ${card ? "active" : "draw"} ${
              phase !== "IDLE" && phase !== "WAITING" ? "disabled" : ""
            }`}
            onClick={drawCard}
          >
            {!card ? (
              <div className="card-draw-label">DECK</div>
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

      <section className="actions">
        <button className="btn thumb" onClick={() => startReaction("THUMB")}>👍 Thumb</button>
        <button className="btn ready" onClick={onReady}>Ready</button>
        <button className="btn heaven" onClick={() => startReaction("HEAVEN")}>☁ Heaven</button>
      </section>

      <section className="status-bar">
        <div className="status-main">{statusText}</div>
        <div className="status-meta">
          <span className="meta-pill">Turn: {currentPlayer?.name}</span>
          <span className="meta-pill">7: {heavenMaster || "—"}</span>
          <span className="meta-pill">J: {thumbMaster || "—"}</span>
          <span className="meta-pill">Q: {questionMaster || "—"}</span>
          <button className="meta-btn" onClick={onQM}>QM Tap</button>
        </div>
      </section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${flashNames.has(p.name) ? "FLASH" : ""} ${
              !isActionPhase && p.name === currentPlayer?.name ? "TURN" : ""
            }`}
            onClick={() => tapPlayer(p.name)}
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
              setRules((r) => [...r, ruleDraft]);
              setRuleDraft("");
              setPhase("IDLE");
              nextTurn();
            }}
          >
            Save Rule
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================
   PANEL
========================= */

function Panel({ title, items = [] }) {
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
