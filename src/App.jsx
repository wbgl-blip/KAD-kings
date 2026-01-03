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

// Waterfall timer config bounds
const WATERFALL_MIN_S = 5;
const WATERFALL_MAX_S = 20;
const WATERFALL_DEFAULT_S = 7;
const WATERFALL_END_DRINKS = 3;

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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cardToString(c) {
  return `${c.rank}${c.suit}`;
}

/* =========================
   APP
========================= */

export default function App() {
  /**
   * PHASES
   * IDLE               (tap deck to draw)
   * WATERFALL_READY    (banner config + start)
   * WATERFALL_RUNNING  (countdown)
   * PICK_DRINK         (2)
   * PICK_MATE          (8)
   * PICK_LOSER         (9/10)
   * MAKE_RULE          (K)
   * REACTION_ACTIVE    (7/J started)
   * QM_PICK            (Q action)
   * RULE_BREAK_PICK    (manual enforcement)
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

  // Badges (transfer on re-draw)
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Rules (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // For 9/10
  const [pendingLoserMode, setPendingLoserMode] = useState(null); // "RHYME" | "CATEGORIES" | null

  // Reaction state (7/J power usage)
  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [], // ordered names
  });

  // Flash UI (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Prevent rapid double taps causing multiple mate additions / etc.
  const consumeTapRef = useRef(false);

  // Refs to avoid stale closures
  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  // Waterfall settings + countdown
  const [waterfallSeconds, setWaterfallSeconds] = useState(WATERFALL_DEFAULT_S);
  const [waterfallRandom, setWaterfallRandom] = useState(false);
  const [waterfallRemaining, setWaterfallRemaining] = useState(0);
  const waterfallIntervalRef = useRef(null);

  // Dev tools (enable with ?dev=1)
  const isDev = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get("dev") === "1";
    } catch {
      return false;
    }
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

  function resetConsumeSoon() {
    setTimeout(() => {
      consumeTapRef.current = false;
    }, 0);
  }

  function stopWaterfallTimer() {
    if (waterfallIntervalRef.current) {
      clearInterval(waterfallIntervalRef.current);
      waterfallIntervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopWaterfallTimer();
      clearFlashTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     DRINK LOGIC
  ========================= */

  function addDrinkNoMates(name, amount = 1) {
    if (!name) return;
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + amount } : p))
    );
  }

  function addDrinkNoMatesMany(names, amount = 1) {
    if (!names?.length) return;
    setPlayers((prev) =>
      prev.map((p) => (names.includes(p.name) ? { ...p, beers: p.beers + amount } : p))
    );
  }

  /**
   * Mate propagation:
   * - Adds +1 to target
   * - Recursively adds +1 to mates (and mates-of-mates), no duplicates
   * Returns affected set so we can flash ALL impacted tiles.
   *
   * NOTE: This is used for EVERYTHING except waterfall (per your rule: no mates on waterfall).
   */
  function propagateDrinkAndCollect(name, visited = new Set()) {
    if (!name) return visited;
    if (visited.has(name)) return visited;

    visited.add(name);

    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + 1 } : p))
    );

    const p = playersRef.current.find((x) => x.name === name);
    const mates = p?.mates || [];
    for (const m of mates) propagateDrinkAndCollect(m, visited);

    return visited;
  }

  function giveDrinkWithFlash(targetName) {
    const affected = propagateDrinkAndCollect(targetName, new Set());
    flashPlayers(Array.from(affected));
  }

  function giveManyWithFlash(targetNames) {
    const union = new Set();
    for (const n of targetNames) propagateDrinkAndCollect(n, union);
    flashPlayers(Array.from(union));
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (deckRef.current.length === 0) return;

    const [next, ...rest] = deckRef.current;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    if (r === "A") {
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
      if (women.length) giveManyWithFlash(women);
      nextTurn();
      return;
    }

    if (r === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) giveManyWithFlash(men);
      nextTurn();
      return;
    }

    if (r === "6") {
      const all = playersRef.current.map((p) => p.name);
      if (all.length) giveManyWithFlash(all);
      nextTurn();
      return;
    }

    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    if (r === "8") {
      // IMPORTANT: turn stays on drawer until mate is chosen (we do not nextTurn here)
      setPhase("PICK_MATE");
      return;
    }

    if (r === "9") {
      setPendingLoserMode("RHYME");
      setPhase("PICK_LOSER");
      return;
    }

    if (r === "10") {
      setPendingLoserMode("CATEGORIES");
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
     TILE SELECTABILITY
  ========================= */

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

  function isTileSelectable(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (phase === "PICK_DRINK") return true;

    if (phase === "PICK_MATE") {
      if (!drawer) return false;
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
     PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetConsumeSoon();
      return;
    }

    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock immediately to prevent double selection
      setPhase("IDLE");

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      // NOW advance turn (this is what keeps the drawer highlighted until they pick)
      nextTurn();
      resetConsumeSoon();
      return;
    }

    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPendingLoserMode(null);
      setPhase("IDLE");
      nextTurn();
      resetConsumeSoon();
      return;
    }

    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetConsumeSoon();
      return;
    }

    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetConsumeSoon();
      return;
    }

    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        // last tapper loses (+ mates)
        giveDrinkWithFlash(name);

        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
      return;
    }
  }

  /* =========================
     ACTION BUTTONS (4)
  ========================= */

  function startReaction(type) {
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

  function onRuleBreak() {
    if (phaseRef.current !== "IDLE") return;
    setPhase("RULE_BREAK_PICK");
  }

  function onQuestion() {
    if (phaseRef.current !== "IDLE") return;
    if (!questionMaster) return;
    setPhase("QM_PICK");
  }

  /* =========================
     WATERFALL
  ========================= */

  function resolvedWaterfallSeconds() {
    const base = clamp(waterfallSeconds, WATERFALL_MIN_S, WATERFALL_MAX_S);
    if (!waterfallRandom) return base;
    return Math.floor(WATERFALL_MIN_S + Math.random() * (WATERFALL_MAX_S - WATERFALL_MIN_S + 1));
  }

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const seconds = resolvedWaterfallSeconds();
    setWaterfallRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    stopWaterfallTimer();
    waterfallIntervalRef.current = setInterval(() => {
      setWaterfallRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          stopWaterfallTimer();

          // END: everyone gets +3 (NO mates)
          const all = playersRef.current.map((p) => p.name);
          addDrinkNoMatesMany(all, WATERFALL_END_DRINKS);

          setPhase("IDLE");
          nextTurn(); // end waterfall advances turn once
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function cancelWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY" && phaseRef.current !== "WATERFALL_RUNNING") return;
    stopWaterfallTimer();
    setWaterfallRemaining(0);
    setPhase("IDLE");
    // Do not advance turn on cancel
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
     STATUS COPY
  ========================= */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    if (phase === "WATERFALL_READY") return "Waterfall: set timer then Start (end: everyone +3, no mates)";
    if (phase === "WATERFALL_RUNNING") return `Waterfall running: ${waterfallRemaining}s (end: everyone +3)`;
    if (phase === "PICK_DRINK") return "Tap a player to drink (+ mates)";
    if (phase === "PICK_MATE") return "Tap ONE mate (drawer stays highlighted)";
    if (phase === "PICK_LOSER")
      return `${pendingLoserMode === "CATEGORIES" ? "Categories" : "Rhyme"}: tap loser (+ mates)`;
    if (phase === "MAKE_RULE") return "Type a rule and Save";
    if (phase === "RULE_BREAK_PICK") return "Rule break: tap offender (+ mates)";
    if (phase === "QM_PICK") return "Question: tap who answered (+ mates)";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = Math.max(0, players.length - 1);
      return `${label}: last tap drinks (${reaction.tapped.length}/${eligible})`;
    }

    // Default: keep it short
    return "Tap the deck to draw";
  }

  /* =========================
     DEV TOOLS
  ========================= */

  function reshuffleNewDeck() {
    if (phaseRef.current !== "IDLE") return;
    stopWaterfallTimer();
    setDeck(buildDeck());
    setCard(null);
    setPendingLoserMode(null);
    setReaction({ type: null, owner: null, tapped: [] });
    setWaterfallRemaining(0);
  }

  function forceDrawRank(rank) {
    if (phaseRef.current !== "IDLE") return;

    const idx = deckRef.current.findIndex((c) => c.rank === rank);
    if (idx < 0) return;

    const picked = deckRef.current[idx];
    const rest = deckRef.current.filter((_, i) => i !== idx);

    setDeck(rest);
    setCard(picked);

    // Run same logic as drawCard for that rank
    const drawer = playersRef.current[turnIndex]?.name;

    if (rank === "A") return setPhase("WATERFALL_READY");
    if (rank === "2") return setPhase("PICK_DRINK");
    if (rank === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      return nextTurn();
    }
    if (rank === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) giveManyWithFlash(women);
      return nextTurn();
    }
    if (rank === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) giveManyWithFlash(men);
      return nextTurn();
    }
    if (rank === "6") {
      const all = playersRef.current.map((p) => p.name);
      if (all.length) giveManyWithFlash(all);
      return nextTurn();
    }
    if (rank === "7") {
      setHeavenMaster(drawer || null);
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
      setThumbMaster(drawer || null);
      return nextTurn();
    }
    if (rank === "Q") {
      setQuestionMaster(drawer || null);
      return nextTurn();
    }
    if (rank === "K") return setPhase("MAKE_RULE");

    nextTurn();
  }

  /* =========================
     RENDER HELPERS
  ========================= */

  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  // Turn highlight is ALWAYS the current turnIndex player
  function isTurnHighlighted(playerName) {
    return playerName === playersRef.current[turnIndex]?.name;
  }

  const drawLocked = phase !== "IDLE";
  const cardFaceTitle = card ? `${card.rank}${card.suit}` : "DECK";
  const cardFaceLabel = card ? (CARD_LABEL[card.rank] || "Draw") : "Tap to Start";

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
        <Panel title="🤝 Mates" items={matesLines(players)} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${drawLocked ? "disabled" : ""}`}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={drawLocked ? "Finish current action" : "Tap to draw"}
          >
            <div className="card-face">
              <div className="rank">{cardFaceTitle}</div>
              <div className="card-label">{cardFaceLabel}</div>
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rules} />
      </section>

      {/* Waterfall banner */}
      {(phase === "WATERFALL_READY" || phase === "WATERFALL_RUNNING") && (
        <div className={`banner waterfall ${phase === "WATERFALL_RUNNING" ? "running" : ""}`}>
          <div className="banner-top">
            <div className="banner-title">🌊 Waterfall</div>
            <button className="banner-x" onClick={cancelWaterfall} title="Close" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="banner-body">
            {phase === "WATERFALL_READY" ? (
              <>
                <div className="wf-row">
                  <label className="wf-label">Timer</label>
                  <div className="wf-controls">
                    <input
                      className="wf-range"
                      type="range"
                      min={WATERFALL_MIN_S}
                      max={WATERFALL_MAX_S}
                      value={clamp(waterfallSeconds, WATERFALL_MIN_S, WATERFALL_MAX_S)}
                      onChange={(e) => setWaterfallSeconds(parseInt(e.target.value, 10))}
                    />
                    <div className="wf-seconds">
                      {clamp(waterfallSeconds, WATERFALL_MIN_S, WATERFALL_MAX_S)}s
                    </div>
                  </div>
                </div>

                <div className="wf-row wf-row-bottom">
                  <label className="wf-toggle">
                    <input
                      type="checkbox"
                      checked={waterfallRandom}
                      onChange={(e) => setWaterfallRandom(e.target.checked)}
                    />
                    <span>Random (5–20s)</span>
                  </label>

                  <button className="wf-start" onClick={startWaterfall}>
                    Start
                  </button>
                </div>

                <div className="wf-foot">
                  Everyone drinks while timer runs. End: everyone +{WATERFALL_END_DRINKS}. (No mates)
                </div>
              </>
            ) : (
              <div className="wf-running">
                <div className="wf-count">{waterfallRemaining}s</div>
                <div className="wf-sub">
                  Everyone drinks. End: +{WATERFALL_END_DRINKS} each. (No mates)
                </div>
              </div>
            )}
          </div>
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
          const isTurn = isTurnHighlighted(p.name);

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

      {/* DEV PANEL */}
      {isDev && (
        <section className="dev">
          <div className="dev-title">Dev Tools</div>

          <div className="dev-row">
            <button className="dev-btn" onClick={reshuffleNewDeck} disabled={phase !== "IDLE"}>
              Reshuffle New Deck
            </button>
            <div className="dev-hint">Enabled with ?dev=1 (IDLE only)</div>
          </div>

          <div className="dev-row dev-force">
            <div className="dev-subtitle">Force Draw</div>
            <div className="dev-force-grid">
              {RANKS.map((r) => (
                <button
                  key={r}
                  className="dev-chip"
                  onClick={() => forceDrawRank(r)}
                  disabled={phase !== "IDLE"}
                  title={`Force draw ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="dev-row">
            <div className="dev-subtitle">Remaining Deck</div>
            <div className="dev-deck">
              {deck.map((c, i) => (
                <span key={`${c.rank}${c.suit}${i}`} className="dev-card">
                  {cardToString(c)}
                </span>
              ))}
            </div>
          </div>
        </section>
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

function matesLines(players) {
  const out = [];
  for (const p of players) {
    for (const m of p.mates) out.push(`${p.name} → ${m}`);
  }
  return out;
       }
