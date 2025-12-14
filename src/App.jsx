import { useState } from "react";
import "./App.css";

const SUITS = ["♦", "♥", "♣", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (let s of SUITS) {
    for (let r of RANKS) {
      deck.push({ suit: s, rank: r });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function ruleText(rank) {
  switch (rank) {
    case "4":
      return "Whores — we all drink";
    case "7":
      return "Heaven — last drinks";
    case "J":
      return "Thumb Master";
    case "Q":
      return "Questions";
    case "K":
      return "King — add to the pile";
    default:
      return "Drink.";
  }
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "yu", beers: 1 },
    { name: "uuu", beers: 0 },
    { name: "uu", beers: 0 },
  ]);

  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [powers, setPowers] = useState({
    heaven: null,
    thumb: null,
    questions: null,
  });

  function drawCard() {
    if (deck.length === 0) return;

    const nextCard = deck[0];
    const currentPlayer = players[turn].name;

    // assign powers
    if (nextCard.rank === "7") {
      setPowers((p) => ({ ...p, heaven: currentPlayer }));
    }
    if (nextCard.rank === "J") {
      setPowers((p) => ({ ...p, thumb: currentPlayer }));
    }
    if (nextCard.rank === "Q") {
      setPowers((p) => ({ ...p, questions: currentPlayer }));
    }

    setCard(nextCard);
    setDeck((d) => d.slice(1));
    setTurn((t) => (t + 1) % players.length);
  }

  function changeBeer(index, delta) {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, beers: Math.max(0, p.beers + delta) }
          : p
      )
    );
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="game">
        <div className="players">
          {players.map((p, i) => (
            <div
              key={i}
              className={`player ${i === turn ? "active" : ""}`}
            >
              <div className="name">{p.name}</div>

              <div className="beer-row">
                <button onClick={() => changeBeer(i, -1)}>−</button>
                <span>🍺 {p.beers}</span>
                <button onClick={() => changeBeer(i, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="card-zone">
          {card && (
            <div className="card">
              <div className="corner top">
                {card.rank}
                {card.suit}
              </div>

              <div className="center">
                <div className="suit">{card.suit}</div>
                <div className="rule">{ruleText(card.rank)}</div>
              </div>

              <div className="corner bottom">
                {card.rank}
                {card.suit}
              </div>
            </div>
          )}

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <div className="left">Cards left: {deck.length}</div>

          <div className="powers">
            😇 Heaven: {powers.heaven ?? "—"}<br />
            👍 Thumb: {powers.thumb ?? "—"}<br />
            ❓ Questions: {powers.questions ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
