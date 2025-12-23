import { useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

/* =========================
   DECK
========================= */
function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
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

  const [thumbmaster, setThumbmaster] = useState(null); // J
  const [heaven, setHeaven] = useState(null); // 7

  const [reaction, setReaction] = useState(null);
  // { type: "J" | "7", starter: string, reacted: Set<string> }

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [stats, setStats] = useState(
    Object.fromEntries(
      PLAYERS.map(p => [p, { started: 0, lost: 0 }])
    )
  );

  const cardsLeft = deck.length;
  const cardsDrawn = 52 - cardsLeft;

  function currentPlayer() {
    return PLAYERS[cardsDrawn % PLAYERS.length];
  }

  /* =========================
     DRAW
  ========================= */
  function drawCard() {
    setDeck(d => {
      if (d.length === 0) return d;

      const [next, ...rest] = d;
      const rank = getRank(next);
      const player = currentPlayer();

      setCard(next);

      if (rank === "J") setThumbmaster(player);
      if (rank === "7") setHeaven(player);

      return rest;
    });
  }

  /* =========================
     BEERS
  ========================= */
  function addBeer(name) {
    setBeers(b => ({
      ...b,
      [name]: b[name] + 1
    }));
  }

  /* =========================
     REACTIONS
  ========================= */
  function startReaction(type) {
    const starter = type === "J" ? thumbmaster : heaven;
    if (!starter) return;

    setStats(s => ({
      ...s,
      [starter]: {
        ...s[starter],
        started: s[starter].started + 1
      }
    }));

    setReaction({
      type,
      starter,
      reacted: new Set([starter])
    });
  }

  function react(name) {
    if (!reaction) return;
    if (reaction.reacted.has(name)) return;

    const updated = new Set(reaction.reacted);
    updated.add(name);

    if (updated.size === PLAYERS.length) {
      setStats(s => ({
        ...s,
        [name]: {
          ...s[name],
          lost: s[name].lost + 1
        }
      }));

      setReaction(null);
      return;
    }

    setReaction({
      ...reaction,
      reacted: updated
    });
  }

  /* =========================
     RESET
  ========================= */
  function resetGame() {
    if (thumbmaster || heaven) return;

    setDeck(buildDeck());
    setCard(null);
    setThumbmaster(null);
    setHeaven(null);
    setReaction(null);

    setBeers(
      Object.fromEntries(PLAYERS.map(p => [p, 0]))
    );

    setStats(
      Object.fromEntries(
        PLAYERS.map(p => [p, { started: 0, lost: 0 }])
      )
    );
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS */}
      <div className="table">
        {PLAYERS.map(name => (
          <div
            key={name}
            className={[
              "player",
              thumbmaster === name && "thumbmaster",
              heaven === name && "heaven",
            ].filter(Boolean).join(" ")}
          >
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {beers[name]}</div>

            <button
              className="beer"
              onClick={() =>
                reaction ? react(name) : addBeer(name)
              }
            >
              {reaction ? "REACT" : "+1 Beer"}
            </button>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-inner">

          <div className="hud-top">
            <div className="hud-card">
              <div className="card-title">
                {card ?? "Draw"}
              </div>
              <div className="card-sub">
                {cardsLeft} left
              </div>
            </div>

            <button
              className="draw"
              onClick={drawCard}
              disabled={cardsLeft === 0}
            >
              {cardsLeft === 0 ? "EMPTY" : "DRAW"}
            </button>
          </div>

          <div className="hud-info">
            <div>
              <strong>Progress</strong>
              <span>{cardsDrawn} / 52</span>
            </div>
            <div>
              <strong>Current Player</strong>
              <span>{currentPlayer()}</span>
            </div>
            <div>
              <strong>Thumbmaster (J)</strong>
              <span>{thumbmaster ?? "None"}</span>
            </div>
            <div>
              <strong>Heaven (7)</strong>
              <span>{heaven ?? "None"}</span>
            </div>
          </div>

          <div className="hud-actions">
            <button onClick={() => startReaction("J")} disabled={!thumbmaster}>
              START J
            </button>
            <button onClick={() => startReaction("7")} disabled={!heaven}>
              START 7
            </button>
            <button className="reset" onClick={resetGame}>
              RESET
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
