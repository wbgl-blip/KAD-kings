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
   * WATERFALL_READY (A waiting for everyone to ready)
   * WATERFALL_ACTIVE (A running; drawer ends it)
   * THUMB_RACE (J triggered by holder)
   * HEAVEN_RACE (7 triggered by holder)
   */
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  /* ---------- VISUAL EFFECTS ---------- */
  const [drinkFlash, setDrinkFlash] = useState([]);
  const [drawerFlash, setDrawerFlash] = useState([]); // highlight who drew briefly

  /* ---------- SPECIAL HOLDERS ---------- */
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  /* ---------- WATERFALL ---------- */
  // ready set for the current waterfall (drawer-controlled)
  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallStarter, setWaterfallStarter] = useState(null); // drawer who starts once all ready

  /* ---------- REACTION RACES (J/7) ---------- */
  // For the current race: players who have tapped
  const [raceReacted, setRaceReacted] = useState(new Set());
  const [raceLoser, setRaceLoser] = useState(null); // last to react (or auto-loser)
  const [raceTimerId, setRaceTimerId] = useState(null);

  /* ---------- DERIVED ---------- */
  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  // During waterfall, we keep the header and turn highlighting on the waterfall owner.
  const effectiveTurnPlayer =
    phase.type === "WATERFALL_READY" || phase.type === "WATERFALL_ACTIVE"
      ? phase.owner
      : currentPlayer;

  /* =========================
     DRINK LOGIC
  ========================= */

  function flashDrawer(name) {
    setDrawerFlash((f) => [...new Set([...f, name])]);
    setTimeout(() => {
      setDrawerFlash((f) => f.filter((n) => n !== name));
    }, 1200);
  }

  function drink(name) {
    setBeers((b) => ({ ...b, [name]: (b[name] || 0) + 1 }));
    setDrinkFlash((f) => [...new Set([...f, name])]);

    setTimeout(() => {
      setDrinkFlash((f) => f.filter((n) => n !== name));
    }, 5000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);

    drink(name);
    (mates[name] || []).forEach((m) => propagateDrink(m, visited));
  }

  function drinkEveryone() {
    PLAYERS.forEach((p) => propagateDrink(p));
  }

  // Simple "Guys" placeholder: you can replace with a real filter later.
  // For now, it shows structure and won't break builds.
  function drinkGuys() {
    // If you later add genders, replace this logic.
    // Currently: no-op if you want, but per your request we enforce something:
    // We'll treat first half of the list as "Guys" as a temporary rule.
    const half = Math.floor(PLAYERS.length / 2);
    PLAYERS.slice(0, half).forEach((p) => propagateDrink(p));
  }

  /* =========================
     WATERFALL HELPERS
  ========================= */

  function resetWaterfall() {
    setWaterfallReady(new Set());
    setWaterfallStarter(null);
  }

  function allReady(readySet) {
    return readySet.size === PLAYERS.length;
  }

  function toggleReady(player) {
    setWaterfallReady((prev) => {
      const next = new Set(prev);
      if (next.has(player)) next.delete(player);
      else next.add(player);
      return next;
    });
  }

  function startWaterfallIfReady(starter) {
    // Drawer pushes start after everyone is ready up
    if (phase.type !== "WATERFALL_READY") return;
    if (starter !== phase.owner) return;
    if (!allReady(waterfallReady)) return;

    setWaterfallStarter(starter);
    setPhase({ type: "WATERFALL_ACTIVE", owner: starter });
  }

  function endWaterfall(ender) {
    // Drawer ends it (one-tap); then game returns to IDLE and draws can resume
    if (phase.type !== "WATERFALL_ACTIVE") return;
    if (ender !== phase.owner) return;
    resetWaterfall();
    setPhase({ type: "IDLE", owner: null });
  }

  /* =========================
     RACE HELPERS (J / 7)
  ========================= */

  function clearRaceTimer() {
    if (raceTimerId) {
      clearTimeout(raceTimerId);
      setRaceTimerId(null);
    }
  }

  function resetRace() {
    clearRaceTimer();
    setRaceReacted(new Set());
    setRaceLoser(null);
  }

  function beginRace(kind, owner) {
    // J and 7 are NOT auto-triggered by draw. Holder must trigger.
    // Owner is excluded from losing.
    resetRace();
    setPhase({ type: kind, owner });

    // Auto-lose rule:
    // If there is one person that hasn't tapped -> auto lose.
    // We implement this as a countdown timer: after time expires, pick someone not in reacted set.
    const id = setTimeout(() => {
      setRaceReacted((prev) => {
        // Determine non-owner non-reacted
        const eligible = PLAYERS.filter((p) => p !== owner);
        const missing = eligible.filter((p) => !prev.has(p));

        if (missing.length > 0) {
          // Pick first missing as auto-loser (deterministic)
          const auto = missing[0];
          setRaceLoser(auto);
          propagateDrink(auto);
          setPhase({ type: "IDLE", owner: null });
          return new Set(); // clear
        } else {
          // Everyone reacted, but we didn't resolve in time; do nothing
          setPhase({ type: "IDLE", owner: null });
          return new Set();
        }
      });
    }, 6000); // 6s window; adjust later if you want
    setRaceTimerId(id);
  }

  function tapRace(name) {
    const owner = phase.owner;

    // owner starts race, but is excluded from losing and is allowed to trigger
    if (!owner) return;
    if (name === owner) return; // holder should not "react" for the race

    setRaceReacted((prev) => {
      if (prev.has(name)) return prev;
      const next = new Set(prev);
      next.add(name);

      // If everyone except owner reacted, last reactor loses immediately
      const required = PLAYERS.length - 1;
      if (next.size === required) {
        clearRaceTimer();
        setRaceLoser(name);
        propagateDrink(name);
        setPhase({ type: "IDLE", owner: null });
        return new Set();
      }
      return next;
    });
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    // Draw locked during any non-IDLE phase,
    // including waterfall readiness/active and races and selections.
    if (phase.type !== "IDLE") return;
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    // highlight drawer tile briefly
    flashDrawer(drawer);

    // Base default: after draw, advance turn
    setTurn((t) => (t + 1) % PLAYERS.length);

    /* ======================
       CARD-BY-CARD ENFORCEMENT
    ====================== */

    // A: Waterfall (drawer-controlled ready + start, locks draw)
    if (r === "A") {
      resetWaterfall();
      // Drawer is the "waterfall owner"; keep turn on them until done
      setPhase({ type: "WATERFALL_READY", owner: drawer });
      // Drawer is always ready implicitly? (Optional)
      // We keep explicit: everyone must tap, including drawer
      return;
    }

    // 2: Pick someone to drink (drawer chooses by tapping a tile)
    if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
      return;
    }

    // 3: Me (drawer drinks immediately)
    if (r === "3") {
      propagateDrink(drawer);
      return;
    }

    // 4: Everyone drinks
    if (r === "4") {
      drinkEveryone();
      return;
    }

    // 5: Guys
    if (r === "5") {
      drinkGuys();
      return;
    }

    // 6: Everyone drinks (per your rules list)
    if (r === "6") {
      drinkEveryone();
      return;
    }

    // 7: Heaven holder transfers (NOT auto-triggered race)
    if (r === "7") {
      setHeavenHolder(drawer);
      return;
    }

    // 8: Pick a mate (drawer chooses by tapping)
    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
      return;
    }

    // J: Thumb holder transfers (NOT auto-triggered race)
    if (r === "J") {
      setThumbHolder(drawer);
      return;
    }

    // Q/K/9/10 display only for now (no enforcement requested yet)
  }

  /* =========================
     TAP PLAYER
  ========================= */

  function tapPlayer(name) {
    /* ======================
       WATERFALL READY: tap to ready
       - Everyone taps their own tile to ready up
       - Draw is locked
       - Drawer pushes START after all ready
    ====================== */
    if (phase.type === "WATERFALL_READY") {
      // Everyone can toggle their own readiness
      // (prevents griefing by toggling others)
      // If you want "one device for all players", remove this check.
      toggleReady(name);
      return;
    }

    /* ======================
       WATERFALL ACTIVE:
       - Normal taps should NOT add drinks here
       - Only drawer can END waterfall
       - (we show waterfall-start highlight via CSS class)
    ====================== */
    if (phase.type === "WATERFALL_ACTIVE") {
      // Only owner can end it
      endWaterfall(name);
      return;
    }

    /* ======================
       THUMB / HEAVEN RACES
       - Not auto triggered by draw
       - Holder triggers start by tapping themselves
       - Everyone else taps to avoid losing
       - Owner excluded; last to react loses
       - Auto-lose if someone doesn't tap by timer
    ====================== */
    if (phase.type === "THUMB_RACE" || phase.type === "HEAVEN_RACE") {
      tapRace(name);
      return;
    }

    /* ======================
       PICK A MATE (8)
    ====================== */
    if (phase.type === "SELECT_MATE") {
      // Only owner can make the pick
      if (name === phase.owner) return;

      setMates((m) => ({
        ...m,
        [phase.owner]: [...new Set([...(m[phase.owner] || []), name])],
      }));

      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ======================
       PICK SOMEONE (2)
    ====================== */
    if (phase.type === "SELECT_DRINK") {
      // Only owner can choose; but target can be anyone
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ======================
       NORMAL DRINK TAP
    ====================== */
    propagateDrink(name);
  }

  /* =========================
     INFO / MATES
  ========================= */

  const matePills = useMemo(() => {
    const out = [];
    Object.entries(mates).forEach(([a, list]) => {
      list.forEach((b) => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  const statusLine = useMemo(() => {
    if (phase.type === "SELECT_MATE") return `${phase.owner} — pick a mate`;
    if (phase.type === "SELECT_DRINK") return `${phase.owner} — pick who drinks`;
    if (phase.type === "WATERFALL_READY") {
      const remaining = PLAYERS.length - waterfallReady.size;
      return remaining === 0
        ? `${phase.owner} — everyone READY. Tap ${phase.owner} to START`
        : `${phase.owner} — ${remaining} not ready`;
    }
    if (phase.type === "WATERFALL_ACTIVE") return `${phase.owner} — Waterfall ACTIVE (tap to END)`;
    if (phase.type === "THUMB_RACE") return `Thumb race — tap fast (holder excluded)`;
    if (phase.type === "HEAVEN_RACE") return `Heaven race — tap fast (holder excluded)`;
    return `Tap players to add drinks (+ mates)`;
  }, [phase.type, phase.owner, waterfallReady]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{effectiveTurnPlayer}’s Turn</h2>

      <div className="status">{statusLine}</div>

      {/* CARD */}
      <div
        className={`card ${phase.type !== "IDLE" ? "locked" : ""}`}
        onClick={drawCard}
        role="button"
        tabIndex={0}
      >
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[currentRank]}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>

      {/* ACTION BUTTONS (drawer-controlled triggers for J/7 and Waterfall start) */}
      <div className="info">
        <span className="pill">👍 Thumb: {thumbHolder || "—"}</span>
        <span className="pill">☁️ Heaven: {heavenHolder || "—"}</span>

        {/* J/7 trigger controls: holder must start (not auto) */}
        {thumbHolder && phase.type === "IDLE" && (
          <button
            className="pill action"
            onClick={() => beginRace("THUMB_RACE", thumbHolder)}
          >
            Start THUMB race (holder: {thumbHolder})
          </button>
        )}

        {heavenHolder && phase.type === "IDLE" && (
          <button
            className="pill action"
            onClick={() => beginRace("HEAVEN_RACE", heavenHolder)}
          >
            Start HEAVEN race (holder: {heavenHolder})
          </button>
        )}

        {/* Always show mates pills (requested) */}
        {matePills.length === 0 && (
          <span className="pill muted">🤝 No mates yet</span>
        )}

        {matePills.map((m, i) => (
          <span key={i} className="pill mate">
            {m}
          </span>
        ))}
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map((p) => {
          const isTurn = p === effectiveTurnPlayer;
          const isSelectingOwner = p === phase.owner;
          const isDrink = drinkFlash.includes(p);
          const isDrawerFlash = drawerFlash.includes(p);

          const isReady =
            phase.type === "WATERFALL_READY" ? waterfallReady.has(p) : false;

          const isWaterfallOwner =
            (phase.type === "WATERFALL_READY" || phase.type === "WATERFALL_ACTIVE") &&
            p === phase.owner;

          // "selectable" highlighting for 2/8 selections
          const selectable =
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK") &&
            p !== phase.owner;

          return (
            <div
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${isSelectingOwner ? "active" : ""}
                ${selectable ? "active" : ""}
                ${isDrink ? "drink" : ""}
                ${isReady ? "ready" : ""}
                ${isWaterfallOwner && phase.type === "WATERFALL_ACTIVE" ? "waterfall-start" : ""}
                ${isDrawerFlash ? "drawer" : ""}
              `}
              onClick={() => tapPlayer(p)}
              role="button"
              tabIndex={0}
            >
              <div className="badges">
                {p === thumbHolder && <span className="badge thumb">THUMB</span>}
                {p === heavenHolder && (
                  <span className="badge heaven">HEAVEN</span>
                )}
                {phase.type === "WATERFALL_READY" && isReady && (
                  <span className="badge readyBadge">READY</span>
                )}
                {phase.type === "WATERFALL_ACTIVE" && isWaterfallOwner && (
                  <span className="badge wfBadge">WATERFALL</span>
                )}
              </div>

              <div className="name">{p}</div>
              <div className="beer">🍺 {beers[p]}</div>

              {/* Waterfall start control lives on owner tile */}
              {phase.type === "WATERFALL_READY" && p === phase.owner && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="pill action"
                    onClick={(e) => {
                      e.stopPropagation();
                      startWaterfallIfReady(p);
                    }}
                    disabled={!allReady(waterfallReady)}
                  >
                    START Waterfall
                  </button>
                </div>
              )}

              {/* End control on owner tile during active */}
              {phase.type === "WATERFALL_ACTIVE" && p === phase.owner && (
                <div style={{ marginTop: 8 }}>
                  <button
                    className="pill action danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      endWaterfall(p);
                    }}
                  >
                    END Waterfall
                  </button>
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
