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

  // Fisher-Yates shuffle
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

  // WAITING | IDLE | PICK_DRINK | PICK_MATE | PICK_LOSER | MAKE_RULE | WATERFALL_READY | ANSWER_PICK
  const [phase, setPhase] = useState("WAITING");

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // future UI hook; currently all M unless you change it in code
      mates: [],
    }))
  );

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");

  // Flash UI (2s)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Persistent roles
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  // Pending loser selection context
  const [loserReason, setLoserReason] = useState(null);

  // Avoid stale closure reads inside recursive mate propagation
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex((i) => {
      const n = playersRef.current.length;
      return n ? (i + 1) % n : 0;
    });
  }

  function setStatusWithTurn(message) {
    const name = playersRef.current[turnIndex]?.name;
    setStatusText(name ? `${message} — ${name}'s turn` : message);
  }

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + 1 } : p))
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
    if (!name) return;
    if (visited.has(name)) return;
    visited.add(name);

    addDrink(name);

    const p = playersRef.current.find((x) => x.name === name);
    const mates = p?.mates || [];
    for (const m of mates) {
      propagateDrink(m, visited);
    }
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
     GAME FLOW
  ========================= */

  function startGame() {
    setPhase("IDLE");
    setStatusWithTurn("Tap the deck to draw");
  }

  function drawCard() {
    // Only draw in IDLE (and after Ready has started the game)
    if (phase !== "IDLE") return;
    if (deck.length === 0) {
      setStatusText("Deck is empty — game over (all 52 cards drawn)");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // Default status: show the card rule + whose turn (drawer)
    setStatusWithTurn(RULE_TEXT[r]);

    // === RULE HANDLING ===

    // A: Waterfall — wait for ready; on ready, drawer drinks first
    if (r === "A") {
      setPhase("WATERFALL_READY");
      setStatusWithTurn("Waterfall — tap Ready when everyone is ready (drawer drinks first)");
      return;
    }

    // 2: Pick someone to drink
    if (r === "2") {
      setPhase("PICK_DRINK");
      setStatusWithTurn("Pick a player to drink (+1)");
      return;
    }

    // 3: Me — drawer drinks
    if (r === "3") {
      if (drawer) {
        flashPlayers([drawer]);
        propagateDrink(drawer);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 4: Women drink
    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) {
        flashPlayers(women);
        for (const n of women) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 5: Guys drink
    if (r === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) {
        flashPlayers(men);
        for (const n of men) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 6: Everyone drinks
    if (r === "6") {
      const all = playersRef.current.map((p) => p.name);
      if (all.length) {
        flashPlayers(all);
        for (const n of all) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 7: Heaven — MUST pick loser (tap a player) before drawing continues
    if (r === "7") {
      setLoserReason("HEAVEN");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Heaven — tap the loser (player) to give +1");
      return;
    }

    // 8: Pick a mate (not chained)
    if (r === "8") {
      setPhase("PICK_MATE");
      setStatusWithTurn("Pick a mate (tap a player)");
      return;
    }

    // 9/10: enforce loser; pause drawing until loser picked
    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Rhyme — tap the loser (player) to give +1");
      return;
    }

    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Categories — tap the loser (player) to give +1");
      return;
    }

    // J: Thumbmaster persists; holder is the drawer
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Thumbmaster set: ${drawer || "—"} (press Thumb to run a round)`);
      return;
    }

    // Q: Question master persists; holder is the drawer
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Question Master set: ${drawer || "—"} (use Answer button when someone answers)`);
      return;
    }

    // K: Make a rule (type it in)
    if (r === "K") {
      setPhase("MAKE_RULE");
      setStatusWithTurn("Make a rule — type it in and save");
      return;
    }

    // Fallback
    nextTurn();
    setStatusWithTurn("Tap the deck to draw");
  }

  /* =========================
     INTERACTIONS
  ========================= */

  function tapPlayer(name) {
    // Pick loser flow (7 / 9 / 10, and also Thumb button when active)
    if (phase === "PICK_LOSER") {
      flashPlayers([name]);
      propagateDrink(name);
      const reasonLabel = LOSER_REASON_TEXT[loserReason] || "Loser";
      setLoserReason(null);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${reasonLabel} — ${name} drinks (+1). Tap the deck to draw`);
      return;
    }

    // Pick drink flow (2)
    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`Picked ${name} to drink (+1). Tap the deck to draw`);
      return;
    }

    // Pick mate flow (8) — cannot pick self; cannot pick same mate twice
    if (phase === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${drawer} picked ${name} as a mate. Tap the deck to draw`);
      return;
    }

    // Answer mode for Question Master: next tap picks who answered (gives +1)
    if (phase === "ANSWER_PICK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      setStatusWithTurn(`${name} answered a question (+1). Tap the deck to draw`);
      return;
    }

    // Otherwise: do nothing (prevents accidental drink changes)
  }

  function submitRule() {
    const text = ruleDraft.trim();
    if (!text) return;

    setRules((prev) => [...prev, text]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
    setStatusWithTurn("Rule saved. Tap the deck to draw");
  }

  function onReadyAction() {
    if (phase === "WAITING") {
      startGame();
      return;
    }

    if (phase === "WATERFALL_READY") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (drawer) {
        flashPlayers([drawer]);
        propagateDrink(drawer);
      }
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Waterfall started — drawer drank first. Tap the deck to draw");
      return;
    }

    // In other phases, Ready is informational only (no resets)
    setStatusWithTurn("Ready");
  }

  function onThumb() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }

    // Only meaningful if thumbmaster exists
    if (!thumbMaster) {
      setStatusWithTurn("No Thumbmaster yet (draw J first)");
      return;
    }

    // Start a loser-pick round
    setLoserReason("THUMB");
    setPhase("PICK_LOSER");
    setStatusWithTurn(`Thumb — tap the loser (player) to give +1 (Thumbmaster: ${thumbMaster})`);
  }

  function onHeaven() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }

    // Heaven can always be run as a round, but 7-card also forces it.
    setLoserReason("HEAVEN");
    setPhase("PICK_LOSER");
    setStatusWithTurn("Heaven — tap the loser (player) to give +1");
  }

  function onAnswer() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }

    if (!questionMaster) {
      setStatusWithTurn("No Question Master yet (draw Q first)");
      return;
    }

    // Arm the next tap to assign the drink
    setPhase("ANSWER_PICK");
    setStatusWithTurn(`Answer — tap the player who answered (+1) (QM: ${questionMaster})`);
  }

  /* =========================
     MATES + RULES LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) {
      for (const m of p.mates) {
        out.push(`${p.name} → ${m}`);
      }
    }
    return out;
  }, [players]);

  const rulesLines = useMemo(() => {
    if (rules.length > 0) return rules;
    return ["Draw K to add a rule"];
  }, [rules]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
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

      <section className="top-grid">
        <Panel title="🤝 Mates" items={matesLines} />
        <div className="panel card-panel">
          <div className="card-wrapper">
            <div
              className={`card ${card ? "active" : "draw"} ${phase !== "IDLE" ? "disabled" : ""}`}
              onClick={drawCard}
              role="button"
              aria-disabled={phase !== "IDLE"}
              title={phase === "IDLE" ? "Tap to draw" : "Finish the current action first"}
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

      <section className="status-bar">
        <div className="status-main">{statusText}</div>
        <div className="status-meta">
          <span className="meta-pill">{`QM: ${questionMaster || "—"}`}</span>
          <span className="meta-pill">{`TM: ${thumbMaster || "—"}`}</span>
          <button className="meta-btn" onClick={onAnswer}>
            Answer +1
          </button>
        </div>
      </section>

      <section className="players">
        {players.map((p) => {
          const isTurn = p.name === currentPlayer?.name;
          const isFlashing = flashNames.has(p.name);

          return (
            <div
              key={p.name}
              className={`player ${isTurn ? "TURN" : ""} ${isFlashing ? "FLASH" : ""}`}
              onClick={() => tapPlayer(p.name)}
              role="button"
              title="Tap when the game asks you to pick someone"
            >
              <div className="video-slot" />
              <div className="player-footer">
                <span className="player-name">{p.name}</span>
                <span className="player-beers">🍺 {p.beers}</span>
              </div>
            </div>
          );
        })}
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
        <div key={i} className="row" title={items[i] || ""}>
          <span className="row-text">{items[i] || "—"}</span>
        </div>
      ))}
    </div>
  );
}
