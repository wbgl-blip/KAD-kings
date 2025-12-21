import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [counts, setCounts] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );
  const [stats, setStats] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, { reactionsLost: 0 }]))
  );

  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);

  const [turn, setTurn] = useState(null);

  // sticky power holders
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  // reaction state (momentary)
  const [reactionType, setReactionType] = useState(null); // "J" | "7"
  const [reactionStart, setReactionStart] = useState(null);
  const [reactions, setReactions] = useState({});
  const [lastLoser, setLastLoser] = useState(null); // for feedback

  const cardsLeft = deck.length - index;

  function addBeer(name) {
    setCounts(c => ({ ...c, [name]: c[name] + 1 }));
  }

  function drawCard() {
    if (index >= deck.length) return;

    const drawn = deck[index];
    setCard(drawn);
    setIndex(i => i + 1);

    // assign sticky powers on draw
    if (drawn.startsWith("J")) setThumbHolder(turn);
    if (drawn.startsWith("7")) setHeavenHolder(turn);
  }

  function startReaction(type) {
    setLastLoser(null);
    setReactionType(type);
    setReactionStart(Date.now());
    setReactions({});
  }

  function react(name) {
    if (!reactionType || reactions[name]) return;

    const time = Date.now() - reactionStart;
    setReactions(r => {
      const updated = { ...r, [name]: time };

      if (Object.keys(updated).length === PLAYERS.length) {
        const loser = Object.entries(updated)
          .sort((a, b) => b[1] - a[1])[0][0];

        // punish loser
        addBeer(loser);
        setStats(s => ({
          ...s,
          [loser]: {
            reactionsLost: s[loser].reactionsLost + 1
          }
        }));

        // feedback
        setLastLoser(loser);

        // clear reaction ONLY (powers stay)
        setReactionType(null);
        setReactionStart(null);
      }

      return updated;
    });
  }

  const canStartJ = turn && turn === thumbHolder;
  const canStart7 = turn && turn === heavenHolder;

  const totalDrinks = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS */}
      <div className="player-grid">
        {PLAYERS.map(name => (
          <div
            key={name}
            className={`player 
              ${turn === name ? "active" : ""}
              ${reactionType ? "reactable" : ""}
              ${lastLoser === name ? "loser" : ""}
            `}
            onClick={() => {
              reactionType ? react(name) : setTurn(name);
            }}
          >
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {counts[name]}</div>
            <div className="meta">💀 {stats[name].reactionsLost}</div>
            <button
              className="beer"
              onClick={(e) => {
                e.stopPropagation();
                addBeer(name);
              }}
            >
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="hud">
        <div className={`hud-deck ${reactionType ? "flash" : ""}`}>
          <button className="draw-slim" onClick={drawCard}>
            DRAW
          </button>

          <div className="deck-side">
            {card ? (
              <>
                <div className="deck-rank">{card}</div>
                <div className="deck-sub">{cardsLeft} left</div>
              </>
            ) : (
              <>
                <div className="deck-rank">Draw</div>
                <div className="deck-sub">No mercy</div>
              </>
            )}
          </div>
        </div>

        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-title">Turn</span>
            {turn || "—"}
          </div>
          <div className="hud-item">
            <span className="hud-title">Thumbmaster (J)</span>
            {thumbHolder || "None"}
          </div>
          <div className="hud-item">
            <span className="hud-title">Heaven (7)</span>
            {heavenHolder || "None"}
          </div>
        </div>

        {/* SESSION STATS */}
        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-title">Total Drinks</span>
            {totalDrinks}
          </div>
          <div className="hud-item">
            <span className="hud-title">Reactions Lost</span>
            {Object.values(stats).reduce((a, s) => a + s.reactionsLost, 0)}
          </div>
          <div className="hud-item">
            <span className="hud-title">Cards Drawn</span>
            {index}
          </div>
        </div>

        <div className="hud-actions">
          <button disabled={!canStartJ} onClick={() => startReaction("J")}>
            START J
          </button>
          <button disabled={!canStart7} onClick={() => startReaction("7")}>
            START 7
          </button>
          <button
            className="secondary"
            onClick={() => {
              setCounts(Object.fromEntries(PLAYERS.map(p => [p, 0])));
              setStats(Object.fromEntries(PLAYERS.map(p => [p, { reactionsLost: 0 }])));

              setDeck(buildDeck());
              setIndex(0);
              setCard(null);
              setTurn(null);
              setThumbHolder(null);
              setHeavenHolder(null);
              setReactionType(null);
              setLastLoser(null);
            }}
          >
            RESET GAME
          </button>
        </div>
      </div>
    </div>
  );
}
