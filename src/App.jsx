// src/App.jsx
import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS (6 PLAYERS)
========================= */
const PLAYERS = ["wes", "zach", "Marsh", "travis", "Kyle", "jeff"];
const HOST = "wes";

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
  /* ---------- LOBBY / ROOM ---------- */
  const [screen, setScreen] = useState("LOBBY"); // LOBBY | GAME
  const [starting, setStarting] = useState(false);
  const [hostSheetOpen, setHostSheetOpen] = useState(false);
  const [ready, setReady] = useState(() => new Set());

  const roomCodeRef = useRef("KAD-732");

  function toggleReady(name) {
    if (screen !== "LOBBY") return;
    setReady((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const allReadyLobby = ready.size === PLAYERS.length;

  function startGame() {
    if (!allReadyLobby || starting) return;
    setStarting(true);
    setTimeout(() => {
      setScreen("GAME");
      setStarting(false);
    }, 980);
  }

  /* ---------- CORE GAME ---------- */
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(Object.fromEntries(PLAYERS.map((p) => [p, 0])));
  const [mates, setMates] = useState(Object.fromEntries(PLAYERS.map((p) => [p, []])));

  const [phase, setPhase] = useState({ type: "IDLE", owner: null });
  const [drinkFlash, setDrinkFlash] = useState([]);
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  const [race, setRace] = useState({ type: null, holder: null, reacted: new Set() });

  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallIndex, setWaterfallIndex] = useState(null);

  const [focusPlayers, setFocusPlayers] = useState(new Set());

  const [cardAnim, setCardAnim] = useState(""); // "" | "draw"

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINK LOGIC
  ========================= */
  const DRINK_FLASH_MS = 1100;

  function drink(name) {
    setBeers((b) => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash((f) => [...new Set([...f, name])]);
    setTimeout(() => setDrinkFlash((f) => f.filter((n) => n !== name)), DRINK_FLASH_MS);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    (mates[name] || []).forEach((m) => propagateDrink(m, visited));
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
     DRAW
  ========================= */
  function drawCard() {
    if (screen !== "GAME") return;
    if (phase.type !== "IDLE" || deck.length === 0) return;

    // card draw animation
    setCardAnim("draw");
    setTimeout(() => setCardAnim(""), 420);

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "8") return setPhase({ type: "SELECT_MATE", owner: drawer });
    if (r === "2") return setPhase({ type: "SELECT_DRINK", owner: drawer });

    if (r === "A") {
      setWaterfallReady(new Set());
      return setPhase({ type: "WATERFALL_READY", owner: drawer });
    }

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

    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  /* =========================
     RACES
  ========================= */
  function startRace(type, holder) {
    setRace({ type, holder, reacted: new Set() });
    setPhase({ type: `RACE_${type}`, owner: holder });
  }

  function handleRaceTap(name) {
    if (name === race.holder || race.reacted.has(name)) return;

    const next = new Set(race.reacted);
    next.add(name);

    // last to react drinks (holder excluded)
    if (next.size === PLAYERS.length - 2) {
      const loser = PLAYERS.find((p) => p !== race.holder && !next.has(p));
      if (loser) propagateDrink(loser);
      setRace({ type: null, holder: null, reacted: new Set() });
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    setRace((r) => ({ ...r, reacted: next }));
  }

  /* =========================
     TAP PLAYER
  ========================= */
  function tapPlayer(name) {
    if (screen !== "GAME") return;

    // Holder triggers race any time during IDLE
    if (phase.type === "IDLE") {
      if (name === thumbHolder) return startRace("THUMB", name);
      if (name === heavenHolder) return startRace("HEAVEN", name);
    }

    if (phase.type.startsWith("RACE")) return handleRaceTap(name);

    if (phase.type === "WATERFALL_READY") {
      setWaterfallReady((r) => new Set(r).add(name));
      return;
    }

    if (phase.type === "WATERFALL_ACTIVE") {
      if (name !== currentWaterfallDrinker()) return;
      setWaterfallIndex((i) => (i + 1) % PLAYERS.length);
      return;
    }

    if (phase.type === "SELECT_MATE" && name !== phase.owner) {
      setMates((m) => ({
        ...m,
        [phase.owner]: [...new Set([...(m[phase.owner] || []), name])],
      }));
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    // default: tap = drink
    propagateDrink(name);
  }

  function focusPair(label) {
    const [a, b] = label.split("→").map((s) => s.trim());
    setFocusPlayers(new Set([a, b]));
    setTimeout(() => setFocusPlayers(new Set()), 1400);
  }

  /* =========================
     INFO
  ========================= */
  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        (list || []).map((b) => `${a} → ${b}`)
      ),
    [mates]
  );

  const drawLocked = screen !== "GAME" || phase.type !== "IDLE";
  const allReadyWaterfall = waterfallReady.size === PLAYERS.length;

  /* =========================
     HOST TOOLS (UI)
  ========================= */
  function hostShuffle() {
    setDeck(buildDeck());
    setCard(null);
    setPhase({ type: "IDLE", owner: null });
  }

  function hostSkipTurn() {
    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  function hostResetGame() {
    setDeck(buildDeck());
    setCard(null);
    setTurn(0);
    setPhase({ type: "IDLE", owner: null });
    setWaterfallReady(new Set());
    setWaterfallIndex(null);
    setRace({ type: null, holder: null, reacted: new Set() });
    setThumbHolder(null);
    setHeavenHolder(null);
    setMates(Object.fromEntries(PLAYERS.map((p) => [p, []])));
    setBeers(Object.fromEntries(PLAYERS.map((p) => [p, 0])));
    setFocusPlayers(new Set());
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className={`app ${starting ? "starting" : ""}`}>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="roomchip" onClick={() => navigator.clipboard?.writeText(roomCodeRef.current)}>
          <span className="roomlabel">ROOM</span>
          <span className="roomcode">{roomCodeRef.current}</span>
          <span className="roomhint">tap to copy</span>
        </div>

        <button className="hostbtn" onClick={() => setHostSheetOpen(true)}>
          Host
        </button>
      </div>

      <h1>KAD Kings</h1>

      <h2>
        {screen === "LOBBY" ? "Lobby" : `${currentPlayer}’s Turn`}
      </h2>

      <div className="status">
        {screen === "LOBBY"
          ? `Ready ${ready.size}/${PLAYERS.length}`
          : CARD_RULES[currentRank] || "Draw a card"}
      </div>

      {/* CONTROL BAR (CARD CENTER + PILLS RIGHT) */}
      <div className="control-bar">
        <div className="control-spacer" />

        <div
          className={`card ${drawLocked ? "locked" : ""} ${cardAnim}`}
          onClick={drawCard}
          role="button"
        >
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : (
            <div className="rank">{screen === "LOBBY" ? "DECK" : "DRAW"}</div>
          )}
        </div>

        <div className="pills">
          <span className="pill">👍 Thumb: {thumbHolder || "—"}</span>
          <span className="pill">☁️ Heaven: {heavenHolder || "—"}</span>

          {matePills.length > 0 ? (
            matePills.map((m, i) => (
              <button
                key={i}
                type="button"
                className="pill mate"
                onClick={(e) => {
                  e.stopPropagation();
                  focusPair(m);
                }}
              >
                {m}
              </button>
            ))
          ) : (
            <span className="pill muted">🤝 No mates yet</span>
          )}
        </div>
      </div>

      {/* PLAYERS GRID */}
      <div className="players">
        {PLAYERS.map((p) => {
          const isWaterfallActive =
            phase.type === "WATERFALL_ACTIVE" && p === currentWaterfallDrinker();

          const isActingOwner =
            phase.owner === p &&
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK");

          const isLobby = screen === "LOBBY";
          const isReady = ready.has(p);

          return (
            <div
              key={p}
              className={`player
                ${!isLobby && p === currentPlayer ? "turn" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${waterfallReady.has(p) ? "ready" : ""}
                ${isWaterfallActive ? "waterfall-active" : ""}
                ${isActingOwner ? "active" : ""}
                ${focusPlayers.has(p) ? "active" : ""}
                ${isLobby && isReady ? "ready" : ""}
              `}
              onClick={() => (isLobby ? toggleReady(p) : tapPlayer(p))}
            >
              <div className="badges">
                {p === HOST && <span className="badge host">HOST</span>}
                {!isLobby && p === currentPlayer && <span className="badge turn">TURN</span>}
                {!isLobby && p === thumbHolder && <span className="badge thumb">THUMB</span>}
                {!isLobby && p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
                {isLobby && isReady && <span className="badge readybadge">READY</span>}
              </div>

              <div className="name">{p}</div>

              <div className="tilebottom">
                <div className="beer">🍺 {beers[p]}</div>
                {isLobby ? (
                  <div className="mini">{isReady ? "ready" : "tap to ready"}</div>
                ) : (
                  <div className="mini">
                    {phase.type === "SELECT_MATE" && phase.owner === p
                      ? "pick a mate"
                      : phase.type === "SELECT_DRINK" && phase.owner === p
                      ? "pick a drink"
                      : phase.type === "WATERFALL_READY"
                      ? "tap = ready"
                      : phase.type === "WATERFALL_ACTIVE"
                      ? "tap when you drink"
                      : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LOBBY START BUTTON */}
      {screen === "LOBBY" && (
        <button className="reset" disabled={!allReadyLobby || starting} onClick={startGame}>
          {allReadyLobby ? "Start Game" : "Waiting for Ready"}
        </button>
      )}

      {/* GAME BUTTONS */}
      {screen === "GAME" && phase.type === "WATERFALL_READY" && (
        <button className="reset" disabled={!allReadyWaterfall} onClick={startWaterfall}>
          Start Waterfall
        </button>
      )}

      {screen === "GAME" && phase.type === "WATERFALL_ACTIVE" && (
        <button className="reset" onClick={endWaterfall}>
          End Waterfall
        </button>
      )}

      {/* HOST SHEET */}
      {hostSheetOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setHostSheetOpen(false)} />
          <div className="sheet">
            <div className="sheetheader">
              <div className="sheettitle">Host Controls</div>
              <button className="sheetclose" onClick={() => setHostSheetOpen(false)}>
                ✕
              </button>
            </div>

            <div className="sheetgroup">
              <div className="grouptitle">Round</div>
              <div className="sheetgrid">
                <button className="sheetbtn" onClick={hostShuffle}>
                  Shuffle Deck
                </button>
                <button className="sheetbtn" onClick={hostSkipTurn}>
                  Skip Turn
                </button>
                <button className="sheetbtn danger" onClick={hostResetGame}>
                  Reset Game
                </button>
                <button
                  className="sheetbtn"
                  onClick={() => {
                    setScreen("LOBBY");
                    setReady(new Set());
                    setHostSheetOpen(false);
                    hostResetGame();
                  }}
                >
                  Back to Lobby
                </button>
              </div>
            </div>

            <div className="sheetnote">
              Host can play normally. These tools just manage the room.
            </div>
          </div>
        </>
      )}
    </div>
  );
         }
