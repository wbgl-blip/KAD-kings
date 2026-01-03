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
  A: "Waterfall — wait for ready, drawer drinks first",
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
  Q: "Question Master — QM taps who answered (+1)",
  K: "Make a rule",
};

const LOSER_REASON_TEXT = {
  HEAVEN: "Heaven",
  THUMB: "Thumb",
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
  RULE: "Rule Break",
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
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  // WAITING | IDLE | PICK_DRINK | PICK_MATE | PICK_LOSER | MAKE_RULE | WATERFALL_READY | REACTION_ACTIVE | QM_PICK | RULE_PICK
  const [phase, setPhase] = useState("WAITING");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // hook for later
      mates: [],
    }))
  );

  // Power owners
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Status + rules
  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");
  const [rules, setRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  // Loser reason context (9/10 + rule break, etc.)
  const [loserReason, setLoserReason] = useState(null);

  // Reaction state for 7/J power usage
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [], // ordered list of player names who responded
  });

  // Flash UI (tile-only)
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Avoid stale closures in propagation + turn logic
  const playersRef = useRef(players);
  playersRef.current = players;

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
      "RULE_PICK",
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

  function setStatusWithTurn(message, overrideTurnName = null) {
    const name = overrideTurnName || playersRef.current[turnIndex]?.name;
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

  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  function safeStartGameIfWaiting() {
    if (phase !== "WAITING") return false;
    setPhase("IDLE");
    setStatusWithTurn("Tap the deck to draw");
    return true;
  }

  /* =========================
     DRINK CHAIN (FIX #1)
     - When someone drinks, all mates chained should:
       - get +1
       - flash (tile only)
========================= */

  function collectDrinkChain(startName) {
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

  function applyDrinkChain(names) {
    if (!names || names.length === 0) return;
    const nameSet = new Set(names);
    setPlayers((prev) =>
      prev.map((p) => (nameSet.has(p.name) ? { ...p, beers: p.beers + 1 } : p))
    );
  }

  function drinkWithMatesAndFlash(startName) {
    const chain = collectDrinkChain(startName);
    if (chain.length === 0) return;
    flashPlayers(chain);
    applyDrinkChain(chain);
  }

  function drinkWithMatesNoFlash(startName) {
    const chain = collectDrinkChain(startName);
    if (chain.length === 0) return;
    applyDrinkChain(chain);
  }

  /* =========================
     GAME FLOW — DRAW
  ========================= */

  function drawCard() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }

    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    if (deck.length === 0) {
      setStatusText("Deck is empty — game over (all 52 cards drawn)");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    setStatusWithTurn(RULE_TEXT[r]);

    // A — Waterfall requires Ready (FIX #3: drawer drinks with NO flash)
    if (r === "A") {
      setPhase("WATERFALL_READY");
      setStatusWithTurn("Waterfall — tap Ready when everyone is ready (drawer drinks first)");
      return;
    }

    // 2 — Pick someone to drink
    if (r === "2") {
      setPhase("PICK_DRINK");
      setStatusWithTurn("Pick a player to drink (+1)");
      return;
    }

    // 3 — Me (drawer drinks)
    if (r === "3") {
      if (drawer) {
        drinkWithMatesAndFlash(drawer);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 4 — Women drink
    if (r === "4") {
      const women = playersRef.current
        .filter((p) => p.gender === "F")
        .map((p) => p.name);

      if (women.length) {
        // union all chains so everyone involved flashes once
        const all = new Set();
        for (const w of women) collectDrinkChain(w).forEach((n) => all.add(n));
        const list = Array.from(all);
        flashPlayers(list);
        applyDrinkChain(list);
      }

      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 5 — Guys drink
    if (r === "5") {
      const men = playersRef.current
        .filter((p) => p.gender === "M")
        .map((p) => p.name);

      if (men.length) {
        const all = new Set();
        for (const m of men) collectDrinkChain(m).forEach((n) => all.add(n));
        const list = Array.from(all);
        flashPlayers(list);
        applyDrinkChain(list);
      }

      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 6 — Everyone drinks
    if (r === "6") {
      const allPlayers = playersRef.current.map((p) => p.name);
      if (allPlayers.length) {
        const all = new Set();
        for (const a of allPlayers) collectDrinkChain(a).forEach((n) => all.add(n));
        const list = Array.from(all);
        flashPlayers(list);
        applyDrinkChain(list);
      }

      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 7 — Heaven power (set owner)
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Heaven set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // 8 — Pick a mate
    if (r === "8") {
      setPhase("PICK_MATE");
      setStatusWithTurn("Pick a mate (tap a player)");
      return;
    }

    // 9 — Rhyme loser (enforcer taps loser)
    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Rhyme — tap the loser (player) to give +1");
      return;
    }

    // 10 — Categories loser (enforcer taps loser)
    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Categories — tap the loser (player) to give +1");
      return;
    }

    // J — Thumb power (set owner)
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Thumbmaster set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // Q — Question master (set owner)
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Question Master set: ${drawer || "—"} (QM taps who answered)`);
      return;
    }

    // K — Make a rule
    if (r === "K") {
      setPhase("MAKE_RULE");
      setStatusWithTurn("Make a rule — type it in and save");
      return;
    }

    // fallback
    nextTurn();
    setStatusWithTurn("Tap the deck to draw");
  }

  /* =========================
     INTERACTIONS — PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    const drawer = playersRef.current[turnIndex]?.name;

    // 2 — Pick drink
    if (phase === "PICK_DRINK") {
      drinkWithMatesAndFlash(name);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`Picked ${name} to drink (+1). Tap the deck to draw`);
      return;
    }

    // 8 — Pick mate (cannot self; prevent duplicates)
    if (phase === "PICK_MATE") {
      if (!drawer) return;

      if (name === drawer) {
        setStatusWithTurn("You can’t pick yourself — tap someone else");
        return;
      }

      // Ensure one mate per 8 (your request: stop accidental double picks)
      // We lock immediately after a successful selection.
      const drawerPlayer = playersRef.current.find((p) => p.name === drawer);
      const alreadyHasMate = (drawerPlayer?.mates || []).length > 0;

      if (alreadyHasMate) {
        setStatusWithTurn("Mate already chosen — tap the deck to draw");
        setPhase("IDLE");
        nextTurn();
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
      setStatusWithTurn(`${drawer} picked ${name} as a mate. Tap the deck to draw`);
      return;
    }

    // 9/10 — Enforcer taps loser
    if (phase === "PICK_LOSER") {
      drinkWithMatesAndFlash(name);
      const label = LOSER_REASON_TEXT[loserReason] || "Loser";
      setLoserReason(null);
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${label} — ${name} drinks (+1). Tap the deck to draw`);
      return;
    }

    // Reaction (7/J power) — players tap their tile; owner excluded; last tap drinks
    if (phase === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;

      // Owner cannot participate and cannot lose
      if (name === owner) return;

      // Prevent duplicates
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      const eligibleCount = playersRef.current.length - 1;

      // When everyone except owner has tapped, last tapper loses
      if (nextTapped.length >= eligibleCount) {
        const loser = nextTapped[nextTapped.length - 1];

        drinkWithMatesAndFlash(loser);

        const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";

        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");

        // Does not change turn order
        setStatusWithTurn(`${label} — ${loser} was last and drinks (+1). Tap the deck to draw`);
        return;
      }

      const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
      setStatusWithTurn(`${label} active — players tap their tile (${nextTapped.length}/${eligibleCount})`);
      return;
    }

    // QM_PICK — QM taps who answered
    if (phase === "QM_PICK") {
      drinkWithMatesAndFlash(name);
      setPhase("IDLE");
      setStatusWithTurn(`${name} answered (+1). Tap the deck to draw`);
      return;
    }

    // RULE_PICK (FIX #2: rule enforcement is manual)
    if (phase === "RULE_PICK") {
      drinkWithMatesAndFlash(name);
      setPhase("IDLE");
      setLoserReason(null);
      setStatusWithTurn(`Rule break — ${name} drinks (+1). Tap the deck to draw`);
      return;
    }

    // Otherwise: do nothing
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function onReadyAction() {
    if (safeStartGameIfWaiting()) return;

    if (phase === "WATERFALL_READY") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (drawer) {
        // FIX #3: drawer drinks first, NO flash
        drinkWithMatesNoFlash(drawer);
      }
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Waterfall started — drawer drank first. Tap the deck to draw");
      return;
    }

    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    setStatusWithTurn("Tap the deck to draw");
  }

  function startReaction(type) {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }

    // Lock pattern: cannot start reaction during other action phases
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    const owner = type === "THUMB" ? thumbMaster : heavenMaster;

    if (!owner) {
      setStatusWithTurn(
        type === "THUMB" ? "No Thumbmaster yet (draw J first)" : "No Heaven owner yet (draw 7 first)"
      );
      return;
    }

    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION_ACTIVE");

    const label = type === "THUMB" ? "Thumb" : "Heaven";
    setStatusWithTurn(`${label} active — players tap their tile (owner: ${owner})`);
  }

  function onThumb() {
    startReaction("THUMB");
  }

  function onHeaven() {
    startReaction("HEAVEN");
  }

  function onQM() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }
    if (!questionMaster) {
      setStatusWithTurn("No Question Master yet (draw Q first)");
      return;
    }
    setPhase("QM_PICK");
    setStatusWithTurn(`QM active (${questionMaster}) — tap the player who answered (+1)`);
  }

  // FIX #2: Manual enforcement for K-rules (and any house rule)
  function onRuleBreak() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }
    setLoserReason("RULE");
    setPhase("RULE_PICK");
    setStatusWithTurn("Rule break — tap the offender (+1)");
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
    setStatusWithTurn("Rule saved. Tap the deck to draw");
  }

  /* =========================
     LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => {
    return rules;
  }, [rules]);

  /* =========================
     SELECTABILITY (UI LOCKING)
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

    if (phase === "RULE_PICK") return true;

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

  const drawLocked = phase !== "IDLE" && phase !== "WAITING";

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
            title={
              phase === "IDLE"
                ? "Tap to draw"
                : phase === "WAITING"
                ? "Press Ready to start"
                : "Finish current action"
            }
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

      <section className="actions">
        <button className="btn thumb" onClick={onThumb} disabled={phase === "WAITING"}>
          👍 Thumb
        </button>

        <button className="btn ready" onClick={onReadyAction}>
          Ready
        </button>

        <button className="btn heaven" onClick={onHeaven} disabled={phase === "WAITING"}>
          ☁ Heaven
        </button>
      </section>

      <section className="status-bar">
        <div className="status-main">{statusText}</div>

        <div className="status-meta">
          <span className="meta-pill">{`Turn: ${currentPlayer?.name || "—"}`}</span>
          <span className="meta-pill">{`7: ${heavenMaster || "—"}`}</span>
          <span className="meta-pill">{`J: ${thumbMaster || "—"}`}</span>
          <span className="meta-pill">{`Q: ${questionMaster || "—"}`}</span>

          <button className="meta-btn" onClick={onQM} disabled={phase === "WAITING"}>
            QM Tap
          </button>

          <button className="meta-btn" onClick={onRuleBreak} disabled={phase === "WAITING"}>
            Rule Break
          </button>
        </div>
      </section>

      <section className="players">
        {players.map((p) => {
          const selectable = isActionPhase ? isTileSelectable(p.name) : false;
          const disabled = isTileDisabled(p.name);
          const flashing = flashNames.has(p.name);

          // TURN highlight only when NOT in action phase.
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
