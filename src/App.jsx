import { useState } from "react";
import "./styles.css";

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Beau", beers: 0 },
    { name: "Mike", beers: 0 },
    { name: "Jess", beers: 0 },
    { name: "Alex", beers: 0 },
    { name: "Emily", beers: 0 },
    { name: "Sean", beers: 0 },
  ]);

  const [cardsLeft, setCardsLeft] = useState(52);
  const [cardText, setCardText] = useState("Draw a card\nNo mercy");

  const positions = [
    { gridColumn: 1, gridRow: 1 },
    { gridColumn: 2, gridRow: 1 },
    { gridColumn: 3, gridRow: 1 },
    { gridColumn: 1, gridRow: 2 },
    { gridColumn: 3, gridRow: 2 },
    { gridColumn: 1, gridRow: 3 },
    { gridColumn: 2, gridRow: 3 },
    { gridColumn: 3, gridRow: 3 },
  ];

  function drawCard() {
    if (cardsLeft === 0) return;
    setCardsLeft(cardsLeft - 1);
    setCardText("No mercy 😈\nDrink wisely");
  }

  function addBeer(index) {
    const updated = [...players];
    updated[index].beers += 1;
    setPlayers(updated);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="table">
        {players.slice(0, 8).map((player, i) => (
          <div
            key={player.name}
            className="player"
            style={positions[i]}
          >
            <div className="avatar" />
            <div className="name">{player.name}</div>
            <div className="beers">🍺 {player.beers}</div>
            <button onClick={() => addBeer(i)}>+1 Beer</button>
          </div>
        ))}

        <div
          className="card"
          style={{ gridColumn: 2, gridRow: 2 }}
        >
          <div className="card-text">
            {cardText.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      <button className="draw-button" onClick={drawCard}>
        DRAW CARD
      </button>

      <div className="cards-left">
        Cards Left: {cardsLeft} / 52
      </div>
    </div>
  );
}
