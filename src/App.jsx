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

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach((r) =>
    SUITS.forEach((s) => deck.push({ rank: r, suit: s }))
  );

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
  const flashTimer = useRef(null);

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

  function setStatus(message) {
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
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashNames(new Set(names));
    flashTimer.current = setTimeout(
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

  /* =========================
     GAME FLOW
  ========================= */

  function startGame() {
    setPhase("IDLE");
    setStatus("Tap the deck to draw");
  }

  function drawCard() {
    if (phase !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    setStatus(RULE_TEXT[r]);

    if (r === "3") {
      flashPlayers([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
    }

    if (r === "4") {
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);
      flashPlayers(women);
      women.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);
      flashPlayers(men);
      men.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "6") {
      const all = playersRef.current.map((p) => p.name);
      flashPlayers(all);
      all.forEach(propagateDrink);
      nextTurn();
    }

    if (r === "8") setPhase("PICK_MATE");
    if (r === "2") setPhase("PICK_DRINK");
    if (r === "9") setPhase("RHYME");
    if (r === "10") setPhase("CATEGORIES");
    if (r === "K") setPhase("MAKE_RULE");

    if (["A", "7", "J", "Q"].includes(r)) nextTurn();
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
      setStatus(`Picked ${name} to drink`);
    }

    if (phase === "PICK_MATE" && name !== currentPlayer.name) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.name === currentPlayer.name && !p.mates.includes(name)
            ? { ...p, mates: [...p.mates, name] }
            : p
        )
      );
      setPhase("IDLE");
      nextTurn();
      setStatus(`${currentPlayer.name} picked ${name} as a mate`);
    }
  }

  function submitRule() {
    if (!ruleDraft.trim()) return;
    setRules((r) => [...r, ruleDraft.trim()]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
    setStatus("Rule saved");
  }

  function onThumb() {
    setStatus("Thumb pressed");
  }

  function onHeaven() {
    setStatus("Heaven pressed");
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }

  /* =========================
     MATES LIST
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
          <div className="card-wrapper">
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
        </div>

        <Panel
          title="📜 Rules"
          items={rules.length ? rules : ["Draw K to add a rule"]}
        />
      </section>

      <section className="actions">
        <button className="btn thumb" onClick={onThumb}>👍 Thumb</button>
        <button className="btn ready" onClick={startGame}>Ready</button>
        <button className="btn heaven" onClick={onHeaven}>☁ Heaven</button>
      </section>

      <section className="status-bar">{statusText}</section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${p.name === currentPlayer?.name ? "TURN" : ""} ${
              flashNames.has(p.name) ? "FLASH" : ""
            }`}
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
