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
  9: "Rhyme — loser drinks",
  10: "Categories — loser drinks",
  J: "Thumbmaster — last to press drinks",
  Q: "Question Master — answer = drink",
  K: "Make a rule",
};

const LOSER_REASON_TEXT = {
  HEAVEN: "Heaven",
  THUMB: "Thumb",
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
};

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({ rank: r, suit: s });
    }
  }
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

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");
  const [statusText, setStatusText] = useState(
    "Waiting for everyone to be ready"
  );

  const [flashNames, setFlashNames] = useState(new Set());
  const flashTimerRef = useRef(null);

  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);
  const [loserReason, setLoserReason] = useState(null);

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

  function setStatusWithTurn(message) {
    const name = playersRef.current[turnIndex]?.name;
    setStatusText(name ? `${message} — ${name}'s turn` : message);
  }

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.name === name ? { ...p, beers: p.beers + 1 } : p
      )
    );
  }

  function flashPlayers(names) {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(
      () => setFlashNames(new Set()),
      2000
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    addDrink(name);

    const p = playersRef.current.find((x) => x.name === name);
    (p?.mates || []).forEach((m) => propagateDrink(m, visited));
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }

  /* =========================
     GAME FLOW
  ========================= */

  function startGame() {
    setPhase("IDLE");
    setStatusWithTurn("Tap the deck to draw");
  }

  function drawCard() {
    if (phase !== "IDLE") return;
    if (deck.length === 0) {
      setStatusText("Deck empty — game over");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    setStatusWithTurn(RULE_TEXT[r]);

    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    if (r === "3") {
      flashPlayers([drawer]);
      propagateDrink(drawer);
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "4" || r === "5" || r === "6") {
      const targets =
        r === "4"
          ? playersRef.current.filter((p) => p.gender === "F")
          : r === "5"
          ? playersRef.current.filter((p) => p.gender === "M")
          : playersRef.current;

      flashPlayers(targets.map((p) => p.name));
      targets.forEach((p) => propagateDrink(p.name));
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "7") {
      setLoserReason("HEAVEN");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Heaven — tap the loser");
      return;
    }

    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      return;
    }

    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      return;
    }

    if (r === "J") {
      setThumbMaster(drawer);
      nextTurn();
      setStatusWithTurn(`Thumbmaster: ${drawer}`);
      return;
    }

    if (r === "Q") {
      setQuestionMaster(drawer);
      nextTurn();
      setStatusWithTurn(`Question Master: ${drawer}`);
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
    if (phase === "PICK_LOSER") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${LOSER_REASON_TEXT[loserReason]} — ${name} drinks`);
      return;
    }

    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${name} drinks`);
      return;
    }

    if (phase === "PICK_MATE") {
      const drawer = currentPlayer?.name;
      if (!drawer || drawer === name) return;

      setPlayers((prev) =>
        prev.map((p) =>
          p.name === drawer && !p.mates.includes(name)
            ? { ...p, mates: [...p.mates, name] }
            : p
        )
      );
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${drawer} picked ${name} as mate`);
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

  function onReadyAction() {
    if (phase === "WAITING") startGame();
    else if (phase === "WATERFALL_READY") {
      const drawer = currentPlayer?.name;
      flashPlayers([drawer]);
      propagateDrink(drawer);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Waterfall started");
    }
  }

  function onThumb() {
    if (!thumbMaster) {
      setStatusWithTurn("No Thumbmaster yet");
      return;
    }
    setLoserReason("THUMB");
    setPhase("PICK_LOSER");
    setStatusWithTurn("Thumb — tap loser");
  }

  function onHeaven() {
    setLoserReason("HEAVEN");
    setPhase("PICK_LOSER");
    setStatusWithTurn("Heaven — tap loser");
  }

  /* =========================
     DERIVED LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    players.forEach((p) =>
      p.mates.forEach((m) => out.push(`${p.name} → ${m}`))
    );
    return out;
  }, [players]);

  const rulesLines = rules.length ? rules : ["Draw K to add a rule"];

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
        <button className="fullscreen-btn" onClick={enterFullscreen}>
          ⛶
        </button>
      </header>

      <section className="top-grid">
        <Panel title="🤝 Mates" items={matesLines} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${
              phase !== "IDLE" ? "disabled" : ""
            }`}
            onClick={drawCard}
          >
            {!card ? (
              "DRAW"
            ) : (
              <>
                <div className="rank">
                  {card.rank}
                  {card.suit}
                </div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards left</div>
              </>
            )}
          </div>
        </div>

        <Panel title="📜 Rules" items={rulesLines} />
      </section>

      <section className="actions">
        <button className="btn thumb" onClick={onThumb}>
          👍 Thumb
        </button>
        <button className="btn ready" onClick={onReadyAction}>
          Ready
        </button>
        <button className="btn heaven" onClick={onHeaven}>
          ☁ Heaven
        </button>
      </section>

      <section className="status-bar">{statusText}</section>

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
            <span className="player-name">{p.name}</span>
            <span className="player-beers">🍺 {p.beers}</span>
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
          <button onClick={submitRule}>Save Rule</button>
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
        <div key={i} className="row">
          {items[i] || "—"}
        </div>
      ))}
    </div>
  );
}
