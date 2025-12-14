import { useState } from "react";
import "./App.css";

/* =========================
   CARD SETUP
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function shuffle(deck) {
  return [...deck].sort(() => Math.random() - 0.5);
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
    case "A": return "Waterfall — everyone drinks";
    case "2": return "You — pick someone to drink";
    case "3": return "Me — you drink";
    case "4": return "Whores — we all drink";
    case "5": return "Guys drink";
    case "6": return "Dicks — we all drink";
    case "7": return "Heaven — last hand up drinks";
    case "8": return "Mate — pick a drinking buddy";
    case "9": return "Rhyme — loser drinks";
    case "10": return "Categories — loser drinks";
    case "J": return "Thumb Master";
    case "Q": return "Question Master";
    case "K": return "Make a rule";
    default: return "";
  }
}

/* =========================
   MEDAL LADDER
========================= */
const MEDAL_LADDER = [
  {
    min: 0,
    max: 1,
    title: "Hydration Enthusiast",
    roast: "This was a drinking game. You opted out."
  },
  {
    min: 2,
    max: 3,
    title: "Tourist",
    roast: "Visited the chaos. Refused to participate."
  },
  {
    min: 4,
    max: 5,
    title: "Socially Acceptable",
    roast: "Bare minimum effort detected."
  },
  {
    min: 6,
    max: 7,
    title: "Menace to Sobriety",
    roast: "A measurable threat to the beer supply."
  },
  {
    min: 8,
    max: 9,
    title: "Walking Poor Decision",
    roast: "Every choice tonight was optional."
  },
  {
    min: 10,
    max: 12,
    title: "Absolute Disasterpiece",
    roast: "Impressive. Concerning. Memorable."
  },
  {
    min: 13,
    max: Infinity,
    title: "The Problem™",
    roast: "Every story tomorrow starts with you."
  }
];

function getMedalForBeers(beers) {
  return MEDAL_LADDER.find(
    medal => beers >= medal.min && beers <= medal.max
  );
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

  // Persistent roles
  const [heaven, setHeaven] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

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
    setHeaven(null);
    setThumbMaster(null);
    setQuestionMaster(null);
  }

  /* =========================
     GAMEPLAY
  ========================= */
  function drawCard() {
    if (deck.length === 0) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    // Handle persistent roles
    if (card.rank === "7") setHeaven(players[turn].name);
    if (card.rank === "J") setThumbMaster(players[turn].name);
    if (card.rank === "Q") setQuestionMaster(players[turn].name);

    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (nextDeck.length === 0) {
      setGameOver(true);
    } else {
      setTurn((turn + 1) % players.length);
    }
  }

  function addBeer(index) {
    const updated = [...players];
    updated[index].beers += 1;
    setPlayers(updated);
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
            placeholder="Player name"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add Player</button>

          <ul className="player-list">
            {players.map((p, i) => (
              <li key={i}>{p.name}</li>
            ))}
          </ul>

          <button className="start" onClick={startGame}>
            Start Game
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
            <p>👍 Thumb: {thumbMaster || "—"}</p>
            <p>❓ Question: {questionMaster || "—"}</p>
          </div>

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <p>Cards left: {deck.length}</p>

          {currentCard && (
            <div className="card">
              <div className="rank">{currentCard.rank}</div>
              <div className="suit">{currentCard.suit}</div>
              <div className="rule">
                {getRuleText(currentCard.rank)}
              </div>
            </div>
          )}

          <h3>Beers</h3>
          <ul className="scores">
            {players.map((p, i) => (
              <li key={i} className={i === turn ? "active" : ""}>
                {p.name}: {p.beers}
                <button onClick={() => addBeer(i)}>+1 🍺</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* END GAME */}
      {gameOver && (
        <div className="game-over">
          <h2>🍺 Final Judgment 🍺</h2>

          <ol className="leaderboard">
            {[...players]
              .sort((a, b) => b.beers - a.beers)
              .map((p, i) => {
                const medal = getMedalForBeers(p.beers);
                return (
                  <li key={i}>
                    <strong>{p.name}</strong> — {p.beers} beers  
                    <div>🏅 {medal.title}</div>
                    <div className="roast">{medal.roast}</div>
                  </li>
                );
              })}
          </ol>

          <p className="footer-roast">
            No lessons were learned. Same time next week.
          </p>
        </div>
      )}
    </div>
  );
}
