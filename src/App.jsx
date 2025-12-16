import { useState } from "react"; import "./styles.css";

export default function App() { const [players, setPlayers] = useState([ { name: "Beau", beers: 0 }, { name: "Mike", beers: 0 }, { name: "Jess", beers: 0 }, { name: "Alex", beers: 0 }, { name: "Emily", beers: 0 }, { name: "Sean", beers: 0 }, ]);

const [cardsLeft, setCardsLeft] = useState(52); const [cardText, setCardText] = useState("Draw a card"); const [cardSubtext, setCardSubtext] = useState("No mercy"); const [currentPlayer, setCurrentPlayer] = useState(0);

function drawCard() { if (cardsLeft === 0) return;

setCardsLeft(cardsLeft - 1);
setCardText("Rule Happens");
setCardSubtext("Everyone watches closely 👀");

setCurrentPlayer((prev) => (prev + 1) % players.length);

}

function addBeer(index) { const updated = [...players]; updated[index].beers += 1; setPlayers(updated); }

return ( <div className="app"> <h1 className="title">KAD Kings</h1>

<div className="table">
    {players.map((p, i) => (
      <div
        key={i}
        className={`player ${i === currentPlayer ? "active" : ""}`}
      >
        <div className="avatar" />
        <div className="name">{p.name}</div>
        <div className="beers">🍺 {p.beers}</div>
        <button onClick={() => addBeer(i)}>+1 Beer</button>
      </div>
    ))}

    <div className="deck">
      <div className="card">
        <div className="card-title">{cardText}</div>
        <div className="card-subtitle">{cardSubtext}</div>
      </div>

      <div className="turn-text">
        {players[currentPlayer].name}'s turn. No backing out.
      </div>

      <button className="draw-btn" onClick={drawCard}>
        DRAW CARD
      </button>
      <div className="cards-left">Cards Left: {cardsLeft} / 52</div>
    </div>
  </div>
</div>

); }
