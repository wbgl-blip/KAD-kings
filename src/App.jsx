// src/App.jsx
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

// Waterfall (Ace) — RANDOM ONLY
const WF_MIN_S = 3;
const WF_MAX_S = 20;
const WF_END_DRINKS = 3;

/* =====================================================
   DECK
===================================================== */

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
  return `${c.rank}${c.suit}`;
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  /**
   * PHASES
   * IDLE               (tap deck to draw)
   * WATERFALL_RUNNING  (Ace countdown)
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

  // 9/10 mode for status clarity
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

  // Waterfall countdown
  const [wfRemaining, setWfRemaining] = useState(0);
  const wfIntervalRef = useRef(null);

  // Dev tools (enable with ?dev=1)
  const isDev = useMemo(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      return qs.get("dev") === "1";
    } catch {
      return false;
    }
  }, []);

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  /* =====================================================
     LIFECYCLE CLEANUP
  ===================================================== */

  function clearFlashTimer() {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  }

  function stopWaterfallTimer() {
    if (wfIntervalRef.current) {
      clearInterval(wfIntervalRef.current);
      wfIntervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearFlashTimer();
      stopWaterfallTimer();
    };
  }, []);

  /* =====================================================
     HELPERS
  ===================================================== */

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

  // Build mate-closure (mates-of-mates) set
  function mateClosure(startName) {
    const visited = new Set();
    const stack = [startName];

    while (stack.length) {
      const name = stack.pop();
      if (!name || visited.has(name)) continue;

      visited.add(name);

      const mates =
        playersRef.current.find((p) => p.name === name)?.mates || [];
      for (const m of mates) stack.push(m);
    }

    return visited;
  }

  // Apply one +1 event with mate propagation, NO duplicates, and flash ALL affected tiles
  function giveDrinkWithFlash(targetName) {
    const affected = mateClosure(targetName);

    setPlayers((prev) =>
      prev.map((p) =>
        affected.has(p.name) ? { ...p, beers: p.beers + 1 } : p
      )
    );

    flashPlayers(Array.from(affected));
  }

  // Apply +1 event to multiple initial targets but only +1 per final affected tile
  function giveManyWithFlash(targetNames) {
    const union = new Set();
    for (const n of targetNames) {
      const affected = mateClosure(n);
      for (const a of affected) union.add(a);
    }

    setPlayers((prev) =>
      prev.map((p) =>
        union.has(p.name) ? { ...p, beers: p.beers + 1 } : p
      )
    );

    flashPlayers(Array.from(union));
  }

  // Waterfall end: NO mates, NO flashing (by design)
  function addEveryoneNoMates(amount) {
    setPlayers((prev) =>
      prev.map((p) => ({ ...p, beers: p.beers + amount }))
    );
  }

  function resetConsumeSoon() {
    setTimeout(() => {
      consumeTapRef.current = false;
    }, 0);
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

  /* =====================================================
     WATERFALL (ACE) — RANDOM ONLY 3–20s
     - Starts immediately on draw
     - Everyone drinks during timer
     - End: everyone gets +3 (NO mates)
     - No red flashing
  ===================================================== */

  function startWaterfallRunning() {
    stopWaterfallTimer();

    const seconds = randInt(WF_MIN_S, WF_MAX_S);
    setWfRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    wfIntervalRef.current = setInterval(() => {
      setWfRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          stopWaterfallTimer();

          // End effect (NO mates)
          addEveryoneNoMates(WF_END_DRINKS);

          // Exit lock and advance turn
          setPhase("IDLE");
          nextTurn();
          return 0;
        }

        return next;
      });
    }, 1000);
  }

  function cancelWaterfall() {
    if (phaseRef.current !== "WATERFALL_RUNNING") return;
    stopWaterfallTimer();
    setWfRemaining(0);
    setPhase("IDLE");
    // do not advance turn on cancel
  }

  /* =====================================================
     DRAW CARD
  ===================================================== */

  function applyDraw(rank) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (rank === "A") {
      startWaterfallRunning();
      return;
    }

    if (rank === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    if (rank === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    if (rank === "4") {
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);
      if (women.length) giveManyWithFlash(women);
      nextTurn();
      return;
    }

    if (rank === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);
      if (men.length) giveManyWithFlash(men);
      nextTurn();
      return;
    }

    if (rank === "6") {
      const all = playersRef.current.map((p) => p.name);
      if (all.length) giveManyWithFlash(all);
      nextTurn();
      return;
    }

    if (rank === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      return;
    }

    if (rank === "8") {
      // IMPORTANT: keep the turn highlight on drawer until they pick (we do not advance turn here)
      setPhase("PICK_MATE");
      return;
    }

    if (rank === "9") {
      setPendingLoserMode("RHYME");
      setPhase("PICK_LOSER");
      return;
    }

    if (rank === "10") {
      setPendingLoserMode("CATEGORIES");
      setPhase("PICK_LOSER");
      return;
    }

    if (rank === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      return;
    }

    if (rank === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      return;
    }

    if (rank === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    nextTurn();
  }

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (deckRef.current.length === 0) return;

    const [next, ...rest] = deckRef.current;
    setDeck(rest);
    setCard(next);

    // clear any prior loser mode once a new card is drawn (except if it sets it)
    if (next.rank !== "9" && next.rank !== "10") setPendingLoserMode(null);

    applyDraw(next.rank);
  }

  /* =====================================================
     TILE SELECTABILITY / LOCKING
  ===================================================== */

  const isActionPhase = useMemo(() => {
    return [
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

  /* =====================================================
     PLAYER TAP
  ===================================================== */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    // PICK_DRINK (2)
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetConsumeSoon();
      return;
    }

    // PICK_MATE (8) — ONE selection per draw; lock immediately to avoid double-tap races
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock immediately
      setPhase("IDLE");

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      nextTurn();
      resetConsumeSoon();
      return;
    }

    // PICK_LOSER (9/10)
    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPendingLoserMode(null);
      setPhase("IDLE");
      nextTurn();
      resetConsumeSoon();
      return;
    }

    // RULE_BREAK_PICK (manual enforcement)
    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetConsumeSoon();
      return;
    }

    // QM_PICK (Q action)
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetConsumeSoon();
      return;
    }

    // REACTION_ACTIVE (7/J)
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

  /* =====================================================
     ACTION BUTTONS (4)
  ===================================================== */

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

  /* =====================================================
     RULE INPUT (K)
  ===================================================== */

  function submitRule() {
    const text = ruleDraft.trim();
    if (!text) return;

    setRules((prev) => [...prev, text]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
  }

  /* =====================================================
     PANELS
  ===================================================== */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => rules, [rules]);

  /* =====================================================
     STATUS COPY
  ===================================================== */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    if (phase === "WATERFALL_RUNNING") {
      return `🌊 Waterfall — everyone drinks (${wfRemaining}s). End: everyone +${WF_END_DRINKS}. (No mates)`;
    }
    if (phase === "PICK_DRINK") return "Pick someone to drink (+ mates)";
    if (phase === "PICK_MATE") return "Pick ONE mate (tap a player)";
    if (phase === "PICK_LOSER") {
      const label = pendingLoserMode === "CATEGORIES" ? "Categories" : "Rhyme";
      return `${label} — tap the loser (+ mates)`;
    }
    if (phase === "MAKE_RULE") return "Make a rule — type it and save";
    if (phase === "RULE_BREAK_PICK") return "Rule Break — tap the offender (+ mates)";
    if (phase === "QM_PICK") return "Question — tap who answered (+ mates)";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = Math.max(0, players.length - 1);
      return `${label} active — last tap drinks (${reaction.tapped.length}/${eligible})`;
    }

    // Default short line
    return `${CARD_LABEL[card.rank] || "Draw"} — ${card.rank}${card.suit}`;
  }

  /* =====================================================
     DEV TOOLS
  ===================================================== */

  function reshuffleNewDeck() {
    if (phaseRef.current !== "IDLE") return;

    stopWaterfallTimer();
    setWfRemaining(0);

    setDeck(buildDeck());
    setCard(null);
    setPendingLoserMode(null);
    setReaction({ type: null, owner: null, tapped: [] });
  }

  function forceDrawRank(rank) {
    if (phaseRef.current !== "IDLE") return;

    const idx = deckRef.current.findIndex((c) => c.rank === rank);
    if (idx < 0) return;

    const picked = deckRef.current[idx];
    const rest = deckRef.current.filter((_, i) => i !== idx);

    setDeck(rest);
    setCard(picked);

    // clear prior loser mode unless it sets it
    if (rank !== "9" && rank !== "10") setPendingLoserMode(null);

    applyDraw(rank);
  }

  /* =====================================================
     RENDER
  ===================================================== */

  const drawLocked = phase !== "IDLE";

  // Turn highlight: always the current turnIndex player.
  // For PICK_MATE, we intentionally do NOT advance turn until mate is chosen.
  function isTurnHighlighted(playerName) {
    return playerName === playersRef.current[turnIndex]?.name;
  }

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
        <Panel title="🤝 Mates" items={matesLines} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${drawLocked ? "disabled" : ""}`}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={drawLocked ? "Finish current action" : "Tap to draw"}
          >
            <div className="card-face">
              <div className="card-rank">{cardFaceTitle}</div>
              <div className="card-label">{cardFaceLabel}</div>
              <div className="card-sub">{deck.length} cards left</div>
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rulesLines} />
      </section>

      {/* Waterfall banner (RUNNING ONLY) */}
      {phase === "WATERFALL_RUNNING" && (
        <div className="banner waterfall running" role="region" aria-label="Waterfall">
          <div className="banner-top">
            <div className="banner-title">🌊 Waterfall</div>
            <button className="banner-x" onClick={cancelWaterfall} title="Close">
              ✕
            </button>
          </div>

          <div className="banner-body">
            <div className="wf-running">
              <div className="wf-count">{wfRemaining}s</div>
              <div className="wf-sub">
                Everyone drinks while timer runs. End: everyone +{WF_END_DRINKS}. (No mates)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 action buttons in one row */}
      <section className="actions actions-four" aria-label="Actions">
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
      <section className="status-bar" aria-label="Status">
        <div className="status-main">{statusCopy()}</div>
      </section>

      {/* Players */}
      <section className="players" aria-label="Players">
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
        <div className="rule-input" role="region" aria-label="Rule input">
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
        <section className="dev" aria-label="Dev tools">
          <div className="dev-title">Dev Tools</div>

          <div className="dev-row">
            <button className="dev-btn" onClick={reshuffleNewDeck} disabled={phase !== "IDLE"}>
              Reshuffle New Deck
            </button>
            <div className="dev-hint">Enable with ?dev=1 (IDLE only)</div>
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

/* =====================================================
   PANEL
===================================================== */

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
