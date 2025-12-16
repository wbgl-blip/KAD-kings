import { useState } from "react";
import "./App.css";

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

  function drawCard() {
    if (cardsLeft === 0) return;
    setCardsLeft(cardsLeft - 1);
    setCardText("🍺 Rule happens 🍺");
  }

  function addBeer(index) {
    const updated = [...players];
    updated[index].beers += 1;
    setPlayers(updated);
  }

  const renderPlayer = (player, index) => (
    <div className="player">
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="beers">🍺 {player.beers}</div>
      <button onClick={() => addBeer(index)}>+1 Beer</button>
    </div>
  );

  return (
    <div className="table">
      <h1 className="title">KAD Kings</h1>

      {/* TOP */}
      <div className="row top">
        {players.slice(0, 2).map(renderPlayer)}
      </div>

      {/* MIDDLE */}
      <div className="middle">
        <div className="column left">
          {players.slice(2, 4).map(renderPlayer)}
        </div>

        <div className="deck">
          <div className="card">
            {cardText.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          <button className="draw" onClick={drawCard}>
            DRAW CARD
          </button>

          <div className="cards-left">
            Cards Left: {cardsLeft} / 52
          </div>
        </div>

        <div className="column right">
          {players.slice(4, 6).map(renderPlayer)}
        </div>
      </div>
    </div>
  );
}
