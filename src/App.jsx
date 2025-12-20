import { useEffect, useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

export default function App() {
  const [layoutMode, setLayoutMode] = useState("auto");
  const [currentTurn, setCurrentTurn] = useState("Beau");

  const [reactionType, setReactionType] = useState(null); // "J" | "7" | null
  const [reacted, setReacted] = useState([]);
  const [lastLoser, setLastLoser] = useState(null);

  const isMobile =
    layoutMode === "mobile" ||
    (layoutMode === "auto" && window.innerWidth < 768);

  function startReaction(type) {
    setReactionType(type);
    setReacted([]);
    setLastLoser(null);
  }

  function react(player) {
    if (reacted.includes(player)) return;

    const next = [...reacted, player];
    setReacted(next);

    if (next.length === PLAYERS.length) {
      const loser = next[next.length - 1];
      setLastLoser(loser);
      setTimeout(() => {
        setReactionType(null);
        setReacted([]);
      }, 900);
    }
  }

  return (
    <div className={`app ${isMobile ? "mobile" : "desktop"}`}>
      <LayoutToggle layoutMode={layoutMode} setLayoutMode={setLayoutMode} />

      <h1 className="title">KAD Kings</h1>

      <div className="table">
        <div className="players">
          {PLAYERS.map((p) => (
            <div
              key={p}
              className={`player ${p === currentTurn ? "active" : ""}`}
              onClick={() => setCurrentTurn(p)}
            >
              <div className="avatar" />
              <div className="name">{p}</div>
              <div className="drinks">🍺 0</div>
              <button>+1 Beer</button>
            </div>
          ))}
        </div>

        <div className="card-area">
          <div className="card">
            <p>Draw a card</p>
            <p>No mercy</p>
          </div>
          <button className="draw">DRAW CARD</button>
        </div>

        {!isMobile && (
          <Sidebar
            startReaction={startReaction}
          />
        )}
      </div>

      {isMobile && (
        <Sidebar
          startReaction={startReaction}
        />
      )}

      {reactionType && (
        <ReactionOverlay
          type={reactionType}
          reacted={reacted}
          lastLoser={lastLoser}
          onReact={react}
        />
      )}
    </div>
  );
}

function LayoutToggle({ layoutMode, setLayoutMode }) {
  return (
    <div className="layout-toggle">
      <button
        className={layoutMode === "auto" ? "active" : ""}
        onClick={() => setLayoutMode("auto")}
      >
        AUTO
      </button>
      <button
        className={layoutMode === "mobile" ? "active" : ""}
        onClick={() => setLayoutMode("mobile")}
      >
        📱
      </button>
      <button
        className={layoutMode === "desktop" ? "active" : ""}
        onClick={() => setLayoutMode("desktop")}
      >
        🖥️
      </button>
    </div>
  );
}

function Sidebar({ startReaction }) {
  return (
    <aside className="sidebar">
      <div className="panel">
        <h3>Progress</h3>
        <p>0 / 52</p>
      </div>

      <div className="panel">
        <h3>Sticky Powers</h3>
        <p>Thumbmaster (J)</p>
        <button onClick={() => startReaction("J")}>START J</button>
        <p>Heaven (7)</p>
        <button onClick={() => startReaction("7")}>START 7</button>
      </div>

      <button className="restart">RESTART</button>
    </aside>
  );
}

function ReactionOverlay({ type, reacted, lastLoser, onReact }) {
  return (
    <div className="reaction-overlay">
      <div className="reaction-box">
        <h2>
          {type === "J" ? "THUMBMASTER" : "HEAVEN"}
        </h2>
        <p>
          {type === "J"
            ? "Thumb on the table"
            : "Finger to the sky"}
        </p>

        <div className="reaction-buttons">
          {PLAYERS.map((p) => (
            <button
              key={p}
              disabled={reacted.includes(p)}
              onClick={() => onReact(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {lastLoser && (
          <div className="loser">
            {lastLoser} drinks 🍺
          </div>
        )}
      </div>
    </div>
  );
}
