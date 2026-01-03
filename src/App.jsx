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
const MATE_FLASH_MS = 2000;

function cardToKey(c) {
  if (!c) return "";
  return `${c.rank}${c.suit}`;
}

function formatCard(c) {
  return `${c.rank}${c.suit}`;
}

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
   DEV MODE
========================= */

function isDevEnabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") return true;
    if (localStorage.getItem("kad_dev") === "1") return true;
  } catch {
    // ignore
  }
  return false;
}

/* =========================
   APP
========================= */

export default function App() {
  /* ---------- CORE GAME STATE ---------- */

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  /**
   * PHASES
   * IDLE
   * WATERFALL_READY
   * PICK_DRINK
   * PICK_MATE
   * PICK_LOSER          (used for 9/10)
   * MAKE_RULE           (K)
   * REACTION_ACTIVE     (7/J buttons)
   * QM_PICK             (Q button)
   * RULE_BREAK_PICK     (manual enforcement)
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

  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  /* ---------- RULES ---------- */

  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  /* ---------- REACTION STATE ---------- */

  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [], // ordered names who tapped
  });

  /* ---------- FLASH UI STATE ---------- */

  const [flashNames, setFlashNames] = useState(() => new Set()); // player tiles
  const flashTimerRef = useRef(null);

  // Flash rows in the Mates panel that represent links involved in propagation
  const [flashMateLinks, setFlashMateLinks] = useState(() => new Set()); // strings "A → B"
  const mateFlashTimerRef = useRef(null);

  /* ---------- REFS (avoid stale closures + prevent double-taps) ---------- */

  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Prevent rapid double taps from selecting multiple mates / double awarding
  const consumeTapRef = useRef(false);

  /* ---------- DEV UI STATE ---------- */

  const devEnabled = useMemo(() => isDevEnabled(), []);
  const [devOpen, setDevOpen] = useState(false);

  /* ---------- DERIVED ---------- */

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

  const drawLocked = phase !== "IDLE";

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

  function clearMateFlashTimer() {
    if (mateFlashTimerRef.current) {
      clearTimeout(mateFlashTimerRef.current);
      mateFlashTimerRef.current = null;
    }
  }

  function flashMateRows(linkStrings) {
    clearMateFlashTimer();
    setFlashMateLinks(new Set(linkStrings));
    mateFlashTimerRef.current = setTimeout(() => {
      setFlashMateLinks(new Set());
      mateFlashTimerRef.current = null;
    }, MATE_FLASH_MS);
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
   * This ensures mates tiles ALSO drink due to mate propagation.
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

  function computeMateLinkFlashesFromAffected(affectedSet) {
    // Flash the mate-row ONLY when that row represents a link fully inside the affected set.
    // Example: if Jeff drinks and it chains to Wes, and a row exists "Jeff → Wes", it flashes.
    const out = [];
    for (const p of playersRef.current) {
      for (const m of p.mates) {
        if (affectedSet.has(p.name) && affectedSet.has(m)) out.push(`${p.name} → ${m}`);
      }
    }
    return out;
  }

  function giveDrinkWithFlash(targetName) {
    const affected = propagateDrinkAndCollect(targetName, new Set());
    const affectedArr = Array.from(affected);
    flashPlayers(affectedArr);

    const mateLinks = computeMateLinkFlashesFromAffected(affected);
    if (mateLinks.length) flashMateRows(mateLinks);
  }

  function giveDrinkNoFlash(targetName, { propagateMates = true } = {}) {
    if (!targetName) return;
    if (propagateMates) propagateDrinkAndCollect(targetName, new Set());
    else addDrink(targetName);
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

  function reshuffleNewGame() {
    setDeck(buildDeck());
    setCard(null);
    setPhase("IDLE");
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
    setFlashNames(new Set());
    setFlashMateLinks(new Set());
  }

  /* =========================
     DRAW CARD (normal + dev)
  ========================= */

  function applyDraw(drawnCard, restDeck) {
    setDeck(restDeck);
    setCard(drawnCard);

    const r = drawnCard.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall requires banner tap
    if (r === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — Pick someone to drink
    if (r === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — Drawer drinks (+ mates) and flash all affected
    if (r === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
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
        flashPlayers(Array.from(union));
        const mateLinks = computeMateLinkFlashesFromAffected(union);
        if (mateLinks.length) flashMateRows(mateLinks);
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
        flashPlayers(Array.from(union));
        const mateLinks = computeMateLinkFlashesFromAffected(union);
        if (mateLinks.length) flashMateRows(mateLinks);
      }
      nextTurn();
      return;
    }

    // 6 — Everyone drinks
    if (r === "6") {
      const union = new Set();
      for (const p of playersRef.current) propagateDrinkAndCollect(p.name, union);
      flashPlayers(Array.from(union));
      const mateLinks = computeMateLinkFlashesFromAffected(union);
      if (mateLinks.length) flashMateRows(mateLinks);
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

    // 9/10 — Enforcer taps loser
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

    nextTurn();
  }

  function drawCard() {
    if (phase !== "IDLE") return;

    if (deck.length === 0) {
      // Keep the last card on screen; just no more drawing.
      return;
    }

    const [next, ...rest] = deck;
    applyDraw(next, rest);
  }

  // DEV: force draw a card by rank (first matching in deck)
  function devForceDrawRank(rank) {
    if (!devEnabled) return;
    if (phase !== "IDLE") return;
    const idx = deck.findIndex((c) => c.rank === rank);
    if (idx < 0) return;

    const forced = deck[idx];
    const rest = deck.slice(0, idx).concat(deck.slice(idx + 1));
    applyDraw(forced, rest);
  }

  // DEV: force draw exact card by key (e.g., "8♣")
  function devForceDrawCardKey(key) {
    if (!devEnabled) return;
    if (phase !== "IDLE") return;
    const idx = deck.findIndex((c) => `${c.rank}${c.suit}` === key);
    if (idx < 0) return;

    const forced = deck[idx];
    const rest = deck.slice(0, idx).concat(deck.slice(idx + 1));
    applyDraw(forced, rest);
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

    // QM_PICK — QM taps who answered
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      resetTapConsumptionSoon();
      return;
    }

    // REACTION_ACTIVE — 7/J started; last tile tapped drinks; owner excluded
    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = Math.max(playersRef.current.length - 1, 0);
      if (eligibleCount > 0 && nextTapped.length >= eligibleCount) {
        // last tapper loses
        giveDrinkWithFlash(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
      return;
    }

    // otherwise no-op
  }

  /* =========================
     ACTION BUTTONS (4 in one row)
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

  // Waterfall banner action — drawer drinks first, but NO red flash for starting waterfall
  function startWaterfall() {
    if (phase !== "WATERFALL_READY") return;

    const drawer = playersRef.current[turnIndex]?.name;

    // Drawer drinks first; apply mate propagation, but intentionally DO NOT flash.
    if (drawer) giveDrinkNoFlash(drawer, { propagateMates: true });

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
    if (deck.length === 0 && !card) return "Deck is empty";
    if (!card) return "Tap the deck to start";

    const r = card.rank;

    if (phase === "WATERFALL_READY") return "Waterfall — tap the banner when ready";
    if (phase === "PICK_DRINK") return "Pick someone to drink (+1)";
    if (phase === "PICK_MATE") return "Pick ONE mate (tap a player)";
    if (phase === "PICK_LOSER") return `${RULE_TEXT[r]} — tap the loser (+1)`;
    if (phase === "MAKE_RULE") return "Make a rule — type it and save";
    if (phase === "RULE_BREAK_PICK") return "Rule Break — tap the offender (+1)";
    if (phase === "QM_PICK") return "Question — tap who answered (+1)";

    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = Math.max(players.length - 1, 0);
      return `${label} active — players tap their tile (${reaction.tapped.length}/${eligible})`;
    }

    return RULE_TEXT[r] || "Tap the deck to draw";
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="header">
        {devEnabled && (
          <button className="dev-pill" onClick={() => setDevOpen(true)} title="Dev tools">
            DEV
          </button>
        )}

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
        <Panel title="🤝 Mates" items={matesLines} flashSet={flashMateLinks} />
        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${drawLocked ? "disabled" : ""}`}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={
              drawLocked
                ? "Finish current action"
                : deck.length === 0
                ? "Deck empty"
                : "Tap to draw"
            }
          >
            {!card ? (
              <div className="card-draw-label">DECK</div>
            ) : (
              <div className="card-inner">
                <div className="rank">{card.rank}{card.suit}</div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards left</div>
              </div>
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
          aria-disabled={phase !== "IDLE" || !thumbMaster}
          title={thumbMaster ? `Thumb (Owner: ${thumbMaster})` : "Draw J to assign Thumb"}
        >
          👍
        </button>

        <button
          className="btn heaven"
          onClick={onHeaven}
          disabled={phase !== "IDLE" || !heavenMaster}
          aria-disabled={phase !== "IDLE" || !heavenMaster}
          title={heavenMaster ? `Heaven (Owner: ${heavenMaster})` : "Draw 7 to assign Heaven"}
        >
          ☁
        </button>

        <button
          className="btn rulebreak"
          onClick={onRuleBreak}
          disabled={phase !== "IDLE"}
          aria-disabled={phase !== "IDLE"}
          title="Rule Break (tap offender)"
        >
          🚫
        </button>

        <button
          className="btn question"
          onClick={onQuestion}
          disabled={phase !== "IDLE" || !questionMaster}
          aria-disabled={phase !== "IDLE" || !questionMaster}
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
                  {/* badges between name and beers */}
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

      {/* DEV MODAL */}
      {devEnabled && devOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Dev Tools</div>
              <button className="modal-close" onClick={() => setDevOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-section">
              <div className="modal-row">
                <span className="muted">Deck remaining:</span>
                <span className="mono">{deck.length}</span>
                <span className="muted">Last card:</span>
                <span className="mono">{card ? formatCard(card) : "—"}</span>
              </div>

              <div className="modal-actions">
                <button className="small-btn" onClick={reshuffleNewGame}>
                  Reset / Reshuffle
                </button>
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-subtitle">Force Draw (Rank)</div>
              <div className="force-grid">
                {RANKS.map((r) => (
                  <button
                    key={r}
                    className="force-btn"
                    onClick={() => devForceDrawRank(r)}
                    disabled={phase !== "IDLE"}
                    title={phase !== "IDLE" ? "Finish current action first" : `Force draw ${r}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <div className="modal-subtitle">Deck List (tap to force-draw exact card)</div>
              <div className="deck-list">
                {deck.length === 0 ? (
                  <div className="muted">Deck is empty.</div>
                ) : (
                  deck.map((c) => {
                    const key = cardToKey(c);
                    return (
                      <button
                        key={key}
                        className="deck-chip"
                        onClick={() => devForceDrawCardKey(key)}
                        disabled={phase !== "IDLE"}
                        title="Force draw this exact card"
                      >
                        {key}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="modal-section">
              <div className="muted">
                Note: dev force-draw is blocked during action locks (pick mate/drink/loser, waterfall, etc.).
              </div>
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

function Panel({ title, items = [], flashSet = null }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>

      {[...Array(4)].map((_, i) => {
        const text = items[i] || "—";
        const flashing = flashSet ? flashSet.has(text) : false;

        return (
          <div key={i} className={`row ${flashing ? "FLASH" : ""}`} title={text}>
            <span className="row-text">{text}</span>
          </div>
        );
      })}
    </div>
  );
        }
