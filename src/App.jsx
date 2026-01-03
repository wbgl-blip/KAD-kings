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

// Waterfall
const WF_MIN = 5;
const WF_MAX = 20;
const WF_DEFAULT = 7;
const WF_END_DRINKS = 3;

/* =====================================================
   DECK
===================================================== */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardToString(c) {
  return `${c.rank}${c.suit}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  /**
   * PHASES:
   * IDLE
   * WATERFALL_READY
   * WATERFALL_RUNNING
   * PICK_DRINK
   * PICK_MATE
   * PICK_LOSER
   * MAKE_RULE
   * REACTION_ACTIVE
   * QM_PICK
   * RULE_BREAK_PICK
   */
  const [phase, setPhase] = useState("IDLE");

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [turnIndex, setTurnIndex] = useState(0);
  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  // Badges (transfer on redraw)
  const [heavenMaster, setHeavenMaster] = useState(null); // 7
  const [thumbMaster, setThumbMaster] = useState(null); // J
  const [questionMaster, setQuestionMaster] = useState(null); // Q

  // Rules (K)
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // For 9/10 label in status
  const [pendingLoserMode, setPendingLoserMode] = useState(null); // "RHYME" | "CATEGORIES" | null

  // Reaction (7/J)
  const [reaction, setReaction] = useState({
    type: null, // "THUMB" | "HEAVEN" | null
    owner: null,
    tapped: [],
  });

  // Flash UI
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Tap guard to prevent rapid multi-tap races
  const consumeTapRef = useRef(false);

  // Refs to avoid stale closures
  const playersRef = useRef(players);
  playersRef.current = players;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  // Waterfall settings + countdown (NO mates on waterfall)
  const [wfSeconds, setWfSeconds] = useState(WF_DEFAULT);
  const [wfRandom, setWfRandom] = useState(false);
  const [wfRemaining, setWfRemaining] = useState(0);
  const wfIntervalRef = useRef(null);

  // Dev tools (?dev=1)
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
     CLEANUP
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     HELPERS
  ===================================================== */

  function nextTurn() {
    setTurnIndex((i) => {
      const n = playersRef.current.length;
      return n ? (i + 1) % n : 0;
    });
  }

  function flashPlayers(names) {
    clearFlashTimer();
    setFlashNames(new Set(names));
    flashTimerRef.current = setTimeout(() => {
      setFlashNames(new Set());
      flashTimerRef.current = null;
    }, DRINK_FLASH_MS);
  }

  /**
   * Compute ALL impacted players for mate-propagated drink
   * (target + mates + mates-of-mates), no duplicates.
   */
  function computeMateClosure(startName) {
    const visited = new Set();
    if (!startName) return visited;

    const stack = [startName];
    while (stack.length) {
      const name = stack.pop();
      if (!name) continue;
      if (visited.has(name)) continue;
      visited.add(name);

      const p = playersRef.current.find((x) => x.name === name);
      const mates = p?.mates || [];
      for (const m of mates) {
        if (!visited.has(m)) stack.push(m);
      }
    }

    return visited;
  }

  function giveDrinkWithFlash(targetName) {
    const affected = computeMateClosure(targetName);
    if (affected.size === 0) return;

    setPlayers((prev) =>
      prev.map((p) =>
        affected.has(p.name) ? { ...p, beers: p.beers + 1 } : p
      )
    );

    flashPlayers(Array.from(affected));
  }

  function giveManyWithFlash(targetNames) {
    const union = new Set();
    for (const n of targetNames) {
      const closure = computeMateClosure(n);
      for (const x of closure) union.add(x);
    }
    if (union.size === 0) return;

    setPlayers((prev) =>
      prev.map((p) => (union.has(p.name) ? { ...p, beers: p.beers + 1 } : p))
    );

    flashPlayers(Array.from(union));
  }

  // Waterfall: NO mates; everyone +amount
  function addEveryoneNoMates(amount) {
    setPlayers((prev) => prev.map((p) => ({ ...p, beers: p.beers + amount })));
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

  function releaseConsumeSoon() {
    setTimeout(() => {
      consumeTapRef.current = false;
    }, 0);
  }

  /* =====================================================
     DRAW LOGIC
  ===================================================== */

  function applyDrawnCard(rank) {
    const drawer = playersRef.current[turnIndex]?.name;

    // A — Waterfall banner + timer (NO mates, end +3 each)
    if (rank === "A") {
      setPhase("WATERFALL_READY");
      return;
    }

    // 2 — pick drink
    if (rank === "2") {
      setPhase("PICK_DRINK");
      return;
    }

    // 3 — drawer drinks (+ mates)
    if (rank === "3") {
      if (drawer) giveDrinkWithFlash(drawer);
      nextTurn();
      return;
    }

    // 4/5/6 — group drinks (+ mates)
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

    // 7/J/Q — assign badges (transfer on re-draw)
    if (rank === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
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

    // 8 — pick mate (keep turn highlighted on drawer until they pick)
    if (rank === "8") {
      setPhase("PICK_MATE");
      return;
    }

    // 9/10 — tap loser (+ mates)
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

    // K — make rule (manual enforcement via Rule Break button)
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

    applyDrawnCard(next.rank);
  }

  /* =====================================================
     TILE SELECTABILITY / DISABLE
  ===================================================== */

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

  /* =====================================================
     PLAYER TAPS
  ===================================================== */

  function tapPlayer(name) {
    if (consumeTapRef.current) return;

    // PICK_DRINK
    if (phaseRef.current === "PICK_DRINK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      nextTurn();
      releaseConsumeSoon();
      return;
    }

    // PICK_MATE — ONE mate only; turn highlight stays on drawer until selection
    if (phaseRef.current === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      consumeTapRef.current = true;

      // lock first to avoid double selection
      setPhase("IDLE");

      let didAdd = false;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          didAdd = true;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      // Only advance if an actual new mate was added
      if (didAdd) nextTurn();

      releaseConsumeSoon();
      return;
    }

    // PICK_LOSER
    if (phaseRef.current === "PICK_LOSER") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPendingLoserMode(null);
      setPhase("IDLE");
      nextTurn();
      releaseConsumeSoon();
      return;
    }

    // RULE_BREAK_PICK (manual enforcement for K/custom rules)
    if (phaseRef.current === "RULE_BREAK_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      releaseConsumeSoon();
      return;
    }

    // QM_PICK (question answered)
    if (phaseRef.current === "QM_PICK") {
      consumeTapRef.current = true;
      giveDrinkWithFlash(name);
      setPhase("IDLE");
      releaseConsumeSoon();
      return;
    }

    // REACTION_ACTIVE (Thumb/Heaven) — last tapper drinks (+ mates)
    if (phaseRef.current === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;

      if (name === owner) return;
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligible = Math.max(0, playersRef.current.length - 1);
      if (nextTapped.length >= eligible) {
        giveDrinkWithFlash(name);
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");
      }
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
     WATERFALL
  ===================================================== */

  function resolvedWfSeconds() {
    const base = clamp(wfSeconds, WF_MIN, WF_MAX);
    if (!wfRandom) return base;
    return Math.floor(WF_MIN + Math.random() * (WF_MAX - WF_MIN + 1));
  }

  function startWaterfall() {
    if (phaseRef.current !== "WATERFALL_READY") return;

    const seconds = resolvedWfSeconds();
    setWfRemaining(seconds);
    setPhase("WATERFALL_RUNNING");

    stopWaterfallTimer();
    wfIntervalRef.current = setInterval(() => {
      setWfRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          stopWaterfallTimer();
          addEveryoneNoMates(WF_END_DRINKS); // NO mates
          setPhase("IDLE");
          nextTurn();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function cancelWaterfall() {
    if (
      phaseRef.current !== "WATERFALL_READY" &&
      phaseRef.current !== "WATERFALL_RUNNING"
    )
      return;
    stopWaterfallTimer();
    setWfRemaining(0);
    setPhase("IDLE");
    // do not advance turn on cancel
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
     STATUS COPY
  ===================================================== */

  function statusCopy() {
    if (!card) return "Tap the deck to start";

    if (phase === "WATERFALL_READY")
      return `Waterfall: set timer, then Start. End: everyone +${WF_END_DRINKS} (no mates).`;
    if (phase === "WATERFALL_RUNNING")
      return `Waterfall running: everyone drinks. End: everyone +${WF_END_DRINKS}.`;
    if (phase === "PICK_DRINK") return "Pick a player to drink (+ mates).";
    if (phase === "PICK_MATE") return "Pick ONE mate (drawer stays highlighted).";
    if (phase === "PICK_LOSER")
      return `${
        pendingLoserMode === "CATEGORIES" ? "Categories" : "Rhyme"
      }: tap the loser (+ mates).`;
    if (phase === "MAKE_RULE") return "Type the new rule and Save.";
    if (phase === "RULE_BREAK_PICK") return "Rule Break: tap offender (+ mates).";
    if (phase === "QM_PICK") return "Question: tap who answered (+ mates).";
    if (phase === "REACTION_ACTIVE") {
      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      const eligible = Math.max(0, playersRef.current.length - 1);
      return `${label}: last tap drinks (${reaction.tapped.length}/${eligible}).`;
    }

    return "Tap the deck to draw.";
  }

  /* =====================================================
     LISTS FOR PANELS
  ===================================================== */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => rules, [rules]);

  /* =====================================================
     DEV TOOLS
  ===================================================== */

  function reshuffleNewDeck() {
    if (phaseRef.current !== "IDLE") return;
    setDeck(buildDeck());
    setCard(null);
    setPendingLoserMode(null);
    setReaction({ type: null, owner: null, tapped: [] });
    setWfRemaining(0);
    stopWaterfallTimer();
  }

  function forceDrawRank(rank) {
    if (phaseRef.current !== "IDLE") return;

    const idx = deckRef.current.findIndex((c) => c.rank === rank);
    if (idx < 0) return;

    const picked = deckRef.current[idx];
    const rest = deckRef.current.filter((_, i) => i !== idx);

    setDeck(rest);
    setCard(picked);
    applyDrawnCard(rank);
  }

  /* =====================================================
     TURN HIGHLIGHT RULE
     - Always highlight turnIndex player, including during PICK_MATE
===================================================== */

  function isTurnHighlighted(playerName) {
    return playerName === playersRef.current[turnIndex]?.name;
  }

  /* =====================================================
     CARD FACE (CLEAN)
===================================================== */

  const drawLocked = phase !== "IDLE";
  const faceRank = card ? `${card.rank}${card.suit}` : "DECK";
  const faceLabel = card ? (CARD_LABEL[card.rank] || "Draw") : "Tap to Start";
  const faceSub = card ? `${deck.length} left` : `${deck.length} cards`;

  /* =====================================================
     RENDER
===================================================== */

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
              <div className="card-rank">{faceRank}</div>
              <div className="card-label">{faceLabel}</div>
              <div className="card-sub">{faceSub}</div>
            </div>
          </div>
        </div>

        <Panel title="📜 Rules" items={rulesLines} />
      </section>

      {/* Waterfall banner */}
      {(phase === "WATERFALL_READY" || phase === "WATERFALL_RUNNING") && (
        <div className={`banner waterfall ${phase === "WATERFALL_RUNNING" ? "running" : ""}`}>
          <div className="banner-top">
            <div className="banner-title">🌊 Waterfall</div>
            <button className="banner-x" onClick={cancelWaterfall} title="Close">
              ✕
            </button>
          </div>

          <div className="banner-body">
            {phase === "WATERFALL_READY" ? (
              <>
                <div className="wf-row">
                  <div className="wf-left">
                    <div className="wf-label">Timer</div>
                    <div className="wf-hint">
                      End: everyone +{WF_END_DRINKS} (no mates)
                    </div>
                  </div>

                  <div className="wf-right">
                    <div className="wf-seconds">
                      {wfRandom ? "Random" : `${clamp(wfSeconds, WF_MIN, WF_MAX)}s`}
                    </div>
                  </div>
                </div>

                <div className="wf-row wf-controls">
                  <input
                    className="wf-range"
                    type="range"
                    min={WF_MIN}
                    max={WF_MAX}
                    value={clamp(wfSeconds, WF_MIN, WF_MAX)}
                    onChange={(e) => setWfSeconds(parseInt(e.target.value, 10))}
                    disabled={wfRandom}
                    aria-label="Waterfall seconds"
                  />

                  <label className="wf-toggle" title="Random timer between 5 and 20 seconds">
                    <input
                      type="checkbox"
                      checked={wfRandom}
                      onChange={(e) => setWfRandom(e.target.checked)}
                    />
                    <span>Random (5–20s)</span>
                  </label>

                  <button className="wf-start" onClick={startWaterfall}>
                    Start
                  </button>
                </div>
              </>
            ) : (
              <div className="wf-running">
                <div className="wf-count">{wfRemaining}s</div>
                <div className="wf-sub">
                  Everyone drinks. End: +{WF_END_DRINKS} each.
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
