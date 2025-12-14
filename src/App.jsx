import { useState } from "react";
import "./App.css";

/* =========================
   CARD SETUP
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

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

/* =========================
   RULE TEXT
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall – everyone drinks";
    case "2": return "You – pick someone to drink";
    case "3": return "Me – you drink";
    case "4": return "Whores – we all drink";
    case "5": return "Guys drink";
    case "6": return "Dicks – we all drink";
    case "7": return "Heaven – last hand up drinks";
    case "8": return "Mate – pick a drinking buddy";
    case "9": return "Rhyme – loser drinks";
    case "10": return "Categories – loser drinks";
    case "J": return "Thumb Master";
    case "Q": return "Question Master";
    case "K": return "Make a rule";
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

  function drawCard() {
    if (deck.length === 0) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    const updatedPlayers = [...players];
    updatedPlayers[turn].drinks += 1;

    if (card.rank === "7") setHeaven(updatedPlayers[turn].name);
    if (card.rank === "J") setThumbMaster(updatedPlayers[turn].name);
    if (card.rank === "Q") setQuestionMaster(updatedPlayers[turn].name);

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
  const isRed =
    currentCard &&
    (currentCard.suit === "♥" || currentCard.suit === "♦");

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {deck.length === 0 && !gameOver && (
        <div className="setup">
          <input
            value={nameInput}
            placeholder="Player name"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add Player</button>

          <ul>
            {players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>

          <button onClick={startGame}>Start Game</button>
        </div>
      )}

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

          <p>Cards left: {deck.length}</p>

          {currentCard && (
            <div
              key={discard.length}
              className={`card ${isRed ? "red" : "black"}`}
            >
              <div className="corner top">
                {currentCard.rank}
                <span>{currentCard.suit}</span>
              </div>

              <div className="corner bottom">
                {currentCard.rank}
                <span>{currentCard.suit}</span>
              </div>

              <div className="center-suit">
                {currentCard.suit}
              </div>

              <div className="rule-box">
                {getRuleText(currentCard.rank)}
              </div>
            </div>
          )}

          <h3>Drinks</h3>
          <ul>
            {players.map((p, i) => (
              <li key={i} className={i === turn ? "active" : ""}>
                {p.name}: {p.drinks}
              </li>
            ))}
          </ul>
        </>
      )}

      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
        </div>
      )}
    </div>
  );
}
