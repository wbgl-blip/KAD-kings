import { useState, useMemo } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];
const DECK_SIZE = 52;

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}

function medalFor(beers, isTop) {
  if (beers === 0) return { tier: "shame", title: "Hydration Specialist", copy: "Why are you here?" };
  if (isTop && beers >= 10) return { tier: "legendary", title: "Menace to Sobriety", copy: "Single-handedly responsible for the group’s decline." };
  if (beers >= 7) return { tier: "gold", title: "Certified Liability", copy: "We knew this would happen." };
  if (beers >= 4) return { tier: "silver", title: "Social Drinker", copy: "Present, but not committed." };
  return { tier: "bronze", title: "Designated Observer", copy: "Are you even playing?" };
}

export default function App() {
  const [counts, setCounts] = useState(Object.fromEntries(PLAYERS.map(p => [p, 0])));
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(null);

  // sticky powers
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  // reactions
  const [reactionType, setReactionType] = useState(null);
  const [reactionStart, setReactionStart] = useState(null);
  const [reactions, setReactions] = useState({});
  const [lastLoser, setLastLoser] = useState(null);

  const gameOver = index >= DECK_SIZE;

  function addBeer(name) {
    setCounts(c => ({ ...c, [name]: c[name] + 1 }));
  }

  function drawCard() {
    if (gameOver) return;
    const drawn = deck[index];
    setCard(drawn);
    setIndex(i => i + 1);
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
      const next = { ...r, [name]: time };
      if (Object.keys(next).length === PLAYERS.length) {
        const loser = Object.entries(next).sort((a,b) => b[1]-a[1])[0][0];
        addBeer(loser);
        setLastLoser(loser);
        setReactionType(null);
        setReactionStart(null);
      }
      return next;
    });
  }

  const medalResults = useMemo(() => {
    if (!gameOver) return [];
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const topBeers = sorted[0][1];
    return sorted.map(([name, beers], i) => ({
      name,
      beers,
      ...medalFor(beers, beers === topBeers && i === 0)
    }));
  }, [gameOver, counts]);

  function resetGame() {
    setCounts(Object.fromEntries(PLAYERS.map(p => [p, 0])));
    setDeck(buildDeck());
    setIndex(0);
    setCard(null);
    setTurn(null);
    setThumbHolder(null);
    setHeavenHolder(null);
    setReactionType(null);
    setLastLoser(null);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="player-grid">
        {PLAYERS.map(name => (
          <div
            key={name}
            className={`player ${turn === name ? "active" : ""} ${reactionType ? "reactable" : ""} ${lastLoser === name ? "loser" : ""}`}
            onClick={() => reactionType ? react(name) : setTurn(name)}
          >
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {counts[name]}</div>
            <button className="beer" onClick={e => { e.stopPropagation(); addBeer(name); }}>
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      <div className="hud">
        <div className={`hud-deck ${reactionType ? "flash" : ""}`}>
          <button className="draw-slim" onClick={drawCard}>DRAW</button>
          <div className="deck-side">
            <div className="deck-rank">{card || "Draw"}</div>
            <div className="deck-sub">{DECK_SIZE - index} left</div>
          </div>
        </div>

        <div className="hud-actions">
          <button disabled={turn !== thumbHolder} onClick={() => startReaction("J")}>START J</button>
          <button disabled={turn !== heavenHolder} onClick={() => startReaction("7")}>START 7</button>
        </div>
      </div>

      {gameOver && (
        <div className="endgame">
          <div className="endcard">
            <h2>🏁 Game Over</h2>
            {medalResults.map(r => (
              <div key={r.name} className={`medal ${r.tier}`}>
                <strong>{r.title}</strong>
                <div>{r.name} — {r.beers} beers</div>
                <small>{r.copy}</small>
              </div>
            ))}
            <button className="play-again" onClick={resetGame}>PLAY AGAIN</button>
          </div>
        </div>
      )}
    </div>
  );
}
