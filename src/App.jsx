// src/App.jsx
import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const CARD_TITLE = {
  A: "Waterfall",
  2: "Pick Someone",
  3: "Me",
  4: "Women",
  5: "Guys",
  6: "Everyone",
  7: "Heaven (Power)",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster (Power)",
  Q: "Question Master (Power)",
  K: "Make a Rule",
};

const CARD_HELP = {
  A: "Drawer starts when ready (banner). Drawer drinks first.",
  2: "Tap a player to drink (+1) (mates chain).",
  3: "Drawer drinks (+1) (mates chain).",
  4: "All women drink (+1) (mates chain).",
  5: "All guys drink (+1) (mates chain).",
  6: "Everyone drinks (+1) (mates chain).",
  7: "Badge assigned. Owner can start Heaven anytime (☁). Last tile tapped drinks (owner excluded).",
  8: "Tap ONE mate (not yourself).",
  9: "Tap the loser to drink (+1) (mates chain).",
  10: "Tap the loser to drink (+1) (mates chain).",
  J: "Badge assigned. Owner can start Thumb anytime (👍). Last tile tapped drinks (owner excluded).",
  Q: "Badge assigned. Tap ❓ then tap who answered (+1) (mates chain).",
  K: "Type a rule and Save. Use 🚫 to enforce rule breaks.",
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

function cardToString(c) {
  return `${c.rank}${c.suit}`;
}

function isDevEnabled() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("dev") === "1";
  } catch {
    return false;
  }
}

/* =========================
   APP
========================= */

export default function App() {
  /**
   * PHASES
   * IDLE
   * WATERFALL_READY     (A drawn; banner shown)
   * PICK_DRINK          (2)
   * PICK_MATE           (8)
   * PICK_LOSER          (9/10)
   * MAKE_RULE           (K)
   * REACTION_ACTIVE     (Thumb/Heaven started)
   * QM_PICK             (Question started)
   * RULE_BREAK_PICK     (Rule Break started)
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

  // Badge owners (transfer on re-draw)
  const [heavenMaster, setHeavenMaster] = useState(null); // 7
  const [thumbMaster, setThumbMaster] = useState(null); // J
  const [questionMaster, setQuestionMaster] = useState(null); // Q

  // Rules (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Reaction state (Thumb/Heaven)
  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [], // ordered names who tapped
  });

  // Flash UI state (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Refs to avoid stale closures + prevent double-taps
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

  const DEV = useMemo(() => isDevEnabled(), []);

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
   * Recursively applies drink (+1) through mate links and returns full affected set.
   * This is used to ensure mates ALSO flash when they drink due to mate propagation.
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
    // Used for Waterfall start to honor: "player shouldn't flash red for starting waterfall"
    propagateDrinkAndCollect(targetName, new Set());
  }

  function resetTapConsumptionSoon() {
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

    // A — Waterfall requires banner tap; do not advance turn yet
    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — pick someone (tap a player)
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — drawer drinks immediately
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    // 4 — women drink
    if (r === "4") {
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);

      if (women.length) {
        const union = new Set();
        for (const n of women) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }

    // 5 — guys drink
    if (r === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);

      if (men.length) {
        const union = new Set();
        for (const n of men) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }

    // 6 — everyone drinks
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

    // 8 — pick mate; do not advance turn until mate picked
    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9/10 — enforcer taps loser; do not advance turn until loser picked
    if (r === "9" || r === "10") {
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

    // K — make a rule; do not advance turn until saved
    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    // default
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

    // PICK_DRINK (2)
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      resetTapConsumptionSoon();
      return;
    }

    // PICK_MATE (8) — ONE selection; keep turn highlight on drawer until pick
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock immediately to prevent double mate selection
      setPhase("IDLE");

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p; // no duplicate mate
          return { ...p, mates: [...p.mates, name] };
        })
      );

      // now advance turn
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

    // QM_PICK — QM taps who answered
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // REACTION_ACTIVE — last tile tapped drinks; owner excluded
    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        // last tapper loses (this tap)
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
    // “Anytime” means: only when not locked in another action
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

  // Waterfall banner action — drawer drinks first, but NO flash for starting waterfall
  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const drawer = playersRef.current[turnIndex]?.name;
    if (drawer) {
      // honors "no red flash for starting waterfall"
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
     DEV TOOLS
  ========================= */

  function devForceDraw(rank) {
    if (!DEV) return;
    if (phaseRef.current !== "IDLE") return;

    // Find the next card of that rank in the deck; if not found, do nothing
    const idx = deck.findIndex((c) => c.rank === rank);
    if (idx === -1) return;

    const picked = deck[idx];
    const rest = [...deck.slice(0, idx), ...deck.slice(idx + 1)];

    setDeck(rest);
    setCard(picked);

    // Reuse the same draw resolution logic by inlining behavior:
    // (This is intentionally duplicated to keep it simple + deterministic in dev.)
    const r = picked.rank;
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
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);
      if (women.length) {
        const union = new Set();
        for (const n of women) propagateDrinkAndCollect(n, union);
        flashPlayers(Array.from(union));
      }
      nextTurn();
      return;
    }
    if (r === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);
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
     LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => rules, [rules]);

  /* =========================
     CARD COPY (no status bar)
========================= */

  function cardInstruction() {
    // During interactive phases, the card should guide the current required action
    if (!card) return "Tap to draw the first card";

    if (phase === "WATERFALL_READY") return "Tap the Waterfall banner when ready";
    if (phase === "PICK_DRINK") return "Tap a player to drink (+1)";
    if (phase === "PICK_MATE") return "Tap ONE mate (not yourself)";
    if (phase === "PICK_LOSER") return "Tap the loser (+1)";
    if (phase === "MAKE_RULE") return "Type a rule and press Save";
    if (phase === "RULE_BREAK_PICK") return "Tap the rule-breaker (+1)";
    if (phase === "QM_PICK") return "Tap who answered (+1)";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = players.length - 1;
      return `${label}: tap your tile (${reaction.tapped.length}/${eligible})`;
    }

    return CARD_HELP[card.rank] || "Tap to draw";
  }

  /* =========================
     RENDER
  ========================= */

  const drawLocked = phase !== "IDLE";

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
              <>
                <div className="card-draw-label">DECK</div>
                <div className="card-instruction">{cardInstruction()}</div>
                <div className="sub">{deck.length} cards left</div>
              </>
            ) : (
              <>
                <div className="rank">
                  {card.rank}
                  {card.suit}
                </div>
                <div className="rule-text">{CARD_TITLE[card.rank]}</div>
                <div className="card-instruction">{cardInstruction()}</div>
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

          // Turn highlight stays ON the drawer during mate selection until they pick
          const isTurn = p.name === currentPlayer?.name;

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

      {/* DEV-ONLY: deck tools */}
      {DEV && (
        <div className="dev-panel" aria-label="Dev Deck Tools">
          <div className="dev-title">Dev Deck</div>

          <div className="dev-controls">
            {["A", "2", "3", "7", "8", "9", "10", "J", "Q", "K"].map((r) => (
              <button key={r} className="dev-btn" onClick={() => devForceDraw(r)}>
                Force {r}
              </button>
            ))}
          </div>

          <div className="dev-decklist">
            <div className="dev-subtitle">Remaining deck ({deck.length})</div>
            <div className="dev-cards">
              {deck.slice(0, 26).map((c, idx) => (
                <span key={`${cardToString(c)}-${idx}`} className="dev-card">
                  {cardToString(c)}
                </span>
              ))}
              {deck.length > 26 && <span className="dev-more">… +{deck.length - 26} more</span>}
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
