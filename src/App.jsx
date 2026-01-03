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
  A: "Waterfall — drawer starts when ready (drawer drinks first)",
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
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
  THUMB: "Thumb",
  HEAVEN: "Heaven",
  RULE_BREAK: "Rule Break",
  QUESTION: "Question",
};

const DRINK_FLASH_MS = 2000;

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });

  // Fisher–Yates shuffle
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

  /**
   * PHASES
   * IDLE
   * PICK_DRINK (2)
   * PICK_MATE (8)
   * PICK_LOSER (9/10)
   * MAKE_RULE (K)
   * WATERFALL_READY (A)
   * REACTION_ACTIVE (7/J power used)
   * QM_PICK (Q power used)
   * RULE_BREAK_PICK (manual enforcement)
   */
  const [phase, setPhase] = useState("IDLE");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // hook for later
      mates: [],
    }))
  );

  // Power owners / badges (transfer on re-draw)
  const [heavenMaster, setHeavenMaster] = useState(null);   // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null);     // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Rules list (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Context for "tap loser" flows
  const [loserReason, setLoserReason] = useState(null); // RHYME | CATEGORIES | THUMB | HEAVEN | RULE_BREAK | QUESTION

  // Reaction state (7/J usage)
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [],
  });

  // Flash UI
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // refs for safe read inside async updates
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  const isActionPhase = useMemo(() => {
    return [
      "PICK_DRINK",
      "PICK_MATE",
      "PICK_LOSER",
      "MAKE_RULE",
      "WATERFALL_READY",
      "REACTION_ACTIVE",
      "QM_PICK",
      "RULE_BREAK_PICK",
    ].includes(phase);
  }, [phase]);

  /* =========================
     HELPERS
  ========================= */

  function clearFlashTimer() {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }

  function flashPlayers(names) {
    clearFlashTimer();
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(() => {
      setFlashNames(new Set());
      flashTimerRef.current = null;
    }, DRINK_FLASH_MS);
  }

  function nextTurn() {
    setTurnIndex((i) => {
      const n = playersRef.current.length;
      return n ? (i + 1) % n : 0;
    });
  }

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + 1 } : p))
    );
  }

  /**
   * Drink propagation:
   * - +1 for target
   * - recursively +1 for all mates (and mates-of-mates), without duplicates
   * Also returns the full affected set so we can flash ALL impacted tiles.
   */
  function propagateDrinkAndCollect(name, visited = new Set()) {
    if (!name) return visited;
    if (visited.has(name)) return visited;

    visited.add(name);
    addDrink(name);

    const p = playersRef.current.find((x) => x.name === name);
    const mates = p?.mates || [];
    for (const m of mates) propagateDrinkAndCollect(m, visited);

    return visited;
  }

  function giveDrinkWithFlash(targetName) {
    const affected = propagateDrinkAndCollect(targetName, new Set());
    flashPlayers(Array.from(affected));
  }

  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  /* =========================
     DRAW
  ========================= */

  function drawCard() {
    // Block draws during action locks
    if (phase !== "IDLE") return;

    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall banner (no flash on start)
    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — pick someone
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — drawer drinks (with mate propagation + flash)
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    // 4 — women
    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) {
        // flash union of all affected via propagation
        const union = new Set();
        for (const n of women) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }

    // 5 — men
    if (r === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) {
        const union = new Set();
        for (const n of men) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }

    // 6 — everyone
    if (r === "6") {
      const union = new Set();
      for (const p of playersRef.current) propagateDrinkAndCollect(p.name, union);
      flashPlayers(Array.from(union));
      nextTurn();
      return;
    }

    // 7 — assign Heaven badge to drawer (transfer)
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    // 8 — pick mate (ONE selection then advance)
    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9 — rhyme loser (enforcer taps loser)
    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      return;
    }

    // 10 — categories loser (enforcer taps loser)
    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      return;
    }

    // J — assign Thumb badge to drawer (transfer)
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      return;
    }

    // Q — assign QM badge to drawer (transfer)
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      return;
    }

    // K — add rule
    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    // default
    nextTurn();
  }

  /* =========================
     PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    // PICK_DRINK (2)
    if (phase === "PICK_DRINK") {
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      return;
    }

    // PICK_MATE (8) — cannot self, cannot duplicate; ONE pick then advance
    if (phase === "PICK_MATE") {
      if (!drawer) return;
      if (name === drawer) return;

      let didAdd = false;

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          didAdd = true;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      if (!didAdd) return;

      setPhase("IDLE");
      nextTurn();
      return;
    }

    // PICK_LOSER (9/10)
    if (phase === "PICK_LOSER") {
      giveDrinkWithFlash(name);
      setLoserReason(null);
      setPhase("IDLE");
      nextTurn();
      return;
    }

    // RULE_BREAK_PICK (manual)
    if (phase === "RULE_BREAK_PICK") {
      giveDrinkWithFlash(name);
      setLoserReason(null);
      setPhase("IDLE");
      return;
    }

    // QM_PICK
    if (phase === "QM_PICK") {
      giveDrinkWithFlash(name);
      setLoserReason(null);
      setPhase("IDLE");
      return;
    }

    // REACTION_ACTIVE (Thumb/Heaven)
    if (phase === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;

      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        const loser = nextTapped[nextTapped.length - 1];
        giveDrinkWithFlash(loser);

        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
        return;
      }

      return;
    }
  }

  /* =========================
     SELECTABILITY / LOCKING
  ========================= */

  function isTileSelectable(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (phase === "PICK_DRINK") return true;

    if (phase === "PICK_MATE") {
      if (!drawer) return false;
      // cannot pick yourself
      return name !== drawer;
    }

    if (phase === "PICK_LOSER") return true;

    if (phase === "QM_PICK") return true;

    if (phase === "RULE_BREAK_PICK") return true;

    if (phase === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return false;
      return name !== owner && !reaction.tapped.includes(name);
    }

    return false;
  }

  function isTileDisabled(name) {
    return isActionPhase ? !isTileSelectable(name) : false;
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function startReaction(type) {
    // Allow “anytime” EXCEPT when locked in another action
    if (phase !== "IDLE") return;

    const owner = type === "THUMB" ? thumbMaster : heavenMaster;
    if (!owner) return;

    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION_ACTIVE");
  }

  function onThumb() {
    startReaction("THUMB");
  }

  function onHeaven() {
    startReaction("HEAVEN");
  }

  function onRuleBreak() {
    // Allow anytime EXCEPT when locked in another action
    if (phase !== "IDLE") return;
    setLoserReason("RULE_BREAK");
    setPhase("RULE_BREAK_PICK");
  }

  function onQuestion() {
    // Allow anytime EXCEPT when locked in another action
    if (phase !== "IDLE") return;
    if (!questionMaster) return;
    setLoserReason("QUESTION");
    setPhase("QM_PICK");
  }

  // Waterfall banner action — drawer drinks first, then advance turn
  function startWaterfall() {
    if (phase !== "WATERFALL_READY") return;

    const drawer = playersRef.current[turnIndex]?.name;
    if (drawer) {
      // IMPORTANT: no "start" flash unless they actually drink (they do here), but
      // the user asked "player shouldn't flash red for starting waterfall" meaning
      // don’t flash merely for tapping banner. Since drawer drinks on start,
      // we still flash for the drink itself.
      giveDrinkWithFlash(drawer);
    }

    setPhase("IDLE");
    nextTurn();
  }

  /* =========================
     RULE INPUT (K)
  ========================= */

  function submitRule() {
    const text = ruleDraft.trim();
    if (!text) return;

    setRules((prev) => [...prev, text]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
  }

  /* =========================
     LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => rules, [rules]);

  /* =========================
     RENDER
  ========================= */

  const drawLocked = phase !== "IDLE";

  function statusCopy() {
    if (!card) return "Tap the deck to draw";

    const r = card.rank;

    if (phase === "WATERFALL_READY") return "Waterfall — tap the banner when ready (drawer drinks first)";
    if (phase === "PICK_DRINK") return "Pick someone to drink (+1)";
    if (phase === "PICK_MATE") return "Pick a mate (tap a player)";
    if (phase === "PICK_LOSER") return `${RULE_TEXT[r]} — tap the loser (player) to give +1`;
    if (phase === "MAKE_RULE") return "Make a rule — type it in and save";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label} active — players tap their tile (${reaction.tapped.length}/${eligible})`;
    }
    if (phase === "QM_PICK") return "Question — tap who answered (+1)";
    if (phase === "RULE_BREAK_PICK") return "Rule Break — tap the offender (+1)";

    return "Tap the deck to draw";
  }

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
          <div
            className={`card ${card ? "active" : "draw"} ${drawLocked ? "disabled" : ""}`}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={drawLocked ? "Finish current action" : "Tap to draw"}
          >
            {!card ? (
              <div className="card-draw-label">DECK</div>
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

      {/* Waterfall banner */}
      {phase === "WATERFALL_READY" && (
        <button className="banner waterfall" onClick={startWaterfall}>
          🌊 Start Waterfall
        </button>
      )}

      {/* 4 action buttons in one row */}
      <section className="actions actions-four">
        <button
          className="btn thumb"
          onClick={onThumb}
          disabled={phase !== "IDLE" || !thumbMaster}
          title={thumbMaster ? "Thumb" : "Draw J to assign Thumb"}
        >
          👍
        </button>

        <button
          className="btn heaven"
          onClick={onHeaven}
          disabled={phase !== "IDLE" || !heavenMaster}
          title={heavenMaster ? "Heaven" : "Draw 7 to assign Heaven"}
        >
          ☁
        </button>

        <button
          className="btn rulebreak"
          onClick={onRuleBreak}
          disabled={phase !== "IDLE"}
          title="Rule Break"
        >
          🚫
        </button>

        <button
          className="btn question"
          onClick={onQuestion}
          disabled={phase !== "IDLE" || !questionMaster}
          title={questionMaster ? "Question" : "Draw Q to assign QM"}
        >
          ❓
        </button>
      </section>

      {/* Status */}
      <section className="status-bar">
        <div className="status-main">{statusCopy()}</div>
      </section>

      {/* Players */}
      <section className="players">
        {players.map((p) => {
          const disabled = isTileDisabled(p.name);
          const selectable = isActionPhase ? isTileSelectable(p.name) : false;
          const flashing = flashNames.has(p.name);

          // Turn highlight only when NOT in action phase
          const isTurn = !isActionPhase && p.name === currentPlayer?.name;

          return (
            <div
              key={p.name}
              className={`player
                ${isTurn ? "TURN" : ""}
                ${flashing ? "FLASH" : ""}
                ${selectable ? "SELECTABLE" : ""}
                ${disabled ? "DISABLED" : ""}
              `}
              onClick={() => {
                if (disabled) return;
                tapPlayer(p.name);
              }}
              role="button"
              title={selectable ? "Tap" : isActionPhase ? "Not selectable" : "Player"}
            >
              <div className="video-slot" />
              <div className="player-footer">
                <span className="player-name">
                  {p.name}
                </span>

                <div className="player-right">
                  {/* badges BETWEEN name and beer counter (as requested) */}
                  <div className="badges">
                    {p.name === heavenMaster && <span className="badge b7">7</span>}
                    {p.name === thumbMaster && <span className="badge bJ">J</span>}
                    {p.name === questionMaster && <span className="badge bQ">Q</span>}
                  </div>

                  <span className="player-beers">🍺 {p.beers}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* K rule input */}
      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule…"
            maxLength={80}
          />
          <button onClick={submitRule}>Save</button>
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
