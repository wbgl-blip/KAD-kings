import { useEffect, useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

export default function App() {
  const [layoutMode, setLayoutMode] = useState("auto");
  const [currentTurn, setCurrentTurn] = useState("Beau");

  const isMobile =
    layoutMode === "mobile" ||
    (layoutMode === "auto" && window.innerWidth < 768);

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

        {!isMobile && <Sidebar />}
      </div>

      {isMobile && <Sidebar />}
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

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="panel">
        <h3>Progress</h3>
        <p>0 / 52</p>
      </div>

      <div className="panel">
        <h3>Sticky Powers</h3>
        <p>Thumbmaster (J): None</p>
        <p>Heaven (7): None</p>
        <button disabled>START J</button>
        <button disabled>START 7</button>
      </div>

      <button className="restart">RESTART</button>
    </aside>
  );
}
