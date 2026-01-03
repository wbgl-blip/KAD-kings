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
  A: "Waterfall — drawer starts when ready",
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
  Q: "Question Master — QM tags who answered",
  K: "Make a rule",
};

const LOSER_REASON_TEXT = {
  HEAVEN: "Heaven",
  THUMB: "Thumb",
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
  RULEBREAK: "Rule Break",
};

const DRINK_FLASH_MS = 2000;

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });

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

  // IDLE | PICK_DRINK | PICK_MATE | PICK_LOSER | MAKE_RULE | WATERFALL_READY | REACTION_ACTIVE | QM_PICK | RULE_BREAK_PICK
  const [phase, setPhase] = useState("IDLE");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  // Power owners
  const [thumbMaster, setThumbMaster] = useState(null);
  const [heavenMaster, setHeavenMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  // Status + rules
  const [statusText, setStatusText] = useState("Tap the deck to draw");
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Loser context (9/10)
  const [loserReason, setLoserReason] = useState(null);

  // Waterfall context
  const [waterfall, setWaterfall] = useState({
    active: false,
    drawer: null,
  });

  // Reaction context
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [],
  });

  // Flash UI (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Avoid stale closures
  const playersRef = useRef(players);
  playersRef.current = players;

  // Prevent double-tap races (mates / picks)
  const actionLockRef = useRef(false);

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

  function nextTurn() {
    setTurnIndex((i) => {
      const n = playersRef.current.length;
      return n ? (i + 1) % n : 0;
    });
  }

  function setStatus(message) {
    setStatusText(message);
  }

  function setStatusWithTurn(message) {
    const name = playersRef.current[turnIndex]?.name;
    setStatusText(name ? `${message} — ${name}'s turn` : message);
  }

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

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + 1 } : p))
    );
  }

  // compute chain: player + mates (recursive) with cycle protection
  function computeDrinkChain(startName) {
    const visited = new Set();
    function walk(name) {
      if (!name) return;
      if (visited.has(name)) return;
      visited.add(name);
      const p = playersRef.current.find((x) => x.name === name);
      const mates = p?.mates || [];
      for (const m of mates) walk(m);
    }
    walk(startName);
    return Array.from(visited);
  }

  // apply +1 to chain; optionally flash all affected tiles (mates included)
  function giveDrinkChain(startName, { flash = true } = {}) {
    const chain = computeDrinkChain(startName);
    for (const n of chain) addDrink(n);
    if (flash && chain.length) flashPlayers(chain);
    return chain;
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

  function lockActionOnce(fn) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      fn();
    } finally {
      Promise.resolve().then(() => {
        actionLockRef.current = false;
      });
    }
  }

  /* =========================
     DRAW FLOW
  ========================= */

  function drawCard() {
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    if (deck.length === 0) {
      setStatus("Deck is empty — game over (all 52 cards drawn)");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    setStatus(RULE_TEXT[r]);

    // A — Waterfall banner start
    if (r === "A") {
      setWaterfall({ active: true, drawer: drawer || null });
      setPhase("WATERFALL_READY");
      setStatus("Waterfall ready — drawer starts when ready");
      return;
    }

    // 2 — pick someone
    if (r === "2") {
      setPhase("PICK_DRINK");
      setStatusWithTurn("Pick a player to drink (+1)");
      return;
    }

    // 3 — me
    if (r === "3") {
      if (drawer) giveDrinkChain(drawer, { flash: true });
      nextTurn();
      setStatus("Tap the deck to draw");
      return;
    }

    // 4 — women
    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) {
        const all = new Set();
        for (const n of women) computeDrinkChain(n).forEach((x) => all.add(x));
        for (const n of all) addDrink(n);
        flashPlayers(Array.from(all));
      }
      nextTurn();
      setStatus("Tap the deck to draw");
      return;
    }

    // 5 — guys
    if (r === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) {
        const all = new Set();
        for (const n of men) computeDrinkChain(n).forEach((x) => all.add(x));
        for (const n of all) addDrink(n);
        flashPlayers(Array.from(all));
      }
      nextTurn();
      setStatus("Tap the deck to draw");
      return;
    }

    // 6 — everyone
    if (r === "6") {
      const allPlayers = playersRef.current.map((p) => p.name);
      const all = new Set();
      for (const n of allPlayers) computeDrinkChain(n).forEach((x) => all.add(x));
      for (const n of all) addDrink(n);
      flashPlayers(Array.from(all));
      nextTurn();
      setStatus("Tap the deck to draw");
      return;
    }

    // 7 — heaven owner
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      setStatus(`Heaven set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // 8 — pick mate (single pick)
    if (r === "8") {
      setPhase("PICK_MATE");
      setStatusWithTurn("Pick a mate (tap a player)");
      return;
    }

    // 9 — rhyme loser
    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Rhyme — tap the loser (player) to give +1");
      return;
    }

    // 10 — categories loser
    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Categories — tap the loser (player) to give +1");
      return;
    }

    // J — thumb owner
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      setStatus(`Thumbmaster set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // Q — question master owner
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      setStatus(`Question Master set: ${drawer || "—"} (use Question button)`);
      return;
    }

    // K — make a rule
    if (r === "K") {
      setPhase("MAKE_RULE");
      setStatusWithTurn("Make a rule — type it in and save");
      return;
    }

    nextTurn();
    setStatus("Tap the deck to draw");
  }

  /* =========================
     WATERFALL
  ========================= */

  function startWaterfallNow() {
    if (phase !== "WATERFALL_READY") return;

    lockActionOnce(() => {
      const drawer = waterfall.drawer || playersRef.current[turnIndex]?.name;

      // FIX: drawer should NOT flash red for starting waterfall
      if (drawer) giveDrinkChain(drawer, { flash: false });

      setWaterfall({ active: false, drawer: null });
      setPhase("IDLE");
      nextTurn();
      setStatus("Waterfall started — drawer drank first. Tap the deck to draw");
    });
  }

  /* =========================
     PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    lockActionOnce(() => {
      const drawer = playersRef.current[turnIndex]?.name;

      if (phase === "PICK_DRINK") {
        giveDrinkChain(name, { flash: true }); // mates flash too
        setPhase("IDLE");
        nextTurn();
        setStatus(`Picked ${name} to drink (+1). Tap the deck to draw`);
        return;
      }

      if (phase === "PICK_MATE") {
        if (!drawer) return;

        if (name === drawer) {
          setStatusWithTurn("You can’t pick yourself — tap someone else");
          return;
        }

        let didAdd = false;

        setPlayers((prev) =>
          prev.map((p) => {
            if (p.name !== drawer) return p;
            if (p.mates.includes(name)) return p;
            didAdd = true;
            return { ...p, mates: [...p.mates, name] };
          })
        );

        if (!didAdd) {
          setStatusWithTurn("That mate is already selected — pick someone else");
          return;
        }

        setPhase("IDLE");
        nextTurn();
        setStatus(`${drawer} picked ${name} as a mate. Tap the deck to draw`);
        return;
      }

      if (phase === "PICK_LOSER") {
        const label = LOSER_REASON_TEXT[loserReason] || "Loser";
        giveDrinkChain(name, { flash: true }); // mates flash too
        setLoserReason(null);
        setPhase("IDLE");
        nextTurn();
        setStatus(`${label} — ${name} drinks (+1). Tap the deck to draw`);
        return;
      }

      if (phase === "RULE_BREAK_PICK") {
        giveDrinkChain(name, { flash: true }); // mates flash too
        setPhase("IDLE");
        nextTurn();
        setStatus(`${LOSER_REASON_TEXT.RULEBREAK} — ${name} drinks (+1). Tap the deck to draw`);
        return;
      }

      if (phase === "REACTION_ACTIVE") {
        const owner = reaction.owner;
        if (!owner) return;
        if (name === owner) return;
        if (reaction.tapped.includes(name)) return;

        const nextTapped = [...reaction.tapped, name];
        const eligibleCount = playersRef.current.length - 1;

        setReaction((r) => ({ ...r, tapped: nextTapped }));

        if (nextTapped.length >= eligibleCount) {
          const loser = nextTapped[nextTapped.length - 1];
          const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";

          giveDrinkChain(loser, { flash: true }); // mates flash too

          setReaction({ type: null, owner: null, tapped: [] });
          setPhase("IDLE");
          setStatus(`${label} — ${loser} was last and drinks (+1). Tap the deck to draw`);
          return;
        }

        const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
        setStatus(`${label} active — players tap (${nextTapped.length}/${eligibleCount})`);
        return;
      }

      if (phase === "QM_PICK") {
        giveDrinkChain(name, { flash: true }); // mates flash too
        setPhase("IDLE");
        nextTurn();
        setStatus(`${name} answered (+1). Tap the deck to draw`);
        return;
      }
    });
  }

  /* =========================
     ACTION BUTTONS (4)
  ========================= */

  function startReaction(type) {
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    const owner = type === "THUMB" ? thumbMaster : heavenMaster;

    if (!owner) {
      setStatus(type === "THUMB" ? "No Thumbmaster yet (draw J first)" : "No Heaven owner yet (draw 7 first)");
      return;
    }

    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION_ACTIVE");

    const label = type === "THUMB" ? "Thumb" : "Heaven";
    setStatus(`${label} active — everyone (except ${owner}) tap your tile`);
  }

  function onThumb() {
    startReaction("THUMB");
  }

  function onHeaven() {
    startReaction("HEAVEN");
  }

  // Rule enforcement for K rules (and any rule) via Rule Break
  function onRuleBreak() {
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }
    setPhase("RULE_BREAK_PICK");
    setStatus("Rule Break — tap who broke a rule (+1)");
  }

  function onQuestionAnswered() {
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }
    if (!questionMaster) {
      setStatus("No Question Master yet (draw Q first)");
      return;
    }
    setPhase("QM_PICK");
    setStatus(`Question answered — QM (${questionMaster}) tap who answered (+1)`);
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
    setStatus("Rule saved. Use Rule Break to enforce (+1). Tap the deck to draw");
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
     SELECTABILITY
  ========================= */

  function isTileSelectable(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    if (phase === "PICK_DRINK") return true;

    if (phase === "PICK_MATE") {
      if (!drawer) return false;
      return name !== drawer;
    }

    if (phase === "PICK_LOSER") return true;
    if (phase === "RULE_BREAK_PICK") return true;
    if (phase === "QM_PICK") return true;

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
     RENDER
  ========================= */

  const drawLocked = phase !== "IDLE";
  const showWaterfallBanner = phase === "WATERFALL_READY" && waterfall.active;

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

      {showWaterfallBanner && (
        <div className="waterfall-banner" role="region" aria-label="Waterfall banner">
          <div className="waterfall-text">
            <strong>Waterfall ready</strong>
            <span>{`Drawer: ${waterfall.drawer || currentPlayer?.name || "—"}`}</span>
          </div>
          <button className="waterfall-start" onClick={startWaterfallNow}>
            Start Waterfall
          </button>
        </div>
      )}

      <section className="actions-4">
        <button className="btn thumb" onClick={onThumb} disabled={phase !== "IDLE"}>
          👍 Thumb
        </button>

        <button className="btn heaven" onClick={onHeaven} disabled={phase !== "IDLE"}>
          ☁ Heaven
        </button>

        <button className="btn rulebreak" onClick={onRuleBreak} disabled={phase !== "IDLE"}>
          🚫 Rule Break
        </button>

        <button className="btn qm" onClick={onQuestionAnswered} disabled={phase !== "IDLE"}>
          ❓ Question
        </button>
      </section>

      <section className="status-bar">
        <div className="status-main">{statusText}</div>

        <div className="status-meta">
          <span className="meta-pill">{`7: ${heavenMaster || "—"}`}</span>
          <span className="meta-pill">{`J: ${thumbMaster || "—"}`}</span>
          <span className="meta-pill">{`Q: ${questionMaster || "—"}`}</span>
        </div>
      </section>

      <section className="players">
        {players.map((p) => {
          const selectable = isActionPhase ? isTileSelectable(p.name) : false;
          const disabled = isTileDisabled(p.name);
          const flashing = flashNames.has(p.name);

          // TURN highlight only when NOT in action phase
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
              title={selectable ? "Tap" : isActionPhase ? "Not selectable right now" : "Player"}
            >
              <div className="video-slot" />
              <div className="player-footer">
                <span className="player-name">{p.name}</span>
                <span className="player-beers">🍺 {p.beers}</span>
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
          />
          <button onClick={submitRule}>Save Rule</button>
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
