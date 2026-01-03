// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   DEV FLAG
========================= */

const DEV_MODE = import.meta.env?.DEV ?? false;

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

const STORAGE_KEY = "kad_kings_state_v3";

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

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* =========================
   MULTIPLAYER ARCHITECTURE SCAFFOLD
   (single-device now; later replace adapter with WebSocket adapter)
========================= */

function createLocalAdapter() {
  const listeners = new Set();
  return {
    emit(action) {
      for (const fn of listeners) fn(action);
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/* =========================
   APP
========================= */

export default function App() {
  /**
   * PHASES
   * IDLE
   * WATERFALL_READY
   * PICK_DRINK
   * PICK_MATE
   * PICK_LOSER          (used for 9/10)
   * MAKE_RULE           (K)
   * REACTION_ACTIVE     (7/J power usage)
   * QM_PICK             (Q button)
   * RULE_BREAK_PICK     (manual enforcement)
   */
  const [phase, setPhase] = useState("IDLE");

  const [deck, setDeck] = useState(buildDeck);
  const [discard, setDiscard] = useState([]); // history pile (drawn cards)
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

  // Power owners / badges (transfer on redraw)
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Rules (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Rule-break reason: either "RULE_BREAK" (button) or "RULE:<text>"
  const [ruleBreakReason, setRuleBreakReason] = useState(null);

  // Reaction (7/J usage)
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [], // ordered names
  });

  // Flash UI
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Prevent double-tap races (mate selection etc.)
  const consumeTapRef = useRef(false);

  // Refs to avoid stale reads inside quick tap sequences
  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const reactionRef = useRef(reaction);
  reactionRef.current = reaction;

  // Adapter (local today; swap later for websocket)
  const adapterRef = useRef(null);
  if (!adapterRef.current) adapterRef.current = createLocalAdapter();

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
     PERSISTENCE (LocalStorage)
     - loads once
     - saves on changes
     - safety: never restore into a "locked" phase on load
       (prevents getting stuck if a reload happens mid-action)
  ========================= */

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? safeParse(raw) : null;
    if (!saved) return;

    // Minimal validation / fallbacks
    if (Array.isArray(saved.players) && saved.players.length) setPlayers(saved.players);
    if (typeof saved.turnIndex === "number") setTurnIndex(saved.turnIndex);

    if (Array.isArray(saved.deck) && saved.deck.length) setDeck(saved.deck);
    if (Array.isArray(saved.discard)) setDiscard(saved.discard);
    setCard(saved.card ?? null);

    setHeavenMaster(saved.heavenMaster ?? null);
    setThumbMaster(saved.thumbMaster ?? null);
    setQuestionMaster(saved.questionMaster ?? null);

    if (Array.isArray(saved.rules)) setRules(saved.rules);
    setRuleDraft("");

    // Safety: do NOT restore into a locked phase; always come back IDLE
    setPhase("IDLE");
    setReaction({ type: null, owner: null, tapped: [] });
    setRuleBreakReason(null);
    setFlashNames(new Set());
  }, []);

  useEffect(() => {
    const payload = {
      deck,
      discard,
      card,
      turnIndex,
      players,
      heavenMaster,
      thumbMaster,
      questionMaster,
      rules,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [deck, discard, card, turnIndex, players, heavenMaster, thumbMaster, questionMaster, rules]);

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
   * Recursively applies drink (+1) through mate links and returns the full affected set.
   * This ensures mates also flash when they drink due to mate propagation.
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

  function resetConsumeTapSoon() {
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

  /* =========================
     ACTION-BASED CORE (SYNC FRIENDLY)
     - today: adapter emits to local listener
     - tomorrow: adapter can be websocket; everyone applies same action
  ========================= */

  function applyAction(action) {
    if (!action || !action.type) return;

    switch (action.type) {
      case "DRAW_RESOLVE": {
        const { drawnCard, newDeck, newDiscard } = action.payload;

        setDeck(newDeck);
        setDiscard(newDiscard);
        setCard(drawnCard);

        const r = drawnCard.rank;
        const drawer = playersRef.current[turnIndex]?.name;

        // A — Waterfall banner (no red flash for starting)
        if (r === "A") {
          setPhase("WATERFALL_READY");
          return;
        }

        // 2 — pick someone
        if (r === "2") {
          setPhase("PICK_DRINK");
          return;
        }

        // 3 — drawer drinks (+mates) and flash all affected
        if (r === "3") {
          if (drawer) giveDrinkWithFlash(drawer);
          nextTurn();
          return;
        }

        // 4 — women
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

        // 7/J/Q — transfer badge to drawer
        if (r === "7") {
          setHeavenMaster(drawer || null);
          nextTurn();
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

        // 8 — pick mate (ONE)
        if (r === "8") {
          setPhase("PICK_MATE");
          return;
        }

        // 9/10 — tap loser
        if (r === "9" || r === "10") {
          setPhase("PICK_LOSER");
          return;
        }

        // K — add rule
        if (r === "K") {
          setPhase("MAKE_RULE");
          return;
        }

        // fallback
        nextTurn();
        return;
      }

      case "WATERFALL_START": {
        // Drawer drinks first, but NO red flash for starting waterfall
        const drawer = playersRef.current[turnIndex]?.name;
        if (drawer) {
          // per your requirement: no flash; also no mate propagation unless you ask for it
          addDrink(drawer);
        }
        setPhase("IDLE");
        nextTurn();
        return;
      }

      case "START_REACTION": {
        const { reactionType, owner } = action.payload;
        setReaction({ type: reactionType, owner, tapped: [] });
        setPhase("REACTION_ACTIVE");
        return;
      }

      case "REACTION_TAP": {
        const { name } = action.payload;
        const r = reactionRef.current;
        const owner = r.owner;
        if (!owner) return;
        if (name === owner) return;
        if (r.tapped.includes(name)) return;

        const nextTapped = [...r.tapped, name];
        setReaction((prev) => ({ ...prev, tapped: nextTapped }));

        const eligible = playersRef.current.length - 1;
        if (nextTapped.length >= eligible) {
          // last tapper loses
          giveDrinkWithFlash(name);
          setReaction({ type: null, owner: null, tapped: [] });
          setPhase("IDLE");
        }
        return;
      }

      case "PICK_DRINK": {
        const { name } = action.payload;
        giveDrinkWithFlash(name);
        setPhase("IDLE");
        nextTurn();
        return;
      }

      case "PICK_LOSER": {
        const { name } = action.payload;
        giveDrinkWithFlash(name);
        setPhase("IDLE");
        nextTurn();
        return;
      }

      case "PICK_MATE": {
        const { name } = action.payload;
        const drawer = playersRef.current[turnIndex]?.name;
        if (!drawer) return;
        if (name === drawer) return;

        // Phase already locked to IDLE by caller for double-tap safety
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.name !== drawer) return p;
            if (p.mates.includes(name)) return p;
            return { ...p, mates: [...p.mates, name] };
          })
        );

        nextTurn();
        return;
      }

      case "RULE_BREAK_PICK": {
        const { name } = action.payload;
        giveDrinkWithFlash(name);
        setRuleBreakReason(null);
        setPhase("IDLE");
        return;
      }

      case "QM_PICK": {
        const { name } = action.payload;
        giveDrinkWithFlash(name);
        setPhase("IDLE");
        return;
      }

      case "ADD_RULE": {
        const { text } = action.payload;
        setRules((prev) => [...prev, text]);
        setRuleDraft("");
        setPhase("IDLE");
        nextTurn();
        return;
      }

      case "RESET_GAME": {
        clearFlashTimer();
        setFlashNames(new Set());
        setPhase("IDLE");
        setDeck(buildDeck());
        setDiscard([]);
        setCard(null);
        setTurnIndex(0);
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
        setRuleBreakReason(null);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      default:
        return;
    }
  }

  // adapter wiring (local)
  useEffect(() => {
    const off = adapterRef.current.on(applyAction);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dispatch(action) {
    adapterRef.current.emit(action);
  }

  /* =========================
     DRAW
  ========================= */

  function drawCard() {
    if (phaseRef.current !== "IDLE") return;
    if (!deck.length) return;

    const [next, ...rest] = deck;

    dispatch({
      type: "DRAW_RESOLVE",
      payload: {
        drawnCard: next,
        newDeck: rest,
        newDiscard: [next, ...discard],
      },
    });
  }

  /* =========================
     DEV FORCE DRAW
  ========================= */

  function devForceDrawAt(index) {
    if (!DEV_MODE) return;
    if (phaseRef.current !== "IDLE") return;
    const forced = deck[index];
    if (!forced) return;

    const rest = deck.filter((_, i) => i !== index);

    dispatch({
      type: "DRAW_RESOLVE",
      payload: {
        drawnCard: forced,
        newDeck: rest,
        newDiscard: [forced, ...discard],
      },
    });
  }

  /* =========================
     TILE SELECTABILITY / LOCKING
  ========================= */

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
      const r = reaction;
      const owner = r.owner;
      if (!owner) return false;
      return name !== owner && !r.tapped.includes(name);
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

    const p = phaseRef.current;

    if (p === "PICK_DRINK") {
      consumeTapRef.current = true;
      dispatch({ type: "PICK_DRINK", payload: { name } });
      resetConsumeTapSoon();
      return;
    }

    if (p === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      // lock immediately to prevent double selection
      consumeTapRef.current = true;
      setPhase("IDLE");

      dispatch({ type: "PICK_MATE", payload: { name } });
      resetConsumeTapSoon();
      return;
    }

    if (p === "PICK_LOSER") {
      consumeTapRef.current = true;
      dispatch({ type: "PICK_LOSER", payload: { name } });
      resetConsumeTapSoon();
      return;
    }

    if (p === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      dispatch({ type: "RULE_BREAK_PICK", payload: { name } });
      resetConsumeTapSoon();
      return;
    }

    if (p === "QM_PICK") {
      consumeTapRef.current = true;
      dispatch({ type: "QM_PICK", payload: { name } });
      resetConsumeTapSoon();
      return;
    }

    if (p === "REACTION_ACTIVE") {
      dispatch({ type: "REACTION_TAP", payload: { name } });
      return;
    }
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function startReaction(reactionType) {
    if (phaseRef.current !== "IDLE") return;

    const owner = reactionType === "THUMB" ? thumbMaster : heavenMaster;
    if (!owner) return;

    dispatch({
      type: "START_REACTION",
      payload: { reactionType, owner },
    });
  }

  function onThumb() {
    startReaction("THUMB");
  }

  function onHeaven() {
    startReaction("HEAVEN");
  }

  /**
   * Rule Break enforcement:
   * - Press 🚫 to enter RULE_BREAK_PICK, then tap offender
   * - OR tap a rule row to enter RULE_BREAK_PICK with that rule as the reason
   */
  function onRuleBreak() {
    if (phaseRef.current !== "IDLE") return;
    setRuleBreakReason("RULE_BREAK");
    setPhase("RULE_BREAK_PICK");
  }

  function onQuestion() {
    if (phaseRef.current !== "IDLE") return;
    if (!questionMaster) return;
    setPhase("QM_PICK");
  }

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;
    dispatch({ type: "WATERFALL_START" });
  }

  /* =========================
     RULE INPUT (K)
  ========================= */

  function submitRule() {
    const text = ruleDraft.trim();
    if (!text) return;

    dispatch({ type: "ADD_RULE", payload: { text } });
  }

  /* =========================
     UI DERIVED LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => rules, [rules]);

  const lastDraws = useMemo(() => {
    // show the last 6 draws (most recent first)
    return discard.slice(0, 6).map(cardToString);
  }, [discard]);

  /* =========================
     STATUS COPY
  ========================= */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    const r = card.rank;

    if (phase === "WATERFALL_READY") return "Waterfall — tap the banner when ready";
    if (phase === "PICK_DRINK") return "Pick someone to drink (+1)";
    if (phase === "PICK_MATE") return "Pick ONE mate (tap a player)";
    if (phase === "PICK_LOSER") return `${RULE_TEXT[r]} — tap the loser (+1)`;
    if (phase === "MAKE_RULE") return "Make a rule — type it and save";

    if (phase === "RULE_BREAK_PICK") {
      if (ruleBreakReason?.startsWith("RULE:")) return `Rule Break (${ruleBreakReason.slice(5)}) — tap offender (+1)`;
      return "Rule Break — tap offender (+1)";
    }

    if (phase === "QM_PICK") return "Question — tap who answered (+1)";

    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label} active — players tap their tile (${reaction.tapped.length}/${eligible})`;
    }

    return RULE_TEXT[r] || "Tap the deck to draw";
  }

  /* =========================
     RENDER
  ========================= */

  const drawLocked = phase !== "IDLE";

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>

        <button className="fullscreen-btn" onClick={enterFullscreen} aria-label="Fullscreen" title="Fullscreen">
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
                <div className="mini-history" aria-label="Last drawn cards">
                  {lastDraws.length ? lastDraws.map((x) => <span key={x}>{x}</span>) : <span>—</span>}
                </div>
              </>
            )}
          </div>
        </div>

        <Panel
          title="📜 Rules"
          items={rulesLines}
          onRowClick={(text) => {
            // tap rule row to enforce it
            if (phaseRef.current !== "IDLE") return;
            if (!text || text === "—") return;
            setRuleBreakReason(`RULE:${text}`);
            setPhase("RULE_BREAK_PICK");
          }}
        />
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

        <button className="btn rulebreak" onClick={onRuleBreak} disabled={phase !== "IDLE"} title="Rule Break (tap offender)">
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
                  {/* badges BETWEEN name and beers */}
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

      {/* DEV-ONLY: Force draw deck + Reset + Discard list */}
      {DEV_MODE && (
        <section className="dev-deck">
          <div className="dev-title">DEV DECK — tap a card to force-draw</div>

          <div className="dev-controls">
            <button className="dev-btn" onClick={() => dispatch({ type: "RESET_GAME" })}>
              Reset Game
            </button>

            <div className="dev-meta">
              <span>Deck: {deck.length}</span>
              <span>Discard: {discard.length}</span>
              <span>Phase: {phase}</span>
            </div>
          </div>

          <div className="dev-cards">
            {deck.map((c, i) => (
              <button
                key={`${c.rank}${c.suit}${i}`}
                className={`dev-card ${i === 0 ? "next" : ""}`}
                onClick={() => devForceDrawAt(i)}
                title={`Force draw ${c.rank}${c.suit}`}
              >
                {c.rank}
                {c.suit}
              </button>
            ))}
          </div>

          <details className="dev-discard">
            <summary>Discard pile (most recent first)</summary>
            <div className="dev-discard-list">
              {discard.length ? discard.map((c, idx) => <span key={`${cardToString(c)}_${idx}`}>{cardToString(c)}</span>) : <span>—</span>}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

/* =========================
   PANEL
========================= */

function Panel({ title, items = [], onRowClick }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>

      {[...Array(4)].map((_, i) => {
        const text = items[i] || "—";
        const clickable = Boolean(onRowClick) && text !== "—";

        return (
          <div
            key={i}
            className={`row ${clickable ? "ROW_CLICK" : ""}`}
            title={clickable ? "Tap to enforce (Rule Break)" : text}
            onClick={() => {
              if (!clickable) return;
              onRowClick(text);
            }}
            role={clickable ? "button" : undefined}
          >
            <span className="row-text">{text}</span>
          </div>
        );
      })}
    </div>
  );
  }
