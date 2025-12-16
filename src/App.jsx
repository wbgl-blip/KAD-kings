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

  // Explicit table positions (no guessing, no chaos)
  const seatMap = [
    { col: 1, row: 1 }, // Beau
    { col: 2, row: 1 }, // Mike
    { col: 3, row: 1 }, // Jess
    { col: 1, row: 2 }, // Alex
    { col: 3, row: 2 }, // Emily
    { col: 2, row: 3 }, // Sean (BOTTOM CENTER)
  ];

  function drawCard() {
    if (cardsLeft === 0) return;
    setCardsLeft(cardsLeft - 1);
    setCardText("No mercy 😈\nDrink wisely");
  }

  function addBeer(index) {
    const copy = [...players];
    copy[index].beers += 1;
    setPlayers(copy);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="table">
        {players.map((player, i) => (
          <div
            key={player.name}
            className="player"
            style={{
              gridColumn: seatMap[i].col,
              gridRow: seatMap[i].row,
            }}
          >
            <div className="avatar" />
            <div className="name">{player.name}</div>
            <div className="beers">🍺 {player.beers}</div>
            <button onClick={() => addBeer(i)}>+1 Beer</button>
          </div>
        ))}

        <div className="card">
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
