import { useState, useEffect } from "react";
import "./App.css";

/* =========================
   CARD DATA
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit =>
    RANKS.forEach(rank => deck.push({ suit, rank }))
  );
  return shuffle(deck);
}

/* =========================
   RULES
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. Everyone drinks.";
    case "2": return "You. Choose a victim.";
    case "3": return "Me. You drink.";
    case "4": return "Whores. Everyone drinks.";
    case "5": return "Guys drink.";
    case "6": return "Dicks. Everyone drinks again.";
    case "7": return "Heaven. Last hand up drinks.";
    case "8": return "Mate. Pick a drinking buddy.";
    case "9": return "Rhyme. Brain lag = drink.";
    case "10": return "Categories. Think fast.";
    case "J": return "Thumb Master.";
    case "Q": return "Question Master.";
    case "K": return "Make a rule. Abuse it.";
    default: return "";
  }
}

/* =========================
   MEDALS
========================= */
function getNewMedals(player) {
  const medals = [];
  if (player.beers === 5) medals.push("Warm-Up Wreck");
  if (player.beers === 10) medals.push("Certified Liability");
  if (player.beers === 15) medals.push("Menace to Sobriety");
  if (player.beers === 20) medals.push("Walking Bad Decision");
  if (player.beers === 25) medals.push("Public Health Emergency");
  return medals;
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

  const [popup, setPopup] = useState(null);

  /* =========================
     SETUP
  ========================= */
  function addPlayer() {
    if (!nameInput.trim()) return;
    setPlayers([
      ...players,
      { name: nameInput, beers: 0, medals: [] }
    ]);
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
    const updatedPlayers = [...players];
    const current = updatedPlayers[turn];

    // Roles
    if (card.rank === "7") setHeaven(current.name);
    if (card.rank === "J") setThumbMaster(current.name);
    if (card.rank === "Q") setQuestionMaster(current.name);

    setPlayers(updatedPlayers);
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

    const newMedals = getNewMedals(updated[index]);
    if (newMedals.length) {
      updated[index].medals.push(...newMedals);
      setPopup({ player: updated[index].name, medal: newMedals[0] });
    }

    setPlayers(updated);
  }

  useEffect(() => {
    if (popup) {
      const t = setTimeout(() => setPopup(null), 2500);
      return () => clearTimeout(t);
    }
  }, [popup]);

  const currentCard = discard[discard.length - 1];

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {popup && (
        <div className="medal-popup">
          <h2>{popup.player}</h2>
          <span>{popup.medal}</span>
        </div>
      )}

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

          <div className="roles">
            <p>👼 Heaven: {heaven || "—"}</p>
            <p>👍 Thumb: {thumbMaster || "—"}</p>
            <p>❓ Questions: {questionMaster || "—"}</p>
          </div>

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
                <button onClick={() => addBeer(i)}>+1</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {gameOver && (
        <div className="game-over">
          <h2>Deck Empty</h2>
          {players
            .sort((a, b) => b.beers - a.beers)
            .map((p, i) => (
              <div key={i} className="medal-card">
                <h3>{p.name} — 🍺 {p.beers}</h3>
                <div className="medals">
                  {p.medals.map((m, j) => (
                    <span key={j} className="medal">{m}</span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
