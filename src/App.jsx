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
   MEDALS
========================= */
const MEDALS = {
  MENACE_TO_SOBRIETY: {
    name: "Menace to Sobriety",
    tier: "Epic",
    description: "Reached 10 drinks"
  },
  BLACKOUT_ARTIST: {
    name: "Blackout Artist",
    tier: "Legendary",
    description: "Reached 20 drinks"
  },
  RULE_TYRANT: {
    name: "Rule Tyrant",
    tier: "Rare",
    description: "Created 3 rules (Kings)"
  }
};

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

  const [medalPopup, setMedalPopup] = useState(null);

  /* =========================
     SETUP
  ========================= */
  function addPlayer() {
    if (!nameInput.trim()) return;
    setPlayers([...players, {
      name: nameInput,
      drinks: 0,
      kings: 0,
      medals: []
    }]);
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
     MEDAL CHECKS
  ========================= */
  function awardMedal(playerIndex, medalKey) {
    const updated = [...players];
    if (updated[playerIndex].medals.includes(medalKey)) return;

    updated[playerIndex].medals.push(medalKey);
    setPlayers(updated);
    setMedalPopup(MEDALS[medalKey]);

    setTimeout(() => setMedalPopup(null), 3000);
  }

  /* =========================
     DRAW CARD
  ========================= */
  function drawCard() {
    if (deck.length === 0 || gameOver) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    const updatedPlayers = [...players];
    const player = updatedPlayers[turn];

    player.drinks += 1;

    if (player.drinks === 10) awardMedal(turn, "MENACE_TO_SOBRIETY");
    if (player.drinks === 20) awardMedal(turn, "BLACKOUT_ARTIST");

    if (card.rank === "7") setHeaven(player.name);
    if (card.rank === "J") setThumbMaster(player.name);
    if (card.rank === "Q") setQuestionMaster(player.name);
    if (card.rank === "K") {
      player.kings += 1;
      if (player.kings === 3) awardMedal(turn, "RULE_TYRANT");
    }

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

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* MEDAL POPUP */}
      {medalPopup && (
        <div className={`medal ${medalPopup.tier.toLowerCase()}`}>
          🏅 {medalPopup.name}
          <div className="desc">{medalPopup.description}</div>
        </div>
      )}

      {/* SETUP */}
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

          {/* DECK */}
          <div className="deck">
            {deck.slice(0, 3).map((_, i) => (
              <div key={i} className="deck-card" />
            ))}
          </div>

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          {currentCard && (
            <div
              key={discard.length}
              className={`card flip ${isRed ? "red" : "black"}`}
            >
              <div className="corner top">
                {currentCard.rank}
                <span>{currentCard.suit}</span>
              </div>

              <div className="corner bottom">
                {currentCard.rank}
                <span>{currentCard.suit}</span>
              </div>

              <div className="center-suit">{currentCard.suit}</div>

              <div className="rule">
                {getRuleText(currentCard.rank)}
              </div>
            </div>
          )}
        </>
      )}

      {/* GAME OVER */}
      {gameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
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
