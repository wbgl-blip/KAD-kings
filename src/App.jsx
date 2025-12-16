import { useState } from "react";
import "./styles.css";

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Beau", beers: 0 },
    { name: "Mike", beers: 0 },
    { name: "Jess", beers: 0 },
    { name: "Alex", beers: 0 },
    { name: "Emily", beers: 0 },
    { name: "Tom", beers: 0 },
    { name: "Sean", beers: 0 },
    { name: "Natalie", beers: 0 },
  ]);

  const [cardsLeft, setCardsLeft] = useState(52);
  const [card, setCard] = useState("Draw a card");

  const seatPositions = [
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    { col: 3, row: 1 },
    { col: 1, row: 2 },
    { col: 3, row: 2 },
    { col: 1, row: 3 },
    { col: 2, row: 3 },
    { col: 3, row: 3 },
  ];

  function drawCard() {
    if (cardsLeft === 0) return;
    setCardsLeft(cardsLeft - 1);
    setCard("A♠");
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
        {players.map((player, i) => (
          <div
            key={player.name}
            className="player"
            style={{
              gridColumn: seatPositions[i].col,
              gridRow: seatPositions[i].row,
            }}
          >
            <div className="avatar" />
            <div className="name">{player.name}</div>
            <div className="beers">🍺 {player.beers}</div>
            <button onClick={() => addBeer(i)}>+1 Beer</button>
          </div>
        ))}

        <div className="center">
          <div className="card">{card}</div>
          <button className="draw" onClick={drawCard}>
            DRAW CARD
          </button>
          <div className="cards-left">
            Cards Left: {cardsLeft} / 52
          </div>
        </div>
      </div>
    </div>
  );
}
