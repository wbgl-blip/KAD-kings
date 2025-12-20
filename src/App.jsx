import { useState, useEffect } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

const CARD_RULES = {
  A: "Waterfall",
  2: "You",
  3: "Me",
  4: "Whores drink",
  5: "Never have I ever",
  6: "Dicks drink",
  7: "Heaven (last to react drinks)",
  8: "Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster (last to react drinks)",
  Q: "Question Master",
  K: "Make a rule"
};

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = Object.keys(CARD_RULES);
  let deck = [];

  for (let v of values) {
    for (let s of suits) {
      deck.push({ value: v, suit: s });
    }
  }

  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);

  const [drinks, setDrinks] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [turn, setTurn] = useState("Beau");

  const [reactionActive, setReactionActive] = useState(false);
  const [reacted, setReacted] = useState([]);

  function addDrink(player) {
    setDrinks(d => ({ ...d, [player]: d[player] + 1 }));
  }

  function drawCard() {
    if (!deck.length) return;

    const next = deck[0];
    setDeck(d => d.slice(1));
    setCard(next);

    if (next.value === "7" || next.value === "J") {
      setReactionActive(true);
      setReacted([]);
    }
  }

  function react(player) {
    if (!reactionActive || reacted.includes(player)) return;
    setReacted(r => [...r, player]);
  }

  function endReaction() {
    const loser = PLAYERS.find(p => !reacted.includes(p));
    if (loser) addDrink(loser);
    setReactionActive(false);
    setReacted([]);
  }

  return (
    <div className="app">
      <header>
        <h1>KAD Kings</h1>
      </header>

      <div className="turn-indicator">
        {turn.toUpperCase()}’S TURN
      </div>

      <main>
        <section className="players">
          {PLAYERS.map(player => (
            <div
              key={player}
              className={`player ${turn === player ? "active" : ""}`}
              onClick={() => setTurn(player)}
            >
              <div className="avatar" />
              <h3>{player}</h3>
              <p>🍺 {drinks[player]}</p>

              {reactionActive ? (
                <button
                  className={`react ${reacted.includes(player) ? "done" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    react(player);
                  }}
                >
                  REACT
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addDrink(player);
                  }}
                >
                  +1 Beer
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="card">
          <div className="card-face">
            {card ? (
              <>
                <h2>{card.value}{card.suit}</h2>
                <p>{CARD_RULES[card.value]}</p>
              </>
            ) : (
              <p>Draw a card<br />No mercy</p>
            )}
          </div>

          <button className="draw" onClick={drawCard}>
            DRAW CARD
          </button>

          {reactionActive && (
            <button className="draw end" onClick={endReaction}>
              END REACTION
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
