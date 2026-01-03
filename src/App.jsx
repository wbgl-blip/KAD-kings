// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const CARD_LABEL = {
  A: "Waterfall",
  2: "Pick a Drink",
  3: "Me",
  4: "Women",
  5: "Guys",
  6: "Everyone",
  7: "Heaven (Power)",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster (Power)",
  Q: "Question Master",
  K: "Make a Rule",
};

const CARD_INSTRUCTIONS = {
  A: "Start when ready. Everyone drinks. End = +3 each (no mates).",
  2: "Tap who drinks (+1).",
  3: "Drawer drinks (+1).",
  4: "Women drink (+1).",
  5: "Guys drink (+1).",
  6: "Everyone drinks (+1).",
  7: "Owner can start anytime. Last to tap drinks (+1). Owner excluded.",
  8: "Drawer picks ONE mate.",
  9: "Tap the loser (+1).",
  10: "Tap the loser (+1).",
  J: "Owner can start anytime. Last to tap drinks (+1). Owner excluded.",
  Q: "QM can mark who answered (+1).",
  K: "Type a rule and save. Use 🚫 when someone breaks it.",
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
  /**
   * PHASES
   * IDLE
   * WATERFALL_READY
   * WATERFALL_RUNNING
   * PICK_DRINK        (2)
   * PICK_MATE         (8)
   * PICK_LOSER        (9/10)
   * MAKE_RULE         (K)
   * REACTION_ACTIVE   (7/J power button)
   * QM_PICK           (❓ button)
   * RULE_BREAK_PICK   (🚫 button)
   */
  const [phase, setPhase] = useState("IDLE");

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
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
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Rules list (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Reaction state (7/J usage)
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [], // ordered names who tapped
  });

  // Flash UI (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Refs to avoid stale closures + prevent double taps during phase transitions
  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const consumeTapRef = useRef(false);

  // Fullscreen
  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  // Current player (turn)
  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  // NOTE: Turn highlight should stay ON even during mate selection until mate picked
  const isTurnName = useMemo(() => currentPlayer?.name || null, [currentPlayer]);

  const isActionPhase = useMemo(() => {
    return [
      "WATERFALL_READY",
      "WATERFALL_RUNNING",
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
     WATERFALL SETTINGS
  ========================= */

  const [wfMin, setWfMin] = useState(5);
  const [wfMax, setWfMax] = useState(20);
  const [wfRandom, setWfRandom] = useState(false);

  const [wfDuration, setWfDuration] = useState(null); // chosen seconds for current waterfall
  const [wfRemaining, setWfRemaining] = useState(null);

  const wfIntervalRef = useRef(null);

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function pickWaterfallSeconds() {
    const min = clamp(Number(wfMin) || 5, 5, 20);
    const max = clamp(Number(wfMax) || 20, 5, 20);
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);

    if (!wfRandom) return lo; // fixed: use min as chosen duration
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function stopWaterfallTimer() {
    if (wfIntervalRef.current) {
      clearInterval(wfIntervalRef.current);
      wfIntervalRef.current = null;
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopWaterfallTimer();
  }, []);

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

  function addDrink(name, amount = 1) {
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + amount } : p))
    );
  }

  /**
   * Mate propagation (NON-waterfall):
   * - +1 to target
   * - recursively +1 to all mates (and mates-of-mates), without duplicates
   * - returns visited set so we can flash ALL impacted tiles (including mates)
   */
  function propagateDrinkAndCollect(name, visited = new Set()) {
    if (!name) return visited;
    if (visited.has(name)) return visited;

    visited.add(name);
    addDrink(name, 1);

    const p = playersRef.current.find((x) => x.name === name);
    const mates = p?.mates || [];
    for (const m of mates) propagateDrinkAndCollect(m, visited);

    return visited;
  }

  function giveDrinkWithFlash(targetName) {
    const affected = propagateDrinkAndCollect(targetName, new Set());
    flashPlayers(Array.from(affected));
  }

  function resetTapConsumptionSoon() {
    setTimeout(() => {
      consumeTapRef.current = false;
    }, 0);
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall: enter ready phase and show banner (no flash on start)
    if (r === "A") {
      stopWaterfallTimer();
      setWfDuration(null);
      setWfRemaining(null);
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — Pick someone
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — Drawer drinks (+mates) and flash all impacted
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    // 4 — Women drink (+mates)
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

    // 5 — Guys drink (+mates)
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

    // 6 — Everyone drinks (+mates)
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

    // 8 — Pick a mate (ONE selection, lock to prevent double taps)
    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9 / 10 — Tap loser
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

    // default: advance turn
    nextTurn();
  }

  /* =========================
     TILE SELECTABILITY / LOCKING
  ========================= */

  function isTileSelectable(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (phaseRef.current === "PICK_DRINK") return true;

    if (phaseRef.current === "PICK_MATE") {
      if (!drawer) return false;
      return name !== drawer; // cannot pick self
    }

    if (phaseRef.current === "PICK_LOSER") return true;

    if (phaseRef.current === "QM_PICK") return true;

    if (phaseRef.current === "RULE_BREAK_PICK") return true;

    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return false;
      return name !== owner && !reaction.tapped.includes(name);
    }

    return false;
  }

  function isTileDisabled(name) {
    if (!isActionPhase) return false;
    return !isTileSelectable(name);
  }

  /* =========================
     PLAYER TAP HANDLER
  ========================= */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    // PICK_DRINK (2)
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // PICK_MATE (8) — ONE mate only, lock instantly to prevent double selection
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock phase first so repeated taps cannot add multiple mates
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

    // PICK_LOSER (9/10)
    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // RULE_BREAK_PICK — manual enforcement for K/custom rules
    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // QM_PICK — QM marks who answered
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // REACTION_ACTIVE — 7/J started; last tile tapped drinks; owner excluded; no timer
    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        // last tapper loses (this 'name' is the last tapper)
        giveDrinkWithFlash(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
      return;
    }
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function startReaction(type) {
    // “anytime” means: only when not locked in another action
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

  // Manual enforcement (rules made by K, or any other “house rule”)
  function onRuleBreak() {
    if (phaseRef.current !== "IDLE") return;
    setPhase("RULE_BREAK_PICK");
  }

  // Question answered enforcement (QM taps who answered)
  function onQuestion() {
    if (phaseRef.current !== "IDLE") return;
    if (!questionMaster) return;
    setPhase("QM_PICK");
  }

  /* =========================
     WATERFALL LOGIC
  ========================= */

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const seconds = pickWaterfallSeconds();
    setWfDuration(seconds);
    setWfRemaining(seconds);

    setPhase("WATERFALL_RUNNING");

    stopWaterfallTimer();
    wfIntervalRef.current = setInterval(() => {
      setWfRemaining((prev) => {
        const next = (prev ?? seconds) - 1;
        if (next <= 0) {
          stopWaterfallTimer();
          finishWaterfall();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function cancelWaterfall() {
    // Optional: if you want to allow cancel; this keeps it safe
    stopWaterfallTimer();
    setWfDuration(null);
    setWfRemaining(null);
    setPhase("IDLE");
    nextTurn();
  }

  function finishWaterfall() {
    // Everyone gets +3 at the end (NO mates on waterfall)
    setPlayers((prev) => prev.map((p) => ({ ...p, beers: p.beers + 3 })));

    // Flash everyone for the drink event (NOT for starting)
    flashPlayers(playersRef.current.map((p) => p.name));

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
     CARD SUBTEXT (NO STATUS BAR DUPLICATION)
========================= */

  function cardSubtext() {
    if (!card) return "Tap to draw the first card";
    const r = card.rank;

    if (phase === "WATERFALL_READY") return "Configure timer, then start Waterfall";
    if (phase === "WATERFALL_RUNNING") return `Waterfall running — ${wfRemaining ?? "…"}s left`;

    if (phase === "PICK_DRINK") return "Tap who drinks (+1)";
    if (phase === "PICK_MATE") return "Tap ONE mate";
    if (phase === "PICK_LOSER") return "Tap the loser (+1)";
    if (phase === "MAKE_RULE") return "Enter rule below and Save";
    if (phase === "RULE_BREAK_PICK") return "Tap rule breaker (+1)";
    if (phase === "QM_PICK") return "Tap who answered (+1)";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label} active — taps: ${reaction.tapped.length}/${eligible}`;
    }

    return CARD_INSTRUCTIONS[r] || "Tap the deck to draw";
  }

  /* =========================
     DEV-ONLY: DECK VIEW + FORCE DRAW
  ========================= */

  const isDev = Boolean(import.meta?.env?.DEV);
  const [devDeckOpen, setDevDeckOpen] = useState(false);

  function forceDrawAtIndex(idx) {
    if (!isDev) return;
    if (phaseRef.current !== "IDLE") return;
    if (idx < 0 || idx >= deck.length) return;

    const chosen = deck[idx];
    const rest = deck.filter((_, i) => i !== idx);
    setDeck(rest);
    setCard(chosen);

    // Reuse draw logic by simulating the same branch:
    const r = chosen.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    if (r === "A") {
      stopWaterfallTimer();
      setWfDuration(null);
      setWfRemaining(null);
      setPhase("WATERFALL_READY");
      return;
    }

    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

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

    if (r === "6") {
      const union = new Set();
      for (const p of playersRef.current) propagateDrinkAndCollect(p.name, union);
      flashPlayers(Array.from(union));
      nextTurn();
      return;
    }

    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    if (r === "9" || r === "10") {
      setPhase("PICK_LOSER");
      return;
    }

    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      return;
    }

    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      return;
    }

    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    nextTurn();
  }

  /* =========================
     RENDER
  ========================= */

  const drawLocked = phase !== "IDLE";

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>

        <div className="header-actions">
          {isDev && (
            <button
              className="header-btn"
              onClick={() => setDevDeckOpen(true)}
              title="Dev Deck"
              aria-label="Dev Deck"
            >
              🧪
            </button>
          )}

          <button
            className="header-btn"
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
                <div className="rule-text">
                  <div className="rule-title">{CARD_LABEL[card.rank] || "Card"}</div>
                  <div className="rule-sub">{cardSubtext()}</div>
                </div>
                <div className="sub">{deck.length} cards left</div>
              </>
            )}
          </div>
        </div>

        <Panel title="📜 Rules" items={rulesLines} />
      </section>

      {/* Waterfall banner */}
      {(phase === "WATERFALL_READY" || phase === "WATERFALL_RUNNING") && (
        <div className={`banner waterfall ${phase === "WATERFALL_RUNNING" ? "running" : ""}`}>
          <div className="banner-top">
            <div className="banner-title">🌊 Waterfall</div>
            <div className="banner-meta">
              {phase === "WATERFALL_RUNNING" && (
                <span className="banner-pill">{wfRemaining ?? "…"}s</span>
              )}
              {wfDuration != null && phase === "WATERFALL_RUNNING" && (
                <span className="banner-pill">/{wfDuration}s</span>
              )}
            </div>
          </div>

          {phase === "WATERFALL_READY" && (
            <div className="banner-controls">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={wfRandom}
                  onChange={(e) => setWfRandom(e.target.checked)}
                />
                <span>Random</span>
              </label>

              <div className="wf-range">
                <div className="wf-row">
                  <span className="wf-label">Min</span>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={wfMin}
                    onChange={(e) => setWfMin(clamp(e.target.valueAsNumber || 5, 5, 20))}
                  />
                </div>

                <div className="wf-row">
                  <span className="wf-label">Max</span>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={wfMax}
                    onChange={(e) => setWfMax(clamp(e.target.valueAsNumber || 20, 5, 20))}
                    disabled={!wfRandom}
                  />
                </div>
              </div>

              <button className="banner-btn" onClick={startWaterfall}>
                Start ({wfRandom ? "random" : `${clamp(wfMin, 5, 20)}s`})
              </button>
            </div>
          )}

          {phase === "WATERFALL_RUNNING" && (
            <div className="banner-running">
              <div className="banner-running-text">Everyone drinks. End = +3 each.</div>
              <button className="banner-btn subtle" onClick={cancelWaterfall}>
                End Early
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 action buttons in one row */}
      <section className="actions actions-four">
        <button
          className="btn thumb"
          onClick={onThumb}
          disabled={phase !== "IDLE" || !thumbMaster}
          title={thumbMaster ? `Thumb (Owner: ${thumbMaster})` : "Draw J to assign Thumb"}
        >
          👍
        </button>

        <button
          className="btn heaven"
          onClick={onHeaven}
          disabled={phase !== "IDLE" || !heavenMaster}
          title={heavenMaster ? `Heaven (Owner: ${heavenMaster})` : "Draw 7 to assign Heaven"}
        >
          ☁
        </button>

        <button
          className="btn rulebreak"
          onClick={onRuleBreak}
          disabled={phase !== "IDLE"}
          title="Rule Break (tap offender)"
        >
          🚫
        </button>

        <button
          className="btn question"
          onClick={onQuestion}
          disabled={phase !== "IDLE" || !questionMaster}
          title={questionMaster ? `Question (QM: ${questionMaster})` : "Draw Q to assign QM"}
        >
          ❓
        </button>
      </section>

      {/* Players */}
      <section className="players">
        {players.map((p) => {
          const disabled = isTileDisabled(p.name);
          const selectable = isActionPhase ? isTileSelectable(p.name) : false;
          const flashing = flashNames.has(p.name);

          // Turn highlight should remain on current player even during mate selection (until mate chosen)
          const isTurn = p.name === isTurnName;

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
            autoFocus
          />
          <button onClick={submitRule}>Save</button>
        </div>
      )}

      {/* DEV DECK MODAL */}
      {isDev && devDeckOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Dev Deck</div>
              <button className="modal-close" onClick={() => setDevDeckOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-hint">
                Force-draw works only when phase is IDLE. (This is dev-only.)
              </div>

              <div className="deck-list">
                {deck.map((c, idx) => {
                  const key = `${c.rank}${c.suit}-${idx}`;
                  return (
                    <button
                      key={key}
                      className="deck-item"
                      onClick={() => forceDrawAtIndex(idx)}
                      disabled={phase !== "IDLE"}
                      title="Force draw"
                    >
                      <span className="deck-item-left">{idx + 1}.</span>
                      <span className="deck-item-card">
                        {c.rank}
                        {c.suit}
                      </span>
                      <span className="deck-item-right">{CARD_LABEL[c.rank] || ""}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="modal-btn"
                onClick={() => {
                  setDeck(buildDeck());
                  setCard(null);
                  setPhase("IDLE");
                  stopWaterfallTimer();
                  setWfDuration(null);
                  setWfRemaining(null);
                  setReaction({ type: null, owner: null, tapped: [] });
                  setDevDeckOpen(false);
                }}
              >
                Reshuffle Deck
              </button>
            </div>
          </div>
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
