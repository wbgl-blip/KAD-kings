// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

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

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const d = [];
  ranks.forEach((r) => suits.forEach((s) => d.push(`${r}${s}`)));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const rankOf = (c) => c.replace(/[^A-Z0-9]/g, "");

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  // mates[A] = [B,C] means: when A drinks, B and C drink too (propagates)
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, []]))
  );

  // IDLE | SELECT_MATE | SELECT_DRINK | WATERFALL_READY | WATERFALL_RUNNING | RACE
  // owner = decision-maker (for 2/8), waterfall starter (A), or race starter (J/7)
  const [phase, setPhase] = useState({ type: "IDLE", owner: null, race: null });

  // Flash UI "YOU DRINK"
  const [drinkFlash, setDrinkFlash] = useState([]);

  // Persistent power holders (do NOT auto-trigger)
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  // Waterfall (Ace) state
  const [waterfallReady, setWaterfallReady] = useState(new Set()); // players who readied
  const [pendingTurnAfterWaterfall, setPendingTurnAfterWaterfall] = useState(null);

  // Race state for J/7 when holder triggers it
  const [raceReacted, setRaceReacted] = useState(new Set()); // reacted players excluding starter
  const raceTimeoutRef = useRef(null);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     DRINK + PROPAGATION
  ====================== */
  function drink(name) {
    setBeers((b) => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash((f) => (f.includes(name) ? f : [...f, name]));
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

  /* ======================
     LEFT OF
  ====================== */
  function leftOf(p) {
    const i = PLAYERS.indexOf(p);
    return PLAYERS[(i + 1) % PLAYERS.length];
  }

  /* ======================
     STATUS LINE
  ====================== */
  const statusText = useMemo(() => {
    if (phase.type === "SELECT_MATE") {
      return `${phase.owner} — choose a mate (tap someone else)`;
    }
    if (phase.type === "SELECT_DRINK") {
      return `${phase.owner} — choose who drinks (tap a player)`;
    }
    if (phase.type === "WATERFALL_READY") {
      const owner = phase.owner;
      const needed = PLAYERS.filter((p) => p !== owner);
      const allReady = needed.every((p) => waterfallReady.has(p));
      if (allReady) return `All ready — ${owner} tap to START`;
      return `${owner} drew Ace — everyone tap READY`;
    }
    if (phase.type === "WATERFALL_RUNNING") {
      return `Waterfall running — ${phase.owner} tap DONE when finished`;
    }
    if (phase.type === "RACE") {
      const holder = phase.owner;
      const type = phase.race === "THUMB" ? "Thumbmaster" : "Heaven";
      const needed = PLAYERS.length - 1; // excluding holder
      const count = raceReacted.size;
      return `${type} race — ${holder} started (react: ${count}/${needed})`;
    }
    if (thumbHolder || heavenHolder) {
      const parts = [];
      if (thumbHolder) parts.push(`Thumb: ${thumbHolder}`);
      if (heavenHolder) parts.push(`Heaven: ${heavenHolder}`);
      return parts.join(" • ");
    }
    return "";
  }, [phase, waterfallReady, raceReacted, thumbHolder, heavenHolder]);

  /* ======================
     CLEANUP RACE TIMER
  ====================== */
  useEffect(() => {
    return () => {
      if (raceTimeoutRef.current) clearTimeout(raceTimeoutRef.current);
    };
  }, []);

  function endRace() {
    if (raceTimeoutRef.current) clearTimeout(raceTimeoutRef.current);
    raceTimeoutRef.current = null;
    setRaceReacted(new Set());
    setPhase({ type: "IDLE", owner: null, race: null });
  }

  function startRace(kind) {
    // kind: "THUMB" | "HEAVEN"
    const starter = kind === "THUMB" ? thumbHolder : heavenHolder;
    if (!starter) return;

    // Only start from IDLE to avoid conflicts
    if (phase.type !== "IDLE") return;

    setRaceReacted(new Set());
    setPhase({ type: "RACE", owner: starter, race: kind });

    // Auto-loss rule: if exactly one person hasn't tapped by the deadline, they lose.
    // (Holder is excluded from the race.)
    if (raceTimeoutRef.current) clearTimeout(raceTimeoutRef.current);
    raceTimeoutRef.current = setTimeout(() => {
      setRaceReacted((reacted) => {
        const missing = PLAYERS.filter((p) => p !== starter && !reacted.has(p));
        if (missing.length === 1) {
          propagateDrink(missing[0]);
          endRace();
        }
        // If more than one is missing, we end with no forced loser (keeps it fair).
        // If you want "first missing loses" instead, say so.
        else if (missing.length > 1) {
          endRace();
        }
        return reacted;
      });
    }, 7000);
  }

  /* ======================
     DRAW
  ====================== */
  function draw() {
    if (phase.type !== "IDLE") return;
    if (deck.length === 0) return;

    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const r = rankOf(c);
    const drawer = current;

    // Waterfall (Ace) SPECIAL:
    // - Draw locks until everyone ready
    // - Drawer starts it
    // - Turn stays on drawer until done
    if (r === "A") {
      const nextTurn = (turn + 1) % PLAYERS.length;
      setPendingTurnAfterWaterfall(nextTurn);
      setWaterfallReady(new Set()); // drawer is not required to ready; only others
      setPhase({ type: "WATERFALL_READY", owner: drawer, race: null });
      return; // DO NOT advance turn yet
    }

    // Selection phases (2 / 8)
    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer, race: null });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer, race: null });
    }

    // Persistent holders (J / 7) — DO NOT auto-start
    if (r === "J") setThumbHolder(drawer);
    if (r === "7") setHeavenHolder(drawer);

    // For all non-Ace draws, advance turn immediately
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  /* ======================
     WATERFALL HANDLERS
  ====================== */
  function toggleReady(p) {
    if (phase.type !== "WATERFALL_READY") return;
    if (p === phase.owner) return; // owner doesn't "ready"; owner starts
    setWaterfallReady((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function startWaterfallIfReady() {
    if (phase.type !== "WATERFALL_READY") return;

    const owner = phase.owner;
    const needed = PLAYERS.filter((p) => p !== owner);
    const allReady = needed.every((p) => waterfallReady.has(p));

    if (!allReady) return;
    setPhase({ type: "WATERFALL_RUNNING", owner, race: null });
  }

  function endWaterfall() {
    if (phase.type !== "WATERFALL_RUNNING") return;
    const nextTurn = pendingTurnAfterWaterfall;
    setPendingTurnAfterWaterfall(null);
    setWaterfallReady(new Set());
    setPhase({ type: "IDLE", owner: null, race: null });

    if (typeof nextTurn === "number") {
      setTurn(nextTurn);
    }
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {
    // WATERFALL READY: everyone (except owner) toggles ready; owner starts when all ready
    if (phase.type === "WATERFALL_READY") {
      if (name === phase.owner) startWaterfallIfReady();
      else toggleReady(name);
      return;
    }

    // WATERFALL RUNNING: owner taps to end
    if (phase.type === "WATERFALL_RUNNING") {
      if (name === phase.owner) endWaterfall();
      return;
    }

    // RACE (J/7): holder excluded; last to tap loses
    if (phase.type === "RACE") {
      const starter = phase.owner;
      if (name === starter) return; // starter excluded
      if (raceReacted.has(name)) return;

      const next = new Set(raceReacted);
      next.add(name);

      // Everyone except starter must tap; the last tap loses
      if (next.size === PLAYERS.length - 1) {
        propagateDrink(name);
        endRace();
      } else {
        setRaceReacted(next);
      }
      return;
    }

    // SELECT_MATE: choose any other player (do NOT block taps here)
    if (phase.type === "SELECT_MATE") {
      if (name === phase.owner) return;
      setMates((m) => {
        const existing = m[phase.owner] || [];
        if (existing.includes(name)) return m;
        return { ...m, [phase.owner]: [...existing, name] };
      });
      setPhase({ type: "IDLE", owner: null, race: null });
      return;
    }

    // SELECT_DRINK: choose target (do NOT block taps here)
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null, race: null });
      return;
    }

    // IDLE: if holder taps themselves, they trigger their race (NOT auto)
    if (phase.type === "IDLE") {
      if (name === thumbHolder) {
        startRace("THUMB");
        return;
      }
      if (name === heavenHolder) {
        startRace("HEAVEN");
        return;
      }
    }

    // Normal tap = drink
    propagateDrink(name);
  }

  /* ======================
     MATE CHAINS
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.entries(mates).forEach(([a, list]) => {
      (list || []).forEach((b) => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  const cardLocked = phase.type !== "IDLE";

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>

      {statusText ? <div className="status">{statusText}</div> : null}

      <div className={`card ${cardLocked ? "locked" : ""}`} onClick={draw}>
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[rank] || ""}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>

      <div className="players">
        {PLAYERS.map((p) => {
          const isTurn = p === current;

          const isSelectingOwner =
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK") &&
            p === phase.owner;

          const isWaterfallOwner =
            (phase.type === "WATERFALL_READY" || phase.type === "WATERFALL_RUNNING") &&
            p === phase.owner;

          const isRaceOwner = phase.type === "RACE" && p === phase.owner;

          const isReady = phase.type === "WATERFALL_READY" && waterfallReady.has(p);

          // Helpful highlight on the person who must act / started something
          const isActive = isSelectingOwner || isWaterfallOwner || isRaceOwner;

          const isWaterfallStartGlow =
            phase.type === "WATERFALL_READY" &&
            p === phase.owner &&
            PLAYERS.filter((x) => x !== phase.owner).every((x) =>
              waterfallReady.has(x)
            );

          const tileClasses = [
            "player",
            isTurn ? "turn" : "",
            isActive ? "active" : "",
            drinkFlash.includes(p) ? "drink" : "",
            isReady ? "ready" : "",
            isWaterfallStartGlow ? "waterfall-start" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={p} className={tileClasses} onClick={() => tapPlayer(p)}>
              <div className="name">{p}</div>

              <div className="badges">
                {p === thumbHolder && (
                  <span className="badge badge-thumb">👍 THUMB</span>
                )}
                {p === heavenHolder && (
                  <span className="badge badge-heaven">☁️ HEAVEN</span>
                )}
                {phase.type === "RACE" && p !== phase.owner && raceReacted.has(p) && (
                  <span className="badge badge-reacted">✅</span>
                )}
              </div>

              <div className="beer">🍺 {beers[p]}</div>
              <div className="left">◀ Left: {leftOf(p)}</div>
            </div>
          );
        })}
      </div>

      {mateChains.length > 0 && (
        <div className="mates">
          {mateChains.map((m, i) => (
            <div key={i}>🤝 {m}</div>
          ))}
        </div>
      )}

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
