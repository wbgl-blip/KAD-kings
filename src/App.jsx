import { useState } from "react";
import "./styles.css";

const RULES = {
  A: ["Waterfall", "Everyone drinks"],
  K: ["King", "Add to the cup"],
  Q: ["Question Master", "Ask or drink"],
  J: ["Thumb Master", "Last thumb drinks"],
  "10": ["Categories", "Fail = drink"],
  "9": ["Bust a rhyme", "Mess up = drink"],
  "8": ["Mate", "Pick a drinking buddy"],
  "7": ["Heaven", "Last hand drinks"],
  "6": ["Dicks", "Guys drink"],
  "5": ["Thumbs", "Last thumb drinks"],
  "4": ["Whores", "Girls drink"],
  "3": ["Me", "You drink"],
  "2": ["You", "Give drinks"]
};

const createDeck = () => {
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  let deck = [];
  ranks.forEach(r => {
    for (let i = 0; i < 4; i++) deck.push(r);
  });
  return deck.sort(() => Math.random() - 0.5);
};

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Beau", beers: 3 },
    { name: "Mike", beers: 5 },
    { name: "Jess", beers: 2 },
    { name: "Alex", beers: 7 },
    { name: "Emily", beers: 4 },
    { name: "Sean", beers: 7 },
    { name: "Tom", beers: 1 },
    { name: "Natalie", beers: 5 }
  ]);

  const [deck, setDeck] = useState(createDeck());
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const drawCard = () => {
    if (deck.length === 0) return;
    const next = deck[0];
    setDeck(deck.slice(1));
    setCard(next);
    setTurn((turn + 1) % players.length);
  };

  const addBeer = (i) => {
    setPlayers(players.map((p, idx) =>
      idx === i ? { ...p, beers: p.beers + 1 } : p
    ));
  };

  const rule = card ? RULES[card] : null;

  return (
    <div className="app">
      <div className="title">KINGS</div>

      <div className="board">
        {players.map((p, i) => (
          <div
            key={i}
            className={`player ${i === turn ? "active" : ""}`}
          >
            <div className="avatar" />
            <div className="name">{p.name}</div>
            <div className="beers">🍺 {p.beers}</div>
            <button className="beer-btn" onClick={() => addBeer(i)}>
              +1 Beer
            </button>
          </div>
        ))}

        <div className="center">
          {card ? (
            <>
              <div className="card-rank">{card}</div>
              <div className="card-rule">{rule[0]}</div>
              <div className="card-sub">{rule[1]}</div>
            </>
          ) : (
            <>
              <div className="card-rule">Draw a card</div>
              <div className="card-sub">No mercy</div>
            </>
          )}
        </div>

        <div className="draw-wrap">
          <button className="draw-btn" onClick={drawCard}>
            DRAW CARD
          </button>
          <div className="cards-left">
            Cards Left: {deck.length} / 52
          </div>
        </div>
      </div>
    </div>
  );
}
