// src/App.jsx
import { useMemo, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "Everyone drinks",
  5: "Guys",
  6: "Everyone drinks",
  7: "Heaven",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a Rule",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/* =========================
   DECK HELPERS
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach((r) => SUITS.forEach((s) => deck.push(`${r}${s}`)));

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const rankOf = (card) => card.replace(/[^A-Z0-9]/g, "");

/* =========================
   APP
========================= */

export default function App() {
  /* ---------- CORE STATE ---------- */
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  /* ---------- DRINK COUNTS ---------- */
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  /* ---------- MATES ---------- */
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, []]))
  );

  /* ---------- PHASE CONTROL ---------- */
  /**
   * IDLE
   * SELECT_MATE (8)
   * SELECT_DRINK (2)
   * WATERFALL_READY (A waiting for start + ready-ups)
   * WATERFALL_ACTIVE (A running)
   * RACE_THUMB (J race running)
   * RACE_HEAVEN (7 race running)
   */
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  /* ---------- VISUAL EFFECTS ---------- */
  const [drinkFlash, setDrinkFlash] = useState([]);

  /* ---------- SPECIAL HOLDERS ---------- */
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  /* ---------- RACE STATE ---------- */
  // When a race is running:
  // - raceType: "THUMB" | "HEAVEN"
  // - holder: who currently holds the power (starts the race)
  // - reacted: Set of players who tapped during the race (excluding holder)
  const [race, setRace] = useState({
    type: null, // null | "THUMB" | "HEAVEN"
    holder: null,
    reacted: new Set(),
  });

  /* ---------- WATERFALL STATE ---------- */
  // Ready ups: everyone taps once (owner taps "START" after all ready)
  const [waterfallReady, setWaterfallReady] = useState(new Set()); // players who are ready
  // Current drinker index while active
  const [waterfallIndex, setWaterfallIndex] = useState(null);
  // Who has completed their drink (used to visually confirm progression if desired)
  const [waterfallDone, setWaterfallDone] = useState(new Set());

  /* ---------- DERIVED ---------- */
  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINK LOGIC
  ========================= */

  // NOTE: per your request, red flash duration is now 2.5s (was 5s)
  const DRINK_FLASH_MS = 2500;

  function drink(name) {
    setBeers((b) => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash((f) => [...new Set([...f, name])]);

    setTimeout(() => {
      setDrinkFlash((f) => f.filter((n) => n !== name));
    }, DRINK_FLASH_MS);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);

    drink(name);
    (mates[name] || []).forEach((m) => propagateDrink(m, visited));
  }

  /* =========================
     WATERFALL HELPERS
  ========================= */

  function resetWaterfall() {
    setWaterfallReady(new Set());
    setWaterfallIndex(null);
    setWaterfallDone(new Set());
  }

  function startWaterfall() {
    // only owner can start, only from READY phase
    if (phase.type !== "WATERFALL_READY") return;
    const ownerIdx = PLAYERS.indexOf(phase.owner);
    if (ownerIdx < 0) return;

    setWaterfallIndex(ownerIdx);
    setWaterfallDone(new Set());
    setPhase({ type: "WATERFALL_ACTIVE", owner: phase.owner });
  }

  function endWaterfall() {
    // only owner can end, only from ACTIVE phase
    if (phase.type !== "WATERFALL_ACTIVE") return;
    setPhase({ type: "IDLE", owner: null });
    resetWaterfall();
    // advance turn AFTER waterfall completes (owner keeps the turn during WF)
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  function currentWaterfallDrinker() {
    if (phase.type !== "WATERFALL_ACTIVE") return null;
    if (waterfallIndex == null) return null;
    return PLAYERS[waterfallIndex];
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    if (phase.type !== "IDLE") return;
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    // defaults: remain IDLE, advance turn
    // exceptions below override that
    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "A") {
      // Waterfall: owner keeps the turn until it ends
      resetWaterfall();
      setPhase({ type: "WATERFALL_READY", owner: drawer });
      // DO NOT advance turn here
      return;
    }

    if (r === "J") {
      // Holder gains the power; NOT auto-racing
      setThumbHolder(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "7") {
      // Holder gains the power; NOT auto-racing
      setHeavenHolder(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    // other cards: just advance
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  /* =========================
     RACE CONTROL (J / 7)
  ========================= */

  function canStartThumbRace() {
    return (
      phase.type === "IDLE" &&
      race.type == null &&
      thumbHolder &&
      // allow starting even if current card isn't J; power persists
      true
    );
  }

  function canStartHeavenRace() {
    return (
      phase.type === "IDLE" &&
      race.type == null &&
      heavenHolder &&
      true
    );
  }

  function startThumbRace() {
    if (!canStartThumbRace()) return;
    setRace({ type: "THUMB", holder: thumbHolder, reacted: new Set() });
    setPhase({ type: "RACE_THUMB", owner: thumbHolder });
  }

  function startHeavenRace() {
    if (!canStartHeavenRace()) return;
    setRace({ type: "HEAVEN", holder: heavenHolder, reacted: new Set() });
    setPhase({ type: "RACE_HEAVEN", owner: heavenHolder });
  }

  function resetRace() {
    setRace({ type: null, holder: null, reacted: new Set() });
    setPhase({ type: "IDLE", owner: null });
  }

  function handleRaceTap(name) {
    // holder never reacts
    if (name === race.holder) return;

    // ignore repeat taps
    if (race.reacted.has(name)) return;

    const next = new Set(race.reacted);
    next.add(name);

    // AUTO-LOSE RULE:
    // If there is one person that hasn't tapped, auto lose (that last person).
    // That means: once reacted size reaches PLAYERS.length - 2,
    // exactly one non-holder remains unreacted -> they lose immediately.
    if (next.size === PLAYERS.length - 2) {
      const loser = PLAYERS.find(
        (p) => p !== race.holder && !next.has(p)
      );

      if (loser) {
        propagateDrink(loser);

        // keep power with holder until transferred by a new J/7 draw
        // (no transfer on race end)
      }

      resetRace();
      return;
    }

    setRace((r) => ({ ...r, reacted: next }));
  }

  /* =========================
     TAP PLAYER
  ========================= */

  function tapPlayer(name) {
    // HARD LOCK: during waterfall/races, only their handlers run
    if (phase.type === "RACE_THUMB" || phase.type === "RACE_HEAVEN") {
      handleRaceTap(name);
      return;
    }

    /* ---- WATERFALL READY (A) ---- */
    if (phase.type === "WATERFALL_READY") {
      // everyone can ready-up by tapping themselves
      // (or tapping their tile; we accept either way)
      setWaterfallReady((prev) => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });

      // owner tap is not "start"; start is via button (or owner double tap)
      // we keep this simple: owner uses the START button below when all ready
      return;
    }

    /* ---- WATERFALL ACTIVE (A) ---- */
    if (phase.type === "WATERFALL_ACTIVE") {
      const drinker = currentWaterfallDrinker();
      if (!drinker) return;

      // only current drinker can advance the chain
      if (name !== drinker) return;

      // record completion + drink
      setWaterfallDone((prev) => {
        const next = new Set(prev);
        next.add(name);
        return next;
      });

      // OPTIONAL: we do NOT add beers automatically for waterfall.
      // Your system has been "tap to add drinks" controlled by players.
      // If you DO want each waterfall step to add a drink, uncomment:
      // propagateDrink(name);

      // advance to next player
      setWaterfallIndex((idx) => {
        if (idx == null) return idx;
        return (idx + 1) % PLAYERS.length;
      });

      return;
    }

    /* ---- PICK A MATE (8) ---- */
    if (phase.type === "SELECT_MATE") {
      // only owner should be able to choose the mate target
      if (name === phase.owner) return;

      setMates((m) => ({
        ...m,
        [phase.owner]: [...new Set([...(m[phase.owner] || []), name])],
      }));

      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- PICK SOMEONE (2) ---- */
    if (phase.type === "SELECT_DRINK") {
      // owner picks target (can be self too)
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- NORMAL DRINK TAP ---- */
    propagateDrink(name);
  }

  /* =========================
     INFO / MATES
  ========================= */

  const matePills = useMemo(() => {
    const out = [];
    Object.entries(mates).forEach(([a, list]) => {
      (list || []).forEach((b) => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  /* =========================
     STATUS TEXT
  ========================= */

  const statusText = useMemo(() => {
    if (phase.type === "SELECT_MATE") return `${phase.owner} — pick a mate`;
    if (phase.type === "SELECT_DRINK") return `${phase.owner} — pick who drinks`;
    if (phase.type === "WATERFALL_READY") {
      const readyCount = waterfallReady.size;
      const allReady = readyCount === PLAYERS.length;
      return allReady
        ? `${phase.owner} — everyone ready. Tap START.`
        : `${phase.owner} — ready up (${readyCount}/${PLAYERS.length})`;
    }
    if (phase.type === "WATERFALL_ACTIVE") {
      const drinker = currentWaterfallDrinker();
      return drinker
        ? `Waterfall: ${drinker} is drinking (owner: ${phase.owner})`
        : `Waterfall running (owner: ${phase.owner})`;
    }
    if (phase.type === "RACE_THUMB") return `THUMB race started by ${race.holder}`;
    if (phase.type === "RACE_HEAVEN") return `HEAVEN race started by ${race.holder}`;
    return "Tap players to add drinks (+ mates)";
  }, [phase.type, phase.owner, waterfallReady, race.holder, race.type, waterfallIndex]);

  /* =========================
     RENDER
  ========================= */

  const drawLocked =
    phase.type !== "IDLE"; // draw locked whenever not idle (including waterfall + races)

  const allReady = waterfallReady.size === PLAYERS.length;

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">{statusText}</div>

      {/* CARD */}
      <div className={`card ${drawLocked ? "locked" : ""}`} onClick={drawCard}>
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[currentRank] || ""}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>
{/* CARD ACTIONS */}
<div className="card-actions">

  {phase.type === "WATERFALL_READY" && (
    <div className="action-pill primary" onClick={startWaterfall}>
      Start WATERFALL (owner: {phase.owner})
    </div>
  )}

  {canStartThumbRace() && (
    <div className="action-pill thumb" onClick={startThumbRace}>
      Start THUMB race (holder: {thumbHolder})
    </div>
  )}

  {canStartHeavenRace() && (
    <div className="action-pill heaven" onClick={startHeavenRace}>
      Start HEAVEN race (holder: {heavenHolder})
    </div>
  )}
   
</div>
      {/* INFO PILLS (always) */}
      <div className="info">
        <span className="pill">
          👍 Thumb: {thumbHolder || "—"}
        </span>
        <span className="pill">
          ☁️ Heaven: {heavenHolder || "—"}
        </span>

        {matePills.length === 0 ? (
          <span className="pill muted">🤝 No mates yet</span>
        ) : (
          matePills.map((m, i) => (
            <span key={i} className="pill mate">
              {m}
            </span>
          ))
        )}
      </div>

      {/* ACTION BUTTONS (kept, not removing features) */}
      <div className="actions">
        {/* Waterfall controls */}
        {phase.type === "WATERFALL_READY" && (
          <button
            className="action"
            onClick={() => {
              if (!allReady) return;
              startWaterfall();
            }}
            disabled={!allReady}
            title={allReady ? "Start Waterfall" : "Everyone must ready up first"}
          >
            Start WATERFALL (owner: {phase.owner})
          </button>
        )}

        {phase.type === "WATERFALL_ACTIVE" && (
          <button
            className="action danger"
            onClick={() => {
              // only owner ends waterfall
              endWaterfall();
            }}
            title="End Waterfall (owner only by design)"
          >
            End WATERFALL (owner: {phase.owner})
          </button>
        )}

        {/* Race controls */}
        {canStartThumbRace() && (
          <button className="action" onClick={startThumbRace}>
            Start THUMB race (holder: {thumbHolder})
          </button>
        )}

        {canStartHeavenRace() && (
          <button className="action" onClick={startHeavenRace}>
            Start HEAVEN race (holder: {heavenHolder})
          </button>
        )}
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map((p) => {
          const isTurn = p === currentPlayer;
          const isOwner = p === phase.owner;

          const isSelectingOwner =
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK") &&
            p === phase.owner;

          const isWaterfallReady = phase.type === "WATERFALL_READY" && waterfallReady.has(p);
          const isWaterfallStarter = phase.type === "WATERFALL_READY" && p === phase.owner;

          const wfDrinker = currentWaterfallDrinker();
          const isWaterfallDrinker = phase.type === "WATERFALL_ACTIVE" && p === wfDrinker;

          const isRacing =
            phase.type === "RACE_THUMB" || phase.type === "RACE_HEAVEN";
          const hasReacted =
            isRacing && p !== race.holder && race.reacted.has(p);

          return (
            <div
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${isSelectingOwner ? "active" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${isWaterfallReady ? "ready" : ""}
                ${isWaterfallStarter ? "waterfall-start" : ""}
                ${isWaterfallDrinker ? "waterfall-active" : ""}
                ${isRacing ? "racing" : ""}
                ${hasReacted ? "reacted" : ""}
              `}
              onClick={() => tapPlayer(p)}
            >
              <div className="badges">
                {p === thumbHolder && (
                  <span className="badge thumb">THUMB</span>
                )}
                {p === heavenHolder && (
                  <span className="badge heaven">HEAVEN</span>
                )}
              </div>

              <div className="name">{p}</div>
              <div className="beer">🍺 {beers[p]}</div>

              {/* Keep extra clarity without removing features */}
              {phase.type === "WATERFALL_READY" && (
                <div className="mini">
                  {isWaterfallReady ? "READY" : "tap to READY"}
                </div>
              )}

              {phase.type === "WATERFALL_ACTIVE" && (
                <div className="mini">
                  {isWaterfallDrinker ? "DRINKING" : ""}
                </div>
              )}

              {isRacing && (
                <div className="mini">
                  {p === race.holder ? "HOLDER" : hasReacted ? "OK" : "TAP!"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
