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

  return (
    <div className="app">
      <h1 className="title">KAD Kings</h1>

      <div className="table">
        <div className="players top">
          {players.slice(0, 2).map((p, i) => (
            <Player key={i} player={p} onDrink={() => addBeer(i)} />
          ))}
        </div>

        <div className="players left">
          {players.slice(2, 4).map((p, i) => (
            <Player key={i} player={p} onDrink={() => addBeer(i + 2)} />
          ))}
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
          <div className="counter">Cards Left: {cardsLeft} / 52</div>
        </div>

        <div className="players right">
          {players.slice(4, 6).map((p, i) => (
            <Player key={i} player={p} onDrink={() => addBeer(i + 4)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Player({ player, onDrink }) {
  return (
    <div className="player">
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="beers">🍺 {player.beers}</div>
      <button onClick={onDrink}>+1 Beer</button>
    </div>
  );
}
