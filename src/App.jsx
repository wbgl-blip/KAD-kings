// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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

function cardToKey(c) {
  return `${c.rank}${c.suit}`;
}

function parseCardKey(key) {
  // rank can be 10 (2 chars)
  const suit = key.slice(-1);
  const rank = key.slice(0, key.length - 1);
  return { rank, suit };
}

/* =========================
   APP
========================= */

export default function App() {
  /* ---------- DEV MODE (optional) ---------- */
  const devEnabled = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("dev") === "1") return true;
      if (localStorage.getItem("kad_dev") === "1") return true;
    } catch {
      // ignore
    }
    return false;
  }, []);

  /* ---------- CORE GAME STATE ---------- */

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  /**
   * PHASES
   * IDLE
   * WATERFALL_READY
   * PICK_DRINK
   * PICK_MATE
   * PICK_LOSER          (9/10)
   * MAKE_RULE           (K)
   * REACTION_ACTIVE     (7/J)
   * QM_PICK             (Q)
   * RULE_BREAK_PICK     (manual)
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

  /* ---------- POWER OWNERS / BADGES ---------- */
  const [heavenMaster, setHeavenMaster] = useState(null); // 7
  const [thumbMaster, setThumbMaster] = useState(null); // J
  const [questionMaster, setQuestionMaster] = useState(null); // Q

  /* ---------- RULES ---------- */
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  /* ---------- REACTION STATE ---------- */
  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [],
  });

  /* ---------- FLASH UI STATE ---------- */
  // flashVariant: "DRINK" (red) | "SOFT" (blue)
  const [flash, setFlash] = useState({ names: new Set(), variant: "DRINK" });
  const flashTimerRef = useRef(null);

  /* ---------- DEV UI ---------- */
  const [devOpen, setDevOpen] = useState(false);

  /* ---------- REFS (avoid stale closures + prevent fast double taps) ---------- */

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

  const deckEmpty = deck.length === 0;

  /* =========================
     HELPERS
  ========================= */

  function clearFlashTimer() {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }

  function flashPlayers(names, variant = "DRINK") {
    clearFlashTimer();
    setFlash({ names: new Set(names), variant });
    flashTimerRef.current = setTimeout(() => {
      setFlash({ names: new Set(), variant: "DRINK" });
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
   * Recursively applies drink (+1) through mate links and returns full affected set.
   * Ensures mates ALSO flash when they drink due to mate propagation.
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

  function giveDrinkWithFlash(targetName, variant = "DRINK") {
    const affected = propagateDrinkAndCollect(targetName, new Set());
    flashPlayers(Array.from(affected), variant);
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
     DRAW CARD
  ========================= */

  function applyDrawnCard(nextCard) {
    // Draw context
    setCard(nextCard);
    const r = nextCard.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall banner (start later). No flash on entering this phase.
    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — Pick someone to drink
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — Drawer drinks (+ mates), red flash
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer, "DRINK");
      nextTurn();
      return;
    }

    // 4 — Women drink
    if (r === "4") {
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);

      if (women.length) {
        const union = new Set();
        for (const n of women) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union), "DRINK");
      }
      nextTurn();
      return;
    }

    // 5 — Guys drink
    if (r === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);

      if (men.length) {
        const union = new Set();
        for (const n of men) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union), "DRINK");
      }
      nextTurn();
      return;
    }

    // 6 — Everyone drinks
    if (r === "6") {
      const union = new Set();
      for (const p of playersRef.current) propagateDrinkAndCollect(p.name, union);
      flashPlayers(Array.from(union), "DRINK");
      nextTurn();
      return;
    }

    // 7 — Assign Heaven badge to drawer (transfer)
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    // 8 — Pick a mate (ONE selection)
    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9/10 — tap loser
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

  function drawCard() {
    // Block draws during action locks
    if (phase !== "IDLE") return;

    // Prevent drawing when empty
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    applyDrawnCard(next);
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
     PLAYER TAP HANDLER
  ========================= */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    // PICK_DRINK (2)
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name, "DRINK");
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // PICK_MATE (8) — ONE mate only, lock instantly
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock phase first so repeated taps can't add multiple mates
      setPhase("IDLE");

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
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
      giveDrinkWithFlash(name, "DRINK");
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // RULE_BREAK_PICK
    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name, "DRINK");
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // QM_PICK
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name, "DRINK");
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // REACTION_ACTIVE — last tapper drinks
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
        giveDrinkWithFlash(name, "DRINK");
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
    // “Anytime” means: only when not locked in another action
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
    if (phase !== "IDLE") return;
    setPhase("RULE_BREAK_PICK");
  }

  function onQuestion() {
    if (phase !== "IDLE") return;
    if (!questionMaster) return;
    setPhase("QM_PICK");
  }

  // Waterfall banner action — drawer drinks first
  // Must NOT red-flash. We "soft flash" (blue) for drawer + mates.
  function startWaterfall() {
    if (phase !== "WATERFALL_READY") return;

    const drawer = playersRef.current[turnIndex]?.name;
    if (drawer) {
      giveDrinkWithFlash(drawer, "SOFT"); // blue flash instead of red
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
     STATUS COPY (instructional only)
  ========================= */

  function statusCopy() {
    // Deck empty & idle: game over instruction
    if (phase === "IDLE" && deckEmpty) return "Deck is empty — game over";

    // No card yet
    if (!card) return deckEmpty ? "Deck is empty — game over" : "Tap the deck to start";

    // Phase-driven copy (don’t repeat card text)
    if (phase === "WATERFALL_READY") return "Waterfall — tap the banner when ready";
    if (phase === "PICK_DRINK") return "Tap a player to give +1 drink";
    if (phase === "PICK_MATE") return "Pick ONE mate (locks immediately)";
    if (phase === "PICK_LOSER") {
      return card.rank === "9"
        ? "Rhyme — tap the loser (+1)"
        : card.rank === "10"
        ? "Categories — tap the loser (+1)"
        : "Tap the loser (+1)";
    }
    if (phase === "MAKE_RULE") return "Type a rule and save it";
    if (phase === "RULE_BREAK_PICK") return "Rule Break — tap the offender (+1)";
    if (phase === "QM_PICK") return "Question — tap who answered (+1)";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label} active — everyone taps (${reaction.tapped.length}/${eligible})`;
    }

    // Idle with cards remaining
    return "Tap the deck to draw";
  }

  /* =========================
     DEV ACTIONS
  ========================= */

  function devForceDraw(cardKey) {
    if (phaseRef.current !== "IDLE") return;

    setDeck((prev) => {
      const idx = prev.findIndex((c) => cardToKey(c) === cardKey);
      if (idx === -1) return prev;

      const chosen = prev[idx];
      const rest = prev.slice(0, idx).concat(prev.slice(idx + 1));

      // Apply drawn card on next tick to ensure deck state updates cleanly
      setTimeout(() => applyDrawnCard(chosen), 0);
      return rest;
    });
  }

  function devResetAll({ resetDrinks, resetMates, resetRules } = {}) {
    setDeck(buildDeck());
    setCard(null);
    setPhase("IDLE");
    setTurnIndex(0);
    setReaction({ type: null, owner: null, tapped: [] });
    setFlash({ names: new Set(), variant: "DRINK" });

    setHeavenMaster(null);
    setThumbMaster(null);
    setQuestionMaster(null);

    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        beers: resetDrinks ? 0 : p.beers,
        mates: resetMates ? [] : p.mates,
      }))
    );

    if (resetRules) setRules([]);
    setRuleDraft("");
  }

  function devCopyDeckToClipboard() {
    const lines = deck.map((c) => cardToKey(c)).join(", ");
    try {
      navigator.clipboard?.writeText(lines);
    } catch {
      // ignore
    }
  }

  /* =========================
     KEYBOARD ESC FOR DEV MODAL
  ========================= */

  useEffect(() => {
    if (!devOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDevOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [devOpen]);

  /* =========================
     RENDER
  ========================= */

  // Deck tap is locked when:
  // - not IDLE (during action)
  // - deck empty
  const drawLocked = phase !== "IDLE" || deckEmpty;

  const deckCardClass = [
    "card",
    card ? "active" : "draw",
    drawLocked ? "disabled" : "",
    deckEmpty ? "empty" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const thumbActive = phase === "REACTION_ACTIVE" && reaction.type === "THUMB";
  const heavenActive = phase === "REACTION_ACTIVE" && reaction.type === "HEAVEN";
  const ruleBreakActive = phase === "RULE_BREAK_PICK";
  const questionActive = phase === "QM_PICK";

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>

        {devEnabled && (
          <button className="dev-pill" onClick={() => setDevOpen(true)} title="Dev tools">
            DEV
          </button>
        )}

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
            className={deckCardClass}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={
              deckEmpty
                ? "Deck empty"
                : phase !== "IDLE"
                ? "Finish the current action"
                : "Tap to draw"
            }
          >
            {!card ? (
              <div className="card-draw-label">{deckEmpty ? "EMPTY" : "DECK"}</div>
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

            {/* Deck "stack" hint */}
            <div className="deck-stack" aria-hidden="true" />
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

      {/* 4 action buttons - one row */}
      <section className="actions actions-four">
        <button
          className={`btn thumb ${thumbActive ? "ACTIVE" : ""}`}
          onClick={onThumb}
          disabled={phase !== "IDLE" || !thumbMaster}
          title={thumbMaster ? `Thumb (Owner: ${thumbMaster})` : "Draw J to assign Thumb"}
        >
          👍
        </button>

        <button
          className={`btn heaven ${heavenActive ? "ACTIVE" : ""}`}
          onClick={onHeaven}
          disabled={phase !== "IDLE" || !heavenMaster}
          title={heavenMaster ? `Heaven (Owner: ${heavenMaster})` : "Draw 7 to assign Heaven"}
        >
          ☁
        </button>

        <button
          className={`btn rulebreak ${ruleBreakActive ? "ACTIVE" : ""}`}
          onClick={onRuleBreak}
          disabled={phase !== "IDLE"}
          title="Rule Break (tap offender)"
        >
          🚫
        </button>

        <button
          className={`btn question ${questionActive ? "ACTIVE" : ""}`}
          onClick={onQuestion}
          disabled={phase !== "IDLE" || !questionMaster}
          title={questionMaster ? `Question (QM: ${questionMaster})` : "Draw Q to assign QM"}
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

          const flashing = flash.names.has(p.name);
          const flashClass =
            flashing && flash.variant === "DRINK"
              ? "FLASH"
              : flashing && flash.variant === "SOFT"
              ? "SOFTFLASH"
              : "";

          // Turn highlight only when NOT in action phase.
          const isTurn = !isActionPhase && p.name === currentPlayer?.name;

          return (
            <div
              key={p.name}
              className={[
                "player",
                isTurn ? "TURN" : "",
                selectable ? "SELECTABLE" : "",
                disabled ? "DISABLED" : "",
                flashClass,
              ]
                .filter(Boolean)
                .join(" ")}
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
                  <div className="badges" aria-label="Badges">
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

      {/* DEV MODAL */}
      {devEnabled && devOpen && (
        <DevModal
          deck={deck}
          phase={phase}
          onClose={() => setDevOpen(false)}
          onForceDraw={devForceDraw}
          onCopyDeck={devCopyDeckToClipboard}
          onResetAll={devResetAll}
        />
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

/* =========================
   DEV MODAL
========================= */

function DevModal({ deck, phase, onClose, onForceDraw, onCopyDeck, onResetAll }) {
  const [resetDrinks, setResetDrinks] = useState(true);
  const [resetMates, setResetMates] = useState(true);
  const [resetRules, setResetRules] = useState(true);

  const remainingKeys = useMemo(() => deck.map((c) => `${c.rank}${c.suit}`), [deck]);

  return (
    <div className="dev-overlay" role="dialog" aria-modal="true">
      <div className="dev-modal">
        <div className="dev-header">
          <div className="dev-title">Dev Tools</div>
          <button className="dev-close" onClick={onClose} aria-label="Close dev tools">
            ✕
          </button>
        </div>

        <div className="dev-meta">
          <span className="dev-chip">{`Phase: ${phase}`}</span>
          <span className="dev-chip">{`Cards left: ${deck.length}`}</span>
        </div>

        <div className="dev-actions">
          <button className="dev-btn" onClick={onCopyDeck}>
            Copy deck
          </button>

          <button
            className="dev-btn danger"
            onClick={() => onResetAll({ resetDrinks, resetMates, resetRules })}
            title="Reshuffle deck + clear selected state"
          >
            Reset / Shuffle
          </button>
        </div>

        <div className="dev-toggles">
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={resetDrinks}
              onChange={(e) => setResetDrinks(e.target.checked)}
            />
            Reset drinks
          </label>
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={resetMates}
              onChange={(e) => setResetMates(e.target.checked)}
            />
            Reset mates
          </label>
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={resetRules}
              onChange={(e) => setResetRules(e.target.checked)}
            />
            Reset rules
          </label>
        </div>

        <div className="dev-subtitle">Remaining Deck (tap to force-draw)</div>

        <div className="dev-deck">
          {remainingKeys.length === 0 ? (
            <div className="dev-empty">No cards left</div>
          ) : (
            remainingKeys.map((k) => (
              <button
                key={k}
                className="dev-card"
                onClick={() => onForceDraw(k)}
                title="Force draw this card"
              >
                {k}
              </button>
            ))
          )}
        </div>

        <div className="dev-footnote">
          Force draw is only enabled while the game is idle (not mid-action).
        </div>
      </div>
    </div>
  );
}
