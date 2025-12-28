// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "4s for Whores — Everyone drinks (stacks with mates)",
  5: "Guys drink (stacks with mates)",
  6: "6s for Dicks — Everyone drinks (stacks with mates)",
  7: "Heaven (holder can trigger)",
  8: "Pick a Mate",
  9: "Rhyme (drawer enforces)",
  10: "Categories (drawer enforces)",
  J: "Thumbmaster (holder can trigger)",
  Q: "Question Master (penalty on answered question)",
  K: "Make a Rule (persists)",
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
  /* ---------- CORE ---------- */
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  /* ---------- COUNTS ---------- */
  const [beers, setBeers] = useState(Object.fromEntries(PLAYERS.map((p) => [p, 0])));

  /* ---------- MATES ---------- */
  const [mates, setMates] = useState(Object.fromEntries(PLAYERS.map((p) => [p, []])));

  /* ---------- PHASE ---------- */
  // IDLE, SELECT_MATE, SELECT_DRINK, WATERFALL_READY, WATERFALL_ACTIVE, RHYME_ACTIVE, CATEGORIES_ACTIVE, MAKE_RULE
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  /* ---------- EFFECTS ---------- */
  const [drinkFlash, setDrinkFlash] = useState([]);
  const [focusPlayers, setFocusPlayers] = useState(new Set());
  const [lastLoser, setLastLoser] = useState(null);

  /* ---------- HOLDERS ---------- */
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);

  /* ---------- QUESTION MODE ---------- */
  // when true: next tap assigns 1 drink penalty
  const [qPenaltyMode, setQPenaltyMode] = useState(false);

  /* ---------- RACE ---------- */
  const [race, setRace] = useState({ type: null, holder: null, reacted: new Set() });

  /* ---------- WATERFALL ---------- */
  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallIndex, setWaterfallIndex] = useState(null);

  /* ---------- RHYME / CATEGORIES ---------- */
  const [round, setRound] = useState({
    type: null, // "RHYME" | "CATEGORIES" | null
    owner: null,
    index: null, // points at current player in PLAYERS
  });

  /* ---------- RULES (K) ---------- */
  const [houseRules, setHouseRules] = useState([]); // {id, text, by}
  const [ruleDraft, setRuleDraft] = useState("");

  /* ---------- CARD DRAW ANIM ---------- */
  const [drawAnimTick, setDrawAnimTick] = useState(0);

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINK LOGIC
  ========================= */

  const DRINK_FLASH_MS = 2500;

  function drink(name) {
    setBeers((b) => ({ ...b, [name]: (b[name] || 0) + 1 }));
    setDrinkFlash((f) => [...new Set([...f, name])]);
    setTimeout(() => setDrinkFlash((f) => f.filter((n) => n !== name)), DRINK_FLASH_MS);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    (mates[name] || []).forEach((m) => propagateDrink(m, visited));
  }

  function drinkAll() {
    PLAYERS.forEach((p) => propagateDrink(p));
  }

  function drinkGuys() {
    // Your current 6-player roster is all guys; keep as explicit for later expansion.
    PLAYERS.forEach((p) => propagateDrink(p));
  }

  /* =========================
     WATERFALL
  ========================= */

  function startWaterfall() {
    if (phase.type !== "WATERFALL_READY") return;
    setWaterfallIndex(PLAYERS.indexOf(phase.owner));
    setPhase({ type: "WATERFALL_ACTIVE", owner: phase.owner });
  }

  function endWaterfall() {
    if (phase.type !== "WATERFALL_ACTIVE") return;
    setPhase({ type: "IDLE", owner: null });
    setWaterfallReady(new Set());
    setWaterfallIndex(null);
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  function currentWaterfallDrinker() {
    return phase.type === "WATERFALL_ACTIVE" ? PLAYERS[waterfallIndex] : null;
  }

  /* =========================
     RACES (Thumb / Heaven)
  ========================= */

  function startRace(type, holder) {
    if (!holder) return;
    if (phase.type !== "IDLE") return;
    setLastLoser(null);
    setRace({ type, holder, reacted: new Set() });
    setPhase({ type: `RACE_${type}`, owner: holder });
  }

  function handleRaceTap(name) {
    if (!race.type) return;
    if (name === race.holder) return;
    if (race.reacted.has(name)) return;

    const next = new Set(race.reacted);
    next.add(name);

    // Exclude holder + loser => reacted count must be PLAYERS-2 to find the last person
    if (next.size === PLAYERS.length - 2) {
      const loser = PLAYERS.find((p) => p !== race.holder && !next.has(p));
      if (loser) {
        setLastLoser(loser);
        propagateDrink(loser);
      }
      setRace({ type: null, holder: null, reacted: new Set() });
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    setRace((r) => ({ ...r, reacted: next }));
  }

  /* =========================
     RHYME / CATEGORIES
  ========================= */

  function beginRound(type, owner) {
    const ownerIdx = PLAYERS.indexOf(owner);
    const nextIdx = (ownerIdx + 1) % PLAYERS.length;
    setRound({ type, owner, index: nextIdx });
    setPhase({ type: type === "RHYME" ? "RHYME_ACTIVE" : "CATEGORIES_ACTIVE", owner });
  }

  function roundNext() {
    if (!round.type) return;
    setRound((r) => ({ ...r, index: (r.index + 1) % PLAYERS.length }));
  }

  function roundLoseCurrent() {
    if (!round.type) return;
    const loser = PLAYERS[round.index];
    setLastLoser(loser);
    propagateDrink(loser);

    // End the round, then advance turn to next after drawer
    const ownerIdx = PLAYERS.indexOf(round.owner);
    setRound({ type: null, owner: null, index: null });
    setPhase({ type: "IDLE", owner: null });
    setTurn((ownerIdx + 1) % PLAYERS.length);
  }

  function roundEndNoLoss() {
    if (!round.type) return;
    const ownerIdx = PLAYERS.indexOf(round.owner);
    setRound({ type: null, owner: null, index: null });
    setPhase({ type: "IDLE", owner: null });
    setTurn((ownerIdx + 1) % PLAYERS.length);
  }

  /* =========================
     K RULES
  ========================= */

  function submitRule() {
    if (phase.type !== "MAKE_RULE") return;
    const text = ruleDraft.trim();
    if (!text) return;

    setHouseRules((r) => [
      ...r,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, by: phase.owner },
    ]);
    setRuleDraft("");

    // After rule set, advance turn to next after drawer
    const ownerIdx = PLAYERS.indexOf(phase.owner);
    setPhase({ type: "IDLE", owner: null });
    setTurn((ownerIdx + 1) % PLAYERS.length);
  }

  /* =========================
     DRAW
  ========================= */

  function drawCard() {
    if (phase.type !== "IDLE") return;
    if (qPenaltyMode) return; // prevent drawing while in Q penalty mode
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);
    setDrawAnimTick((t) => t + 1);

    const r = rankOf(next);
    const drawer = currentPlayer;

    // Immediate phase-based cards
    if (r === "8") return setPhase({ type: "SELECT_MATE", owner: drawer });
    if (r === "2") return setPhase({ type: "SELECT_DRINK", owner: drawer });

    if (r === "A") {
      setWaterfallReady(new Set());
      return setPhase({ type: "WATERFALL_READY", owner: drawer });
    }

    if (r === "9") return beginRound("RHYME", drawer);
    if (r === "10") return beginRound("CATEGORIES", drawer);

    if (r === "K") return setPhase({ type: "MAKE_RULE", owner: drawer });

    // Persistent holder cards
    if (r === "J") {
      setThumbHolder(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "7") {
      setHeavenHolder(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "Q") {
      setQuestionHolder(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    // Instant action cards
    if (r === "3") {
      propagateDrink(drawer);
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "4") {
      drinkAll();
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "5") {
      drinkGuys();
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "6") {
      drinkAll();
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    // Default: advance turn
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  /* =========================
     TAP PLAYER
  ========================= */

  function tapPlayer(name) {
    // Q penalty mode (Question Master)
    if (qPenaltyMode) {
      propagateDrink(name);
      setQPenaltyMode(false);
      return;
    }

    // Active races
    if (phase.type.startsWith("RACE")) return handleRaceTap(name);

    // Waterfall ready
    if (phase.type === "WATERFALL_READY") {
      setWaterfallReady((r) => new Set(r).add(name));
      return;
    }

    // Waterfall active: only current drinker can advance
    if (phase.type === "WATERFALL_ACTIVE") {
      if (name !== currentWaterfallDrinker()) return;
      setWaterfallIndex((i) => (i + 1) % PLAYERS.length);
      return;
    }

    // Select mate
    if (phase.type === "SELECT_MATE" && name !== phase.owner) {
      setMates((m) => ({
        ...m,
        [phase.owner]: [...new Set([...(m[phase.owner] || []), name])],
      }));
      setPhase({ type: "IDLE", owner: null });
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    // Select drink target
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      setTurn((t) => (t + 1) % PLAYERS.length);
      return;
    }

    // Default tap = propagate drink (your existing behavior)
    propagateDrink(name);
  }

  /* =========================
     MATE FOCUS
  ========================= */

  function focusPair(label) {
    const [a, b] = label.split("→").map((s) => s.trim());
    setFocusPlayers(new Set([a, b]));
    setTimeout(() => setFocusPlayers(new Set()), 1500);
  }

  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        (list || []).map((b) => `${a} → ${b}`)
      ),
    [mates]
  );

  /* =========================
     RESET GAME
  ========================= */

  function resetGame() {
    setDeck(buildDeck());
    setCard(null);
    setTurn(0);

    setBeers(Object.fromEntries(PLAYERS.map((p) => [p, 0])));
    setMates(Object.fromEntries(PLAYERS.map((p) => [p, []])));

    setPhase({ type: "IDLE", owner: null });
    setDrinkFlash([]);
    setFocusPlayers(new Set());
    setLastLoser(null);

    setThumbHolder(null);
    setHeavenHolder(null);
    setQuestionHolder(null);
    setQPenaltyMode(false);

    setRace({ type: null, holder: null, reacted: new Set() });
    setWaterfallReady(new Set());
    setWaterfallIndex(null);

    setRound({ type: null, owner: null, index: null });

    setHouseRules([]);
    setRuleDraft("");
  }

  /* =========================
     BUTTON LABEL (BOTTOM)
  ========================= */

  const allReady = waterfallReady.size === PLAYERS.length;

  let bottomLabel = "Reset Game";
  let bottomDisabled = false;
  let bottomOnClick = resetGame;

  if (phase.type === "WATERFALL_READY") {
    bottomLabel = "Start Waterfall";
    bottomDisabled = !allReady;
    bottomOnClick = startWaterfall;
  } else if (phase.type === "WATERFALL_ACTIVE") {
    bottomLabel = "End Waterfall";
    bottomDisabled = false;
    bottomOnClick = endWaterfall;
  } else if (phase.type === "MAKE_RULE") {
    bottomLabel = "Save Rule";
    bottomDisabled = !ruleDraft.trim();
    bottomOnClick = submitRule;
  } else if (phase.type === "RHYME_ACTIVE" || phase.type === "CATEGORIES_ACTIVE") {
    bottomLabel = "End Round (No Loss)";
    bottomDisabled = false;
    bottomOnClick = roundEndNoLoss;
  }

  /* =========================
     STATUS LINE
  ========================= */

  const statusText = useMemo(() => {
    if (qPenaltyMode) return "Q Penalty Mode: tap a player to give 1 drink";
    if (phase.type === "SELECT_MATE") return "Pick a Mate: tap someone (not yourself)";
    if (phase.type === "SELECT_DRINK") return "Pick someone to drink: tap a player";
    if (phase.type === "WATERFALL_READY") return "Waterfall: everyone tap to READY";
    if (phase.type === "WATERFALL_ACTIVE")
      return `Waterfall ACTIVE: ${currentWaterfallDrinker()} is drinking (tap to pass)`;

    if (phase.type === "RHYME_ACTIVE") return `Rhyme: ${round.owner} enforces — ${PLAYERS[round.index]}'s turn`;
    if (phase.type === "CATEGORIES_ACTIVE")
      return `Categories: ${round.owner} enforces — ${PLAYERS[round.index]}'s turn`;

    if (phase.type.startsWith("RACE_THUMB")) return `THUMB RACE ACTIVE (holder: ${race.holder}) — tap to react`;
    if (phase.type.startsWith("RACE_HEAVEN")) return `HEAVEN RACE ACTIVE (holder: ${race.holder}) — tap to react`;

    if (phase.type === "MAKE_RULE") return `Make a Rule: ${phase.owner} sets it (persists)`;

    return CARD_RULES[currentRank] || "Draw a card";
  }, [qPenaltyMode, phase.type, currentRank, round, race.holder, phase.owner, waterfallIndex]);

  const drawLocked = phase.type !== "IDLE" || qPenaltyMode;

  /* =========================
     RENDER
  ========================= */

  const shownRules = houseRules.slice(-3);

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">{statusText}</div>

      {/* CONTROL BAR: LEFT BUTTONS | CENTER CARD | RIGHT LIST */}
      <div className="control-bar">
        <div className="power-col">
          <button
            className={`power-btn ${!heavenHolder || phase.type !== "IDLE" ? "disabled" : ""}`}
            disabled={!heavenHolder || phase.type !== "IDLE"}
            onClick={() => startRace("HEAVEN", heavenHolder)}
            title="Heaven holder triggers anytime"
          >
            ☁️ HEAVEN
            <span className="power-sub">{heavenHolder || "—"}</span>
          </button>

          <button
            className={`power-btn ${!thumbHolder || phase.type !== "IDLE" ? "disabled" : ""}`}
            disabled={!thumbHolder || phase.type !== "IDLE"}
            onClick={() => startRace("THUMB", thumbHolder)}
            title="Thumb holder triggers anytime"
          >
            👍 THUMB
            <span className="power-sub">{thumbHolder || "—"}</span>
          </button>

          <button
            className={`power-btn ${!questionHolder ? "disabled" : ""} ${qPenaltyMode ? "armed" : ""}`}
            disabled={!questionHolder}
            onClick={() => setQPenaltyMode((v) => !v)}
            title="Toggle: next tap gives 1 drink"
          >
            ❓ Q PENALTY
            <span className="power-sub">{questionHolder || "—"}</span>
          </button>
        </div>

        <div
          key={drawAnimTick}
          className={`card ${drawLocked ? "locked" : ""} draw-anim`}
          onClick={drawCard}
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

        <div className="pills">
          {matePills.length === 0 ? (
            <span className="pill muted">🤝 No mates yet</span>
          ) : (
            matePills.map((m, i) => (
              <button key={i} className="pill mate" onClick={() => focusPair(m)}>
                {m}
              </button>
            ))
          )}

          <div className="pill-group">
            <span className="pill small muted">Rules: {houseRules.length}</span>
            {shownRules.map((r) => (
              <span key={r.id} className="pill small">
                📌 {r.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RULE INPUT (K) */}
      {phase.type === "MAKE_RULE" && (
        <div className="rulebar">
          <input
            className="ruleinput"
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule (persists)…"
            maxLength={70}
          />
          <button className="rulebtn" onClick={submitRule} disabled={!ruleDraft.trim()}>
            Add
          </button>
        </div>
      )}

      {/* RHYME / CATEGORIES CONTROLS */}
      {(phase.type === "RHYME_ACTIVE" || phase.type === "CATEGORIES_ACTIVE") && (
        <div className="roundbar">
          <div className="roundleft">
            <span className="roundtag">
              {phase.type === "RHYME_ACTIVE" ? "🎤 RHYME" : "🧠 CATEGORIES"}
            </span>
            <span className="roundwho">
              Enforcer: <b>{round.owner}</b> — Current: <b>{PLAYERS[round.index]}</b>
            </span>
          </div>
          <div className="roundright">
            <button className="roundbtn" onClick={roundNext}>
              Next
            </button>
            <button className="roundbtn danger" onClick={roundLoseCurrent}>
              Lose (Current)
            </button>
          </div>
        </div>
      )}

      {/* PLAYERS GRID */}
      <div className="players">
        {PLAYERS.map((p) => {
          const isWaterfallActive =
            phase.type === "WATERFALL_ACTIVE" && p === currentWaterfallDrinker();

          const isActiveSelectOwner =
            phase.owner === p &&
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK");

          const isFocus = focusPlayers.has(p);
          const isLoser = lastLoser === p;

          return (
            <div
              key={p}
              className={`player
                ${p === currentPlayer ? "turn" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${waterfallReady.has(p) ? "ready" : ""}
                ${isWaterfallActive ? "waterfall-active" : ""}
                ${isActiveSelectOwner ? "active" : ""}
                ${isFocus ? "active" : ""}
                ${isLoser ? "lose" : ""}
              `}
              onClick={() => tapPlayer(p)}
            >
              <div className="badges">
                {p === currentPlayer && <span className="badge turn">TURN</span>}
                {p === thumbHolder && <span className="badge thumb">THUMB</span>}
                {p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
                {p === questionHolder && <span className="badge q">Q</span>}
              </div>

              <div className="name">{p}</div>
              <div className="beer">🍺 {beers[p]}</div>

              {phase.type === "WATERFALL_READY" && (
                <div className="mini">
                  {waterfallReady.has(p) ? "READY" : "TAP TO READY"}
                </div>
              )}

              {(phase.type.startsWith("RACE_THUMB") || phase.type.startsWith("RACE_HEAVEN")) && (
                <div className="mini">
                  {p === race.holder
                    ? "HOLDER"
                    : race.reacted.has(p)
                    ? "REACTED"
                    : "TAP TO REACT"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="reset" disabled={bottomDisabled} onClick={bottomOnClick}>
        {bottomLabel}
      </button>
    </div>
  );
            }
