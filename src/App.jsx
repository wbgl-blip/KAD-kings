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

const DRINK_FLASH_MS = 2000;

// Dev-only gating (works in Vite + CRA-like)
const IS_DEV =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV &&
    process.env.NODE_ENV !== "production");

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

function cardToString(c) {
  if (!c) return "";
  return `${c.rank}${c.suit}`;
}

/* =========================
   APP
========================= */

export default function App() {
  /**
   * PHASES
   * IDLE
   * WATERFALL_READY    (A banner visible; tap banner to start waterfall)
   * PICK_DRINK         (2)
   * PICK_MATE          (8)
   * PICK_LOSER         (9/10: enforcer taps loser)
   * MAKE_RULE          (K)
   * REACTION_ACTIVE    (Thumb/Heaven triggered)
   * QM_PICK            (Question answered button -> pick player)
   * RULE_BREAK_PICK    (Rule break button -> pick offender)
   */
  const [phase, setPhase] = useState("IDLE");
  const [turnIndex, setTurnIndex] = useState(0);

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // hook for later UI
      mates: [],
    }))
  );

  // Power owners / badges (transfer on redraw of matching card)
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // K rules
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Reaction state for Thumb/Heaven
  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [], // ordered player names who tapped
  });

  // Flash UI (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Dev-only deck inspector
  const [showDevDeck, setShowDevDeck] = useState(false);

  // Refs to avoid stale closures + prevent multi-tap races
  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const consumeTapRef = useRef(false);

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  const isActionPhase = useMemo(() => {
    return [
      "WATERFALL_READY",
      "PICK_DRINK",
      "PICK_MATE",
      "PICK_LOSER",
      "MAKE_RULE",
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
   * - Adds +1 to target
   * - Recursively adds +1 to mates (and mates-of-mates)
   * - Returns the full affected set (so we can flash ALL impacted tiles)
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

  function giveDrinkNoFlash(targetName) {
    // used only where you explicitly asked “no red flash”
    propagateDrinkAndCollect(targetName, new Set());
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

  function resetTapConsumptionSoon() {
    setTimeout(() => {
      consumeTapRef.current = false;
    }, 0);
  }

  /* =========================
     DRAW CARD (game starts on first tap)
  ========================= */

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall banner appears; drawer starts when ready.
    // Per your requirement: do NOT flash red for starting waterfall.
    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — Pick someone
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — Drawer drinks (+ mates), flash all affected
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    // 4 — Women drink
    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) {
        const union = new Set();
        for (const n of women) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }

    // 5 — Guys drink
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

    // 6 — Everyone drinks
    if (r === "6") {
      const union = new Set();
      for (const p of playersRef.current) propagateDrinkAndCollect(p.name, union);
      flashPlayers(Array.from(union));
      nextTurn();
      return;
    }

    // 7 — Assign Heaven badge to drawer (transfer)
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    // 8 — Pick a mate (ONE selection then advance)
    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9 / 10 — Enforcer taps loser
    if (r === "9" || r === "10") {
      setPhase("PICK_LOSER");
      return;
    }

    // J — Assign Thumb badge to drawer (transfer)
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      return;
    }

    // Q — Assign QM badge to drawer (transfer)
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      return;
    }

    // K — Make a rule
    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    // fallback
    nextTurn();
  }

  /* =========================
     TILE SELECTABILITY / LOCKING
  ========================= */

  function isTileSelectable(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (phase === "PICK_DRINK") return true;

    if (phase === "PICK_MATE") {
      if (!drawer) return false;
      return name !== drawer; // cannot pick self
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
     PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    // 2 — Pick someone to drink
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // 8 — Pick mate (ONE pick); lock immediately to prevent double selection
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock first so repeated taps cannot add multiple mates
      setPhase("IDLE");

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p; // no duplicates
          return { ...p, mates: [...p.mates, name] };
        })
      );

      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // 9/10 — Enforcer taps loser
    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // Manual Rule Break — tap offender
    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // Question answered — QM taps who answered
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // Thumb/Heaven Reaction active — last to tap drinks (owner excluded)
    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        // last tapper loses
        giveDrinkWithFlash(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
      return;
    }
  }

  /* =========================
     ACTION BUTTONS (4 in a row)
========================= */

  function startReaction(type) {
    // “Anytime” except when locked in another action
    if (phaseRef.current !== "IDLE") return;

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

  /**
   * Rule enforcement for K / custom rules:
   * - App stores rules (K)
   * - When someone breaks a rule in real life, press 🚫 and tap offender tile (+1)
   */
  function onRuleBreak() {
    if (phaseRef.current !== "IDLE") return;
    setPhase("RULE_BREAK_PICK");
  }

  function onQuestion() {
    if (phaseRef.current !== "IDLE") return;
    if (!questionMaster) return;
    setPhase("QM_PICK");
  }

  /**
   * Waterfall banner:
   * - Drawer drinks first when they tap banner
   * - Per your requirement: do NOT flash red for starting waterfall
   * - Still applies mate propagation (drinks happen), but no flash
   */
  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const drawer = playersRef.current[turnIndex]?.name;
    if (drawer) {
      giveDrinkNoFlash(drawer);
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
     STATUS COPY
========================= */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    const r = card.rank;

    if (phase === "WATERFALL_READY") return "Waterfall — tap banner when ready";
    if (phase === "PICK_DRINK") return "Pick someone to drink (+1)";
    if (phase === "PICK_MATE") return "Pick ONE mate (tap a player)";
    if (phase === "PICK_LOSER") return `${RULE_TEXT[r]} — tap the loser (+1)`;
    if (phase === "MAKE_RULE") return "Make a rule — type it and save";
    if (phase === "RULE_BREAK_PICK") return "Rule Break — tap the offender (+1)";
    if (phase === "QM_PICK") return "Question — QM taps who answered (+1)";

    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label} active — players tap their tile (${reaction.tapped.length}/${eligible})`;
    }

    return RULE_TEXT[r] || "Tap the deck to draw";
  }

  /* =========================
     DEV: DECK INSPECTOR
========================= */

  function resetGame() {
    clearFlashTimer();
    setFlashNames(new Set());
    setPhase("IDLE");
    setTurnIndex(0);
    setDeck(buildDeck());
    setCard(null);

    setPlayers(
      PLAYER_NAMES.map((name) => ({
        name,
        beers: 0,
        gender: "M",
        mates: [],
      }))
    );

    setHeavenMaster(null);
    setThumbMaster(null);
    setQuestionMaster(null);

    setRules([]);
    setRuleDraft("");

    setReaction({ type: null, owner: null, tapped: [] });

    consumeTapRef.current = false;
  }

  /* =========================
     RENDER
========================= */

  const drawLocked = phase !== "IDLE";

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <button
            className="icon-btn"
            onClick={IS_DEV ? () => setShowDevDeck((v) => !v) : undefined}
            disabled={!IS_DEV}
            title={IS_DEV ? "Dev tools" : "Dev tools (disabled in production)"}
            aria-label="Dev tools"
          >
            🛠
          </button>

          <h1>KAD Kings</h1>

          <button
            className="fullscreen-btn"
            onClick={enterFullscreen}
            aria-label="Fullscreen"
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
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

      {phase === "WATERFALL_READY" && (
        <button className="banner waterfall" onClick={startWaterfall}>
          🌊 Start Waterfall
        </button>
      )}

      <section className="actions actions-four">
        <button
          className="btn thumb"
          onClick={onThumb}
          disabled={phase !== "IDLE" || !thumbMaster}
          title={thumbMaster ? `Thumb (Owner: ${thumbMaster})` : "Draw J to assign Thumb"}
          aria-label="Thumb"
        >
          👍
        </button>

        <button
          className="btn heaven"
          onClick={onHeaven}
          disabled={phase !== "IDLE" || !heavenMaster}
          title={heavenMaster ? `Heaven (Owner: ${heavenMaster})` : "Draw 7 to assign Heaven"}
          aria-label="Heaven"
        >
          ☁
        </button>

        <button
          className="btn rulebreak"
          onClick={onRuleBreak}
          disabled={phase !== "IDLE"}
          title="Rule Break (tap offender)"
          aria-label="Rule Break"
        >
          🚫
        </button>

        <button
          className="btn question"
          onClick={onQuestion}
          disabled={phase !== "IDLE" || !questionMaster}
          title={questionMaster ? `Question (QM: ${questionMaster})` : "Draw Q to assign QM"}
          aria-label="Question"
        >
          ❓
        </button>
      </section>

      <section className="status-bar">
        <div className="status-main">{statusCopy()}</div>
      </section>

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
                <span className="player-name">{p.name}</span>

                <div className="player-right">
                  {/* badges BETWEEN name and beer counter */}
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

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule…"
            maxLength={80}
            autoFocus
          />
          <button onClick={submitRule}>Save</button>
        </div>
      )}

      {/* DEV-ONLY: Deck inspector */}
      {IS_DEV && showDevDeck && (
        <div className="dev-overlay" role="dialog" aria-modal="true">
          <div className="dev-modal">
            <div className="dev-head">
              <div className="dev-title">Dev Deck Inspector</div>
              <button className="dev-close" onClick={() => setShowDevDeck(false)}>
                ✕
              </button>
            </div>

            <div className="dev-meta">
              <div className="dev-pill">
                <span className="dev-pill-k">Turn</span>
                <span className="dev-pill-v">{currentPlayer?.name || "—"}</span>
              </div>

              <div className="dev-pill">
                <span className="dev-pill-k">Phase</span>
                <span className="dev-pill-v">{phase}</span>
              </div>

              <div className="dev-pill">
                <span className="dev-pill-k">Card</span>
                <span className="dev-pill-v">{card ? cardToString(card) : "—"}</span>
              </div>

              <div className="dev-pill">
                <span className="dev-pill-k">Remaining</span>
                <span className="dev-pill-v">{deck.length}</span>
              </div>
            </div>

            <div className="dev-actions">
              <button className="dev-btn" onClick={resetGame}>
                Reset Game
              </button>
              <button
                className="dev-btn secondary"
                onClick={() => {
                  // quick reshuffle remaining deck only (keeps state)
                  setDeck((d) => {
                    const copy = [...d];
                    for (let i = copy.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [copy[i], copy[j]] = [copy[j], copy[i]];
                    }
                    return copy;
                  });
                }}
              >
                Reshuffle Remaining
              </button>
            </div>

            <div className="dev-list">
              <div className="dev-list-title">Next cards (top of deck first)</div>
              <div className="dev-cards">
                {deck.map((c, idx) => (
                  <span key={`${c.rank}${c.suit}-${idx}`} className="dev-card">
                    {cardToString(c)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button className="dev-backdrop" onClick={() => setShowDevDeck(false)} aria-label="Close dev tools" />
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
        <div key={i} className="row" title={items[i] || ""}>
          <span className="row-text">{items[i] || "—"}</span>
        </div>
      ))}
    </div>
  );
                     }
