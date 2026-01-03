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
  2: "Pick",
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

// Waterfall config
const WF_MIN = 5;
const WF_MAX = 20;
const WF_DEFAULT = 7;
const WF_END_DRINKS = 3;

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  /* ---------------- CORE STATE ---------------- */

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

  /* ---------------- POWER BADGES ---------------- */

  const [heavenMaster, setHeavenMaster] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  /* ---------------- RULES ---------------- */

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");
  const [pendingLoserMode, setPendingLoserMode] = useState(null);

  /* ---------------- REACTION ---------------- */

  const [reaction, setReaction] = useState({
    type: null,
    owner: null,
    tapped: [],
  });

  /* ---------------- FLASH ---------------- */

  const [flashNames, setFlashNames] = useState(new Set());
  const flashRef = useRef(null);

  /* ---------------- WATERFALL ---------------- */

  const [wfSeconds, setWfSeconds] = useState(WF_DEFAULT);
  const [wfRandom, setWfRandom] = useState(false);
  const [wfRemaining, setWfRemaining] = useState(0);
  const wfTimerRef = useRef(null);

  /* ---------------- REFS ---------------- */

  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const consumeTapRef = useRef(false);

  const currentPlayer = useMemo(
    () => players[turnIndex],
    [players, turnIndex]
  );

  /* =====================================================
     HELPERS
  ===================================================== */

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  function flashPlayers(names) {
    clearTimeout(flashRef.current);
    setFlashNames(new Set(names));
    flashRef.current = setTimeout(
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
    if (!name || visited.has(name)) return visited;
    visited.add(name);
    addDrink(name);
    const mates =
      playersRef.current.find((p) => p.name === name)?.mates || [];
    mates.forEach((m) => propagateDrink(m, visited));
    return visited;
  }

  function giveDrinkWithFlash(name) {
    const affected = propagateDrink(name, new Set());
    flashPlayers([...affected]);
  }

  function giveManyWithFlash(names) {
    const all = new Set();
    names.forEach((n) => propagateDrink(n, all));
    flashPlayers([...all]);
  }

  /* =====================================================
     DRAW CARD
  ===================================================== */

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (!deckRef.current.length) return;

    const [next, ...rest] = deckRef.current;
    setDeck(rest);
    setCard(next);

    const drawer = playersRef.current[turnIndex]?.name;

    switch (next.rank) {
      case "A":
        setPhase("WATERFALL_READY");
        return;

      case "2":
        setPhase("PICK_DRINK");
        return;

      case "3":
        giveDrinkWithFlash(drawer);
        nextTurn();
        return;

      case "4": {
        const women = playersRef.current
          .filter((p) => p.gender === "F")
          .map((p) => p.name);
        giveManyWithFlash(women);
        nextTurn();
        return;
      }

      case "5": {
        const men = playersRef.current
          .filter((p) => p.gender === "M")
          .map((p) => p.name);
        giveManyWithFlash(men);
        nextTurn();
        return;
      }

      case "6": {
        const all = playersRef.current.map((p) => p.name);
        giveManyWithFlash(all);
        nextTurn();
        return;
      }

      case "7":
        setHeavenMaster(drawer);
        nextTurn();
        return;

      case "8":
        setPhase("PICK_MATE");
        return;

      case "9":
        setPendingLoserMode("RHYME");
        setPhase("PICK_LOSER");
        return;

      case "10":
        setPendingLoserMode("CATEGORIES");
        setPhase("PICK_LOSER");
        return;

      case "J":
        setThumbMaster(drawer);
        nextTurn();
        return;

      case "Q":
        setQuestionMaster(drawer);
        nextTurn();
        return;

      case "K":
        setPhase("MAKE_RULE");
        return;

      default:
        nextTurn();
    }
  }

  /* =====================================================
     PLAYER TAPS
  ===================================================== */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      consumeTapRef.current = false;
      return;
    }

    if (phaseRef.current === "PICK_MATE") {
      const drawer = currentPlayer?.name;
      if (name === drawer) return;
      consumeTapRef.current = true;
      setPlayers((prev) =>
        prev.map((p) =>
          p.name === drawer && !p.mates.includes(name)
            ? { ...p, mates: [...p.mates, name] }
            : p
        )
      );
      setPhase("IDLE");
      nextTurn();
      consumeTapRef.current = false;
      return;
    }

    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPendingLoserMode(null);
      setPhase("IDLE");
      nextTurn();
      consumeTapRef.current = false;
      return;
    }

    if (phaseRef.current === "REACTION_ACTIVE") {
      if (name === reaction.owner) return;
      if (reaction.tapped.includes(name)) return;

      const tapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped }));

      if (tapped.length === players.length - 1) {
        giveDrinkWithFlash(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
    }
  }

  /* =====================================================
     WATERFALL
  ===================================================== */

  function startWaterfall() {
    const seconds = wfRandom
      ? Math.floor(WF_MIN + Math.random() * (WF_MAX - WF_MIN + 1))
      : clamp(wfSeconds, WF_MIN, WF_MAX);

    setWfRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    wfTimerRef.current = setInterval(() => {
      setWfRemaining((s) => {
        if (s <= 1) {
          clearInterval(wfTimerRef.current);
          playersRef.current.forEach((p) => {
            setPlayers((prev) =>
              prev.map((x) =>
                x.name === p.name
                  ? { ...x, beers: x.beers + WF_END_DRINKS }
                  : x
              )
            );
          });
          setPhase("IDLE");
          nextTurn();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  /* =====================================================
     STATUS
  ===================================================== */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    if (phase === "WATERFALL_READY")
      return "Waterfall — everyone drinks. End: everyone +3";
    if (phase === "WATERFALL_RUNNING")
      return "Waterfall running — everyone drinks";
    if (phase === "PICK_MATE") return "Pick ONE mate";
    if (phase === "PICK_DRINK") return "Pick someone to drink (+ mates)";
    if (phase === "PICK_LOSER")
      return `${pendingLoserMode === "CATEGORIES" ? "Categories" : "Rhyme"} — tap the loser`;
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
        <Panel
          title="🤝 Mates"
          items={players.flatMap((p) =>
            p.mates.map((m) => `${p.name} → ${m}`)
          )}
        />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"}`}
            onClick={drawCard}
          >
            <div className="rank">
              {card ? `${card.rank}${card.suit}` : "DECK"}
            </div>
            <div className="rule-text">
              {card ? CARD_LABEL[card.rank] : "Tap to Start"}
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {phase === "WATERFALL_READY" && (
        <div className="banner waterfall">
          <div>
            Timer: {wfRandom ? "Random" : `${wfSeconds}s`}
          </div>
          <button onClick={startWaterfall}>Start Waterfall</button>
        </div>
      )}

      <section className="status-bar">
        <div className="status-main">{statusCopy()}</div>
      </section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player
              ${p.name === currentPlayer?.name ? "TURN" : ""}
              ${flashNames.has(p.name) ? "FLASH" : ""}
            `}
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
