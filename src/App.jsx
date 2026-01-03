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

const randInt = (min, max) =>
  Math.floor(min + Math.random() * (max - min + 1));

/* =====================================================
   APP
===================================================== */

export default function App() {
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
  const consumeTapRef = useRef(false);

  const [wfRemaining, setWfRemaining] = useState(0);
  const wfIntervalRef = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const currentPlayer = players[turnIndex];

  /* =====================================================
     CLEANUP
  ===================================================== */

  useEffect(() => {
    return () => {
      clearTimeout(flashTimerRef.current);
      clearInterval(wfIntervalRef.current);
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

  function giveEveryone(amount) {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, beers: p.beers + amount }))
    );
  }

  /* =====================================================
     WATERFALL (ACE)
===================================================== */

  function beginWaterfallReady() {
    clearInterval(wfIntervalRef.current);
    setWfRemaining(0);
    setPhase("WATERFALL_READY");
  }

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const seconds = randInt(WF_MIN_S, WF_MAX_S);
    setWfRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    wfIntervalRef.current = setInterval(() => {
      giveEveryone(1);
      setWfRemaining((s) => {
        if (s <= 1) {
          clearInterval(wfIntervalRef.current);
          setPhase("IDLE");
          nextTurn();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function cancelWaterfall() {
    clearInterval(wfIntervalRef.current);
    setWfRemaining(0);
    setPhase("IDLE");
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
    applyCard(next.rank);
  }

  function applyCard(rank) {
    const drawer = currentPlayer?.name;

    if (rank === "A") return beginWaterfallReady();
    if (rank === "2") return setPhase("PICK_DRINK");
    if (rank === "3") {
      giveDrinkWithFlash(drawer);
      return nextTurn();
    }
    if (rank === "6") {
      playersRef.current.forEach((p) => giveDrinkWithFlash(p.name));
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

  /* =====================================================
     PLAYER TAP
===================================================== */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
    }

    if (phaseRef.current === "PICK_MATE") {
      const drawer = currentPlayer.name;
      if (name === drawer) return;
      consumeTapRef.current = true;
      setPlayers((p) =>
        p.map((x) =>
          x.name === drawer
            ? { ...x, mates: [...new Set([...x.mates, name])] }
            : x
        )
      );
      setPhase("IDLE");
      nextTurn();
    }

    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPendingLoserMode(null);
      setPhase("IDLE");
      nextTurn();
    }

    setTimeout(() => (consumeTapRef.current = false), 0);
  }

  /* =====================================================
     STATUS TEXT
===================================================== */

  function statusText() {
    if (!card) return "Tap the deck to start";
    if (phase === "WATERFALL_READY")
      return "🌊 Waterfall — press Start (random 3–20s, +1 per second)";
    if (phase === "WATERFALL_RUNNING")
      return `🌊 Waterfall running — ${wfRemaining}s`;
    if (phase === "PICK_MATE") return "Pick ONE mate";
    if (phase === "PICK_DRINK") return "Pick someone to drink";
    if (phase === "PICK_LOSER")
      return `${pendingLoserMode} — tap the loser`;
    if (phase === "MAKE_RULE") return "Create a rule";
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
        <Panel title="🤝 Mates" items={players.flatMap((p) =>
          p.mates.map((m) => `${p.name} → ${m}`)
        )} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${
              phase !== "IDLE" ? "disabled" : ""
            }`}
            onClick={drawCard}
          >
            <div className="card-face">
              <div className="card-rank">
                {card ? `${card.rank}${card.suit}` : "DECK"}
              </div>
              <div className="card-label">
                {card ? CARD_LABEL[card.rank] : "Tap to Start"}
              </div>
              <div className="card-sub">{deck.length} cards left</div>
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {(phase === "WATERFALL_READY" || phase === "WATERFALL_RUNNING") && (
        <div className="banner waterfall">
          <div className="banner-top">
            <strong>🌊 Waterfall</strong>
            <button onClick={cancelWaterfall}>✕</button>
          </div>

          {phase === "WATERFALL_READY" ? (
            <button className="wf-start" onClick={startWaterfall}>
              Start
            </button>
          ) : (
            <div className="wf-count">{wfRemaining}s</div>
          )}
        </div>
      )}

      <div className="status-bar">{statusText()}</div>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${
              p.name === currentPlayer?.name ? "TURN" : ""
            } ${flashNames.has(p.name) ? "FLASH" : ""}`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video-slot" />
            <div className="player-footer">
              <span>{p.name}</span>
              <span>🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type rule..."
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
          {items[i] || "—"}
        </div>
      ))}
    </div>
  );
}
