import { useState } from "react";
import "./styles.css";

/* =========================
   CARD SETUP
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank });
    });
  });
  return shuffle(deck);
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

/* =========================
   RULE TEXT
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. No mercy.";
    case "2": return "You choose who suffers.";
    case "3": return "Drink it. Yes, you.";
    case "4": return "Everyone drinks. Cry later.";
    case "5": return "Guys drink. Sorry.";
    case "6": return "All drink. Society collapses.";
    case "7": return "Heaven. Last hand up drinks.";
    case "8": return "Mate. You’re bonded now.";
    case "9": return "Rhyme. Fail = drink.";
    case "10": return "Categories. Brain cells optional.";
    case "J": return "Thumb Master. Abuse responsibly.";
    case "Q": return "Question Master. Annoy everyone.";
    case "K": return "Make a rule. Ruin lives.";
    default: return "";
  }
}

/* =========================
   APP
========================= */
export default function App() {
  const [players, setPlayers] = useState([
    { name: "Player 1", beers: 0 },
    { name: "Player 2", beers: 0 },
    { name: "Player 3", beers: 0 },
    { name: "Player 4", beers: 0 },
    { name: "Player 5", beers: 0 },
    { name: "Player 6", beers: 0 }
  ]);

  const [deck, setDeck] = useState(buildDeck());
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [heaven, setHeaven] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  function drawCard() {
    if (deck.length === 0) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    if (card.rank === "7") setHeaven(players[turn].name);
    if (card.rank === "J") setThumbMaster(players[turn].name);
    if (card.rank === "Q") setQuestionMaster(players[turn].name);

    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (nextDeck.length === 0) {
      setGameOver(true);
    } else {
      setTurn((turn + 1) % players.length);
    }
  }

  function adjustBeer(index, delta) {
    const updated = [...players];
    updated[index].beers = Math.max(0, updated[index].beers + delta);
    setPlayers(updated);
  }

  const currentCard = discard[discard.length - 1];

  if (gameOver) {
    return (
      <div className="app">
        <h1>Game Over</h1>
        <ol className="leaderboard">
          {[...players]
            .sort((a, b) => b.beers - a.beers)
            .map((p, i) => (
              <li key={i}>
                🏅 {p.name} — {p.beers} beers
              </li>
            ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="roles">
        <span>👼 Heaven: {heaven || "—"}</span>
        <span>👍 Thumb: {thumbMaster || "—"}</span>
        <span>❓ Question: {questionMaster || "—"}</span>
      </div>

      <div className="table">
        <div className="side left">
          {players.slice(0, 3).map((p, i) => (
            <div
              key={i}
              className={`player ${turn === i ? "active" : ""}`}
            >
              <strong>{p.name}</strong>
              <div className="beer-controls">
                <button onClick={() => adjustBeer(i, -1)}>-</button>
                <span>{p.beers} 🍺</span>
                <button onClick={() => adjustBeer(i, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="center">
          <div className="deck" />
          {currentCard && (
            <div className="card">
              <div className="rank">{currentCard.rank}</div>
              <div className="suit">{currentCard.suit}</div>
              <div className="rule">{getRuleText(currentCard.rank)}</div>
            </div>
          )}
          <button className="draw-btn" onClick={drawCard}>
            Draw Card
          </button>
          <div className="count">{deck.length} cards left</div>
        </div>

        <div className="side right">
          {players.slice(3, 6).map((p, i) => {
            const index = i + 3;
            return (
              <div
                key={index}
                className={`player ${turn === index ? "active" : ""}`}
              >
                <strong>{p.name}</strong>
                <div className="beer-controls">
                  <button onClick={() => adjustBeer(index, -1)}>-</button>
                  <span>{p.beers} 🍺</span>
                  <button onClick={() => adjustBeer(index, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
