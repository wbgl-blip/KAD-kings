import { useState } from "react";
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
   RULES (MAX DEGEN)
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. Weaklings die first.";
    case "2": return "You. Choose a victim.";
    case "3": return "Me. Suffer.";
    case "4": return "Whores. Everyone drinks. Yes, you too.";
    case "5": return "Guys drink. Cry about it.";
    case "6": return "Dicks. Everyone drinks again.";
    case "7": return "Heaven. Last hand up gets humiliated.";
    case "8": return "Mate. Pick a lifelong burden.";
    case "9": return "Rhyme. Brain lag = chug.";
    case "10": return "Categories. Think fast, idiot.";
    case "J": return "Thumb Master. Miss it, sip shame.";
    case "Q": return "Question Master. Answer = drink.";
    case "K": return "Make a rule. Abuse it.";
    default: return "";
  }
}

/* =========================
   MEDAL SYSTEM (TIERED)
========================= */
function calculateMedals(players) {
  return players.map(p => {
    const medals = [];

    if (p.drinks >= 5) medals.push({ tier: "bronze", name: "Warm-Up Wreck" });
    if (p.drinks >= 10) medals.push({ tier: "silver", name: "Certified Liability" });
    if (p.drinks >= 15) medals.push({ tier: "gold", name: "Menace to Sobriety" });
    if (p.drinks >= 20) medals.push({ tier: "mythic", name: "Walking Poor Decision" });
    if (p.drinks >= 25) medals.push({ tier: "forbidden", name: "Public Health Emergency" });

    if (p.drinks === Math.max(...players.map(x => x.drinks))) {
      medals.push({ tier: "legendary", name: "Final Boss of Bad Choices" });
    }

    return { ...p, medals };
  });
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
  const finalPlayers = gameOver ? calculateMedals(players) : players;

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
            {players.map((p, i) => <li key={i}>{p.name}</li>)}
          </ul>

          <button className="start" onClick={startGame}>
            Start the Disaster
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
            <p>❓ Questions: {questionMaster || "—"}</p>
          </div>

          <button className="draw" onClick={drawCard}>Draw Card</button>
          <p className="count">Cards left: {deck.length}</p>

          {currentCard && (
            <div className="card">
              <div className="corner top">{currentCard.rank}{currentCard.suit}</div>
              <div className="center">{currentCard.suit}</div>
              <div className="corner bottom">{currentCard.rank}{currentCard.suit}</div>
              <div className="rule">{getRuleText(currentCard.rank)}</div>
            </div>
          )}

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
          <p>No winners. Just survivors.</p>

          {finalPlayers
            .sort((a, b) => b.drinks - a.drinks)
            .map((p, i) => (
              <div key={i} className="medal-card">
                <h3>{p.name} — {p.drinks} drinks</h3>
                <div className="medals">
                  {p.medals.map((m, j) => (
                    <span key={j} className={`medal ${m.tier}`}>
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
