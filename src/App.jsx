import { useState } from "react";
import "./App.css";

/* =========================
   CARD DATA
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank });
    });
  });
  return shuffle(deck);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/* =========================
   RULES (TOXIC EDITION)
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. Nobody stops until the weak fold.";
    case "2": return "You. Point at a victim. They drink.";
    case "3": return "Me. Suffer alone.";
    case "4": return "Whores. Everyone drinks. No excuses.";
    case "5": return "Guys drink. Sorry lads.";
    case "6": return "Dicks. Everyone drinks again.";
    case "7": return "Heaven. Last hand up gets punished.";
    case "8": return "Mate. Pick a ride-or-die drink slave.";
    case "9": return "Rhyme. Hesitate = hydrate (booze).";
    case "10": return "Categories. Brain lag = drink.";
    case "J": return "Thumb Master. Miss it? Drink.";
    case "Q": return "Question Master. Answer? Drink.";
    case "K": return "Make a rule. Abuse this power.";
    default: return "";
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

  const [heaven, setHeaven] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  /* =========================
     SETUP
  ========================= */
  function addPlayer() {
    if (!nameInput.trim()) return;
    setPlayers([...players, { name: nameInput, drinks: 0 }]);
    setNameInput("");
  }

  function startGame() {
    if (players.length < 2) return;
    setDeck(buildDeck());
    setDiscard([]);
    setTurn(0);
    setGameOver(false);
    setHeaven(null);
    setThumbMaster(null);
    setQuestionMaster(null);
  }

  /* =========================
     DRAW
  ========================= */
  function drawCard() {
    if (deck.length === 0) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    const updatedPlayers = [...players];
    updatedPlayers[turn].drinks += 1;

    if (card.rank === "7") setHeaven(players[turn].name);
    if (card.rank === "J") setThumbMaster(players[turn].name);
    if (card.rank === "Q") setQuestionMaster(players[turn].name);

    setPlayers(updatedPlayers);
    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (nextDeck.length === 0) {
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
    <div className="app">
      <h1>KAD Kings</h1>

      {/* SETUP */}
      {deck.length === 0 && !gameOver && (
        <div className="setup">
          <input
            value={nameInput}
            placeholder="Add degenerate"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add</button>

          <ul>
            {players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>

          <button className="start" onClick={startGame}>
            Start the Chaos
          </button>
        </div>
      )}

      {/* GAME */}
      {deck.length > 0 && !gameOver && (
        <>
          <h2>
            Turn: <span className="active">{players[turn].name}</span>
          </h2>

          <div className="roles">
            <p>👼 Heaven: {heaven || "—"}</p>
            <p>👍 Thumb Master: {thumbMaster || "—"}</p>
            <p>❓ Question Master: {questionMaster || "—"}</p>
          </div>

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <p className="count">Cards left: {deck.length}</p>

          {currentCard && (
            <div className="card flip">
              <div className="card-inner">
                <div className="card-front">
                  <div className="corner top">
                    {currentCard.rank}{currentCard.suit}
                  </div>
                  <div className="center">
                    {currentCard.suit}
                  </div>
                  <div className="corner bottom">
                    {currentCard.rank}{currentCard.suit}
                  </div>
                  <div className="rule">
                    {getRuleText(currentCard.rank)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <h3>Drinks Taken</h3>
          <ul className="scores">
            {players.map((p, i) => (
              <li key={i} className={i === turn ? "active" : ""}>
                {p.name}: {p.drinks}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* GAME OVER */}
      {gameOver && (
        <div className="game-over">
          <h2>Deck Empty</h2>
          <p>You animals actually survived.</p>

          <ol>
            {[...players]
              .sort((a, b) => b.drinks - a.drinks)
              .map((p, i) => (
                <li key={i}>
                  {p.name} — {p.drinks} drinks
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
