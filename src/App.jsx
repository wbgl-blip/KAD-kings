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
  9: "Rhyme — drawer starts, pick the loser",
  10: "Categories — drawer starts, pick the loser",
  J: "Thumbmaster — last to press drinks",
  Q: "Question Master — answered question = drink",
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

  // WAITING | IDLE | WATERFALL_READY | PICK_DRINK | PICK_MATE | RHYME_PICK | CATEGORIES_PICK | THUMB_PICK | HEAVEN_PICK | MAKE_RULE
  const [phase, setPhase] = useState("WAITING");

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // future UI hook
      mates: [],
    }))
  );

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // UI-only flash for "drink owed" (2s)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // keep a fresh reference so mate-propagation doesn't use stale closures
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

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
    setPlayers((p) =>
      p.map((pl) => (pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl))
    );
  }

  function flashPlayers(names) {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(() => {
      setFlashNames(new Set());
      flashTimerRef.current = null;
    }, 2000);
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
    setStatusWithTurn("Tap the deck to draw");
  }

  function drawCard() {
    // Only the "active player" can draw: same device -> just enforce turn/phase
    if (phase !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    setStatusWithTurn(RULE_TEXT[r]);

    // === RULE HANDLING ===

    if (r === "A") {
      setPhase("WATERFALL_READY");
      // Wait for Ready press; drawer drinks first after ready (implemented in onReadyAction)
      return;
    }

    if (r === "2") {
      setPhase("PICK_DRINK");
      setStatusWithTurn("Pick someone to drink (tap a player)");
      return;
    }

    if (r === "3") {
      flashPlayers([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) flashPlayers(women);
      women.forEach((n) => propagateDrink(n));
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "5") {
      const guys = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (guys.length) flashPlayers(guys);
      guys.forEach((n) => propagateDrink(n));
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "6") {
      const all = playersRef.current.map((p) => p.name);
      flashPlayers(all);
      all.forEach((n) => propagateDrink(n));
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    if (r === "7") {
      // Heaven loser selection (until realtime taps exist)
      setPhase("HEAVEN_PICK");
      setStatusWithTurn("Heaven — tap the loser (player) to give +1");
      return;
    }

    if (r === "8") {
      setPhase("PICK_MATE");
      setStatusWithTurn("Pick a mate (tap a player)");
      return;
    }

    if (r === "9") {
      setPhase("RHYME_PICK");
      setStatusWithTurn("Rhyme — tap the loser (player) to give +1");
      return;
    }

    if (r === "10") {
      setPhase("CATEGORIES_PICK");
      setStatusWithTurn("Categories — tap the loser (player) to give +1");
      return;
    }

    if (r === "J") {
      // Thumb loser selection (until realtime taps exist)
      setPhase("THUMB_PICK");
      setStatusWithTurn("Thumbmaster — tap the loser (player) to give +1");
      return;
    }

    if (r === "Q") {
      // Placeholder: enforcement UI later
      nextTurn();
      setStatusWithTurn("Question Master active — tap the deck to draw");
      return;
    }

    if (r === "K") {
      setPhase("MAKE_RULE");
      setStatusWithTurn("Make a rule (type it below)");
      return;
    }
  }

  /* =========================
     INTERACTIONS
  ========================= */

  function tapPlayer(name) {
    // Always allow taps; only act in the needed phases
    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`Picked ${name} to drink. Tap the deck to draw`);
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
      setStatusWithTurn(`${currentPlayer.name} picked ${name} as a mate. Tap the deck to draw`);
      return;
    }

    if (phase === "RHYME_PICK" || phase === "CATEGORIES_PICK" || phase === "THUMB_PICK" || phase === "HEAVEN_PICK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${name} loses (+1). Tap the deck to draw`);
      return;
    }
  }

  function submitRule() {
    if (!ruleDraft.trim()) return;
    setRules((r) => [...r, ruleDraft.trim()]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
    setStatusWithTurn("Rule saved. Tap the deck to draw");
  }

  function onThumb() {
    // Keep button present always; only meaningful when needed later.
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
      // Drawer drinks first after ready
      flashPlayers([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Waterfall started (drawer drank first). Tap the deck to draw");
      return;
    }

    setStatusWithTurn("Ready");
  }

  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        el.requestFullscreen?.();
      }
    } catch {
      // ignore
    }
  }

  /* =========================
     MATES LIST (UI)
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    players.forEach((p) => p.mates.forEach((m) => out.push(`${p.name} → ${m}`)));
    return out;
  }, [players]);

  const rulesPanelItems = useMemo(() => {
    if (rules.length > 0) return rules.slice(-4).reverse();
    return ["—", "Draw K to add a rule", "—", "—"];
  }, [rules]);

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
        <Panel title="🤝 Mates" items={matesLines.length ? matesLines.slice(0, 4) : ["—", "—", "—", "—"]} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${
              phase !== "IDLE" ? "disabled" : ""
            }`}
            onClick={drawCard}
            role="button"
            aria-disabled={phase !== "IDLE"}
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

        <Panel title="📜 Rules" items={rulesPanelItems} />
      </section>

      {/* ACTION BUTTONS (ALWAYS PRESENT) */}
      <section className="actions">
        <button className="btn thumb" onClick={onThumb} disabled={phase === "WAITING"}>
          👍 Thumb
        </button>

        <button className="btn ready" onClick={onReadyAction}>
          Ready
        </button>

        <button className="btn heaven" onClick={onHeaven} disabled={phase === "WAITING"}>
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
          const isTurn = p.name === currentPlayer?.name;
          const isFlashing = flashNames.has(p.name);

          return (
            <div
              key={p.name}
              className={`player ${isTurn ? "TURN" : ""} ${isFlashing ? "FLASH" : ""}`}
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
