import { useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

/* =========================
   DECK
========================= */
function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];

  for (const r of ranks) {
    for (const s of suits) {
      deck.push(`${r}${s}`);
    }
  }

  // Fisher–Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function getRank(card) {
  return card.replace(/[^A-Z0-9]/g, "");
}

/* =========================
   APP
========================= */
export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [turnIndex, setTurnIndex] = useState(0);

  const [thumbmaster, setThumbmaster] = useState(null); // J
  const [heaven, setHeaven] = useState(null); // 7

  const [reaction, setReaction] = useState(null);
  // { type: "J" | "7", starter: string, reacted: Set<string> }

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  const [stats, setStats] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, { started: 0, lost: 0 }]))
  );

  // Animation control
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealTick, setRevealTick] = useState(0);

  const cardsLeft = deck.length;
  const cardsDrawn = 52 - cardsLeft;

  function currentPlayer() {
    return PLAYERS[turnIndex];
  }

  /* =========================
     DRAW (TAP DECK)
  ========================= */
  function drawCard() {
    if (reaction) return;
    if (deck.length === 0) return;
    if (isDrawing) return;

    setIsDrawing(true);

    setDeck((d) => {
      if (d.length === 0) return d;

      const [next, ...rest] = d;
      const rank = getRank(next);
      const player = currentPlayer();

      // Trigger reveal animation by remounting the drawn card node
      setRevealTick((t) => t + 1);

      setCard(next);

      if (rank === "J") setThumbmaster(player);
      if (rank === "7") setHeaven(player);

      setTurnIndex((t) => (t + 1) % PLAYERS.length);

      return rest;
    });

    // Unlock after animation finishes
    window.setTimeout(() => setIsDrawing(false), 520);
  }

  /* =========================
     BEERS
  ========================= */
  function addBeer(name) {
    setBeers((b) => ({
      ...b,
      [name]: b[name] + 1,
    }));
  }

  /* =========================
     REACTIONS
  ========================= */
  function startReaction(type) {
    if (reaction) return;

    const starter = type === "J" ? thumbmaster : heaven;
    if (!starter) return;

    setStats((s) => ({
      ...s,
      [starter]: {
        ...s[starter],
        started: s[starter].started + 1,
      },
    }));

    setReaction({
      type,
      starter,
      reacted: new Set([starter]),
    });
  }

  function react(name) {
    if (!reaction) return;
    if (reaction.reacted.has(name)) return;

    const updated = new Set(reaction.reacted);
    updated.add(name);

    if (updated.size === PLAYERS.length) {
      // last person tapped
      setStats((s) => ({
        ...s,
        [name]: {
          ...s[name],
          lost: s[name].lost + 1,
        },
      }));

      setReaction(null);
      return;
    }

    setReaction({
      ...reaction,
      reacted: updated,
    });
  }

  /* =========================
     RESET
  ========================= */
  function resetGame() {
    if (reaction) return;
    if (isDrawing) return;
    if (thumbmaster || heaven) return; // keep your original guard

    setDeck(buildDeck());
    setCard(null);
    setTurnIndex(0);
    setThumbmaster(null);
    setHeaven(null);
    setReaction(null);

    setBeers(Object.fromEntries(PLAYERS.map((p) => [p, 0])));
    setStats(Object.fromEntries(PLAYERS.map((p) => [p, { started: 0, lost: 0 }])));

    setRevealTick((t) => t + 1);
  }

  const deckDisabled = reaction || cardsLeft === 0 || isDrawing;

  return (
    <div className={`app ${reaction ? "reaction" : ""}`}>
      <h1>KAD Kings</h1>

      {/* DECK + DRAWN CARD */}
      <div className="stage">
        <div className="deck-zone">
          <button
            type="button"
            className={`deck ${deckDisabled ? "disabled" : ""}`}
            onClick={drawCard}
            aria-label="Tap deck to draw"
          >
            <span className="deck-stack">
              <span className="deck-card back" />
              <span className="deck-card back" />
              <span className="deck-card back" />
            </span>
            <span className="deck-hint">
              {cardsLeft === 0 ? "Empty" : reaction ? "Finish reaction" : "Tap to draw"}
            </span>
          </button>

          <div
            key={revealTick}
            className={`drawn-card ${card ? "reveal" : ""}`}
            aria-live="polite"
          >
            <div className="card-face">{card ?? "—"}</div>
            <div className="card-meta">{cardsLeft} left</div>
          </div>
        </div>

        {/* INFO BAR */}
        <div className="info-bar">
          <div className="pill">
            <div className="pill-label">Progress</div>
            <div className="pill-value">{cardsDrawn} / 52</div>
          </div>

          <div className="pill">
            <div className="pill-label">Current</div>
            <div className="pill-value">{currentPlayer()}</div>
          </div>

          <div className="pill">
            <div className="pill-label">Thumb (J)</div>
            <div className="pill-value">{thumbmaster ?? "—"}</div>
          </div>

          <div className="pill">
            <div className="pill-label">Heaven (7)</div>
            <div className="pill-value">{heaven ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* PLAYERS */}
      <div className="table">
        {PLAYERS.map((name, i) => {
          const isActive = i === turnIndex;
          const isStarter = reaction?.starter === name;
          const isThumb = thumbmaster === name;
          const isHeav = heaven === name;

          return (
            <div
              key={name}
              className={[
                "player",
                isActive && "active",
                isStarter && "starter",
                isThumb && "thumbmaster",
                isHeav && "heaven",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="avatar" />
              <div className="name">{name}</div>
              <div className="count">🍺 {beers[name]}</div>

              <button
                className="beer"
                onClick={() => (reaction ? react(name) : addBeer(name))}
              >
                {reaction ? "TAP" : "+1 Beer"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ACTION DOCK */}
      <div className="dock">
        <button
          className="dock-btn"
          onClick={() => startReaction("J")}
          disabled={!thumbmaster || !!reaction || isDrawing}
        >
          Start J
        </button>
        <button
          className="dock-btn"
          onClick={() => startReaction("7")}
          disabled={!heaven || !!reaction || isDrawing}
        >
          Start 7
        </button>
        <button className="dock-btn reset" onClick={resetGame} disabled={!!reaction || isDrawing}>
          Reset
        </button>
      </div>
    </div>
  );
}
