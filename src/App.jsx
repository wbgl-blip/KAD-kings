import { useState, useEffect } from "react";
import "./App.css";

/* =========================
   CARD DATA
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

const buildDeck = () => {
  const deck = [];
  SUITS.forEach(s => RANKS.forEach(r => deck.push({ suit: s, rank: r })));
  return shuffle(deck);
};

/* =========================
   RULE VARIANTS
========================= */
function getRuleText(rank) {
  const roll = Math.random();

  switch (rank) {
    case "A":
      return roll < 0.5
        ? "Waterfall. Everyone drinks."
        : "Reverse Waterfall. Last starts.";
    case "9":
      return roll < 0.5
        ? "Rhyme. Fail = drink."
        : "Freestyle rap or drink.";
    case "K":
      return roll < 0.5
        ? "Make a rule."
        : "Break a rule = double drinks.";
    case "4": return "Whores. Everyone drinks.";
    case "6": return "Dicks. Everyone drinks again.";
    case "7": return "Heaven. Last hand up drinks.";
    case "J": return "Thumb Master.";
    case "Q": return "Question Master.";
    default:
      return "Drink and suffer.";
  }
}

/* =========================
   APP
========================= */
export default function App() {
  const [players, setPlayers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  /* POWER STACKING */
  const [powers, setPowers] = useState({
    heaven: null,
    thumb: null,
    question: null
  });

  /* SUDDEN DEATH */
  const [suddenDeath, setSuddenDeath] = useState(false);

  /* =========================
     SETUP
  ========================= */
  function addPlayer() {
    if (!nameInput.trim()) return;
    setPlayers([...players, { name: nameInput, beers: 0 }]);
    setNameInput("");
  }

  function startGame() {
    if (players.length < 2) return;
    setDeck(buildDeck());
    setDiscard([]);
    setTurn(0);
    setGameOver(false);
    setPowers({ heaven: null, thumb: null, question: null });
    setSuddenDeath(false);
  }

  /* =========================
     DRAW CARD
  ========================= */
  function drawCard() {
    if (!deck.length) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();
    const updatedPlayers = [...players];
    const current = updatedPlayers[turn];

    /* POWER STACKING LOGIC */
    if (card.rank === "7") setPowers(p => ({ ...p, heaven: current.name }));
    if (card.rank === "J") setPowers(p => ({ ...p, thumb: current.name }));
    if (card.rank === "Q") setPowers(p => ({ ...p, question: current.name }));

    /* SUDDEN DEATH TRIGGERS */
    if (nextDeck.length === 10) setSuddenDeath(true);

    /* BASE DRINK */
    current.beers += suddenDeath ? 2 : 1;

    setPlayers(updatedPlayers);
    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (!nextDeck.length) {
      setGameOver(true);
    } else {
      setTurn((turn + 1) % players.length);
    }
  }

  const currentCard = discard[discard.length - 1];

  /* =========================
     RENDER
  ========================= */
  return (
    <div className={`app ${suddenDeath ? "sudden" : ""}`}>
      <h1>KAD Kings</h1>

      {deck.length === 0 && !gameOver && (
        <div className="setup">
          <input
            value={nameInput}
            placeholder="Add degenerate"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add</button>

          <ul>
            {players.map((p, i) => <li key={i}>{p.name}</li>)}
          </ul>

          <button className="start" onClick={startGame}>
            Start the Disaster
          </button>
        </div>
      )}

      {deck.length > 0 && !gameOver && (
        <>
          <h2>
            Turn: <span className="active">{players[turn].name}</span>
          </h2>

          <div className="powers">
            <p>👼 Heaven: {powers.heaven || "—"}</p>
            <p>👍 Thumb: {powers.thumb || "—"}</p>
            <p>❓ Question: {powers.question || "—"}</p>
          </div>

          {suddenDeath && (
            <div className="sudden-banner">
              ⚠️ SUDDEN DEATH — DOUBLE DRINKS ⚠️
            </div>
          )}

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <p>Cards left: {deck.length}</p>

          {currentCard && (
            <div className="card active-card">
              <div className="corner top">
                {currentCard.rank}{currentCard.suit}
              </div>
              <div className="center">{currentCard.suit}</div>
              <div className="corner bottom">
                {currentCard.rank}{currentCard.suit}
              </div>
              <div className="rule">
                {getRuleText(currentCard.rank)}
              </div>
            </div>
          )}

          <ul className="scores">
            {players.map((p, i) => (
              <li key={i} className={i === turn ? "active" : ""}>
                {p.name} — 🍺 {p.beers}
              </li>
            ))}
          </ul>
        </>
      )}

      {gameOver && (
        <div className="game-over">
          <h2>Deck Empty</h2>
          <p>No winners. Only damage.</p>
          {players
            .sort((a, b) => b.beers - a.beers)
            .map((p, i) => (
              <p key={i}>
                {p.name} — 🍺 {p.beers}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
