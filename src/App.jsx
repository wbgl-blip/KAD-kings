import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

export default function App() {
  const [drinks, setDrinks] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );
  const [turn, setTurn] = useState("Beau");
  const [mode, setMode] = useState("auto"); // auto | mobile | desktop
  const [reactionActive, setReactionActive] = useState(false);
  const [reacted, setReacted] = useState([]);

  function addDrink(player) {
    setDrinks(d => ({ ...d, [player]: d[player] + 1 }));
  }

  function startReaction() {
    setReactionActive(true);
    setReacted([]);
  }

  function react(player) {
    if (!reactionActive || reacted.includes(player)) return;
    setReacted(r => [...r, player]);
  }

  function finishReaction() {
    const loser = PLAYERS.find(p => !reacted.includes(p));
    if (loser) addDrink(loser);
    setReactionActive(false);
    setReacted([]);
  }

  return (
    <div className={`app ${mode}`}>
      <header>
        <h1>KAD Kings</h1>
        <div className="mode-toggle">
          <button onClick={() => setMode("auto")}>AUTO</button>
          <button onClick={() => setMode("mobile")}>📱</button>
          <button onClick={() => setMode("desktop")}>🖥️</button>
        </div>
      </header>

      <div className="turn-indicator">
        <span>{turn.toUpperCase()}’S TURN</span>
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
            <p>Draw a card<br />No mercy</p>
          </div>
          <button className="draw">DRAW CARD</button>
        </section>

        <aside className="sidebar">
          <h4>Sticky Powers</h4>
          <button onClick={startReaction}>START J / 7</button>
          {reactionActive && (
            <button className="end" onClick={finishReaction}>
              END REACTION
            </button>
          )}
        </aside>
      </main>
    </div>
  );
}
