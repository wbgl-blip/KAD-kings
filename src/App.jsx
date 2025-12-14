import { useState } from "react";
import "./App.css";

/* =========================
   CARD SETUP
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank });
    });
  });
  return shuffle(deck);
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

export default function App() {
  const [players, setPlayers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Persistent roles
  const [heaven, setHeaven] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

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
    setHeaven(null);
    setThumbMaster(null);
    setQuestionMaster(null);
  }

  function drawCard() {
    if (deck.length === 0) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    const updatedPlayers = [...players];
    updatedPlayers[turn].beers += 1;

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

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* SETUP */}
      {deck.length === 0 && !gameOver && (
        <div className="setup">
          <input
            value={nameInput}
            placeholder="Player name"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add Player</button>

          <div className="player-grid">
            {players.map((p, i) => (
              <div key={i} className="player-card">
                {p.name}
              </div>
            ))}
          </div>

          <button className="start" onClick={startGame}>
            Start Game
          </button>
        </div>
      )}

      {/* GAME */}
      {deck.length > 0 && !gameOver && (
        <>
          <div className="table">
            <div className="player-grid">
              {players.map((p, i) => (
                <div
                  key={i}
                  className={`player-card ${i === turn ? "active" : ""}`}
                >
                  <div className="player-name">{p.name}</div>
                  <div className="beer-count">🍺 {p.beers}</div>
                </div>
              ))}
            </div>

            <div className="card-area">
              <button className="draw" onClick={drawCard}>
                Draw Card
              </button>

              {currentCard && (
                <div className="card">
                  <div className="rank">{currentCard.rank}</div>
                  <div className="suit">{currentCard.suit}</div>
                  <div className="rule">
                    {getRuleText(currentCard.rank)}
                  </div>
                </div>
              )}

              <p className="cards-left">Cards left: {deck.length}</p>
            </div>
          </div>

          <div className="roles">
            <span>👼 Heaven: {heaven || "—"}</span>
            <span>👍 Thumb: {thumbMaster || "—"}</span>
            <span>❓ Questions: {questionMaster || "—"}</span>
          </div>
        </>
      )}

      {/* GAME OVER */}
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <ol>
            {[...players]
              .sort((a, b) => b.beers - a.beers)
              .map((p, i) => (
                <li key={i}>
                  {p.name} — {p.beers} 🍺
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}
