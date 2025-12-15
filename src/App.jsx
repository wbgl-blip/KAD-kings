import { useState } from "react";
import "./styles.css";

const INITIAL_PLAYERS = [
  { id: 1, name: "Player 1", beers: 0 },
  { id: 2, name: "Player 2", beers: 0 },
  { id: 3, name: "Player 3", beers: 0 },
];

const DECK = [
  { rank: "A", rule: "Waterfall" },
  { rank: "2", rule: "You drink" },
  { rank: "3", rule: "Me drink" },
  { rank: "4", rule: "Floor" },
  { rank: "5", rule: "Guys" },
  { rank: "6", rule: "Chicks" },
  { rank: "7", rule: "Heaven" },
  { rank: "8", rule: "Mate" },
  { rank: "9", rule: "Rhyme" },
  { rank: "10", rule: "Categories" },
  { rank: "J", rule: "Make a rule" },
  { rank: "Q", rule: "Question master" },
  { rank: "K", rule: "Pour into the King’s Cup" },
];

export default function App() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [deck, setDeck] = useState(shuffle([...DECK]));
  const [currentCard, setCurrentCard] = useState(null);

  function shuffle(cards) {
    return [...cards].sort(() => Math.random() - 0.5);
  }

  function drawCard() {
    if (deck.length === 0) return;
    const [next, ...rest] = deck;
    setCurrentCard(next);
    setDeck(rest);
    setCurrentPlayer((currentPlayer + 1) % players.length);
  }

  function addBeer(index) {
    setPlayers(players.map((p, i) =>
      i === index ? { ...p, beers: p.beers + 1 } : p
    ));
  }

  function updateName(index, name) {
    setPlayers(players.map((p, i) =>
      i === index ? { ...p, name } : p
    ));
  }

  return (
    <div className="app">
      <h1 className="title">KINGS</h1>

      <div className="players">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`player ${index === currentPlayer ? "active" : ""}`}
          >
            <input
              value={player.name}
              onChange={(e) => updateName(index, e.target.value)}
            />
            <div className="beers">🍺 {player.beers}</div>
            <button onClick={() => addBeer(index)}>+1 Beer</button>
          </div>
        ))}
      </div>

      <div className="card-area">
        {currentCard ? (
          <div className="card">
            <div className="rank">{currentCard.rank}</div>
            <div className="rule">{currentCard.rule}</div>
          </div>
        ) : (
          <div className="card placeholder">Draw a card</div>
        )}
      </div>

      <button className="draw-btn" onClick={drawCard}>
        Draw Card
      </button>
    </div>
  );
}
