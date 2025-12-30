// src/App.jsx
import { useMemo, useState } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function App() {
  // demo state (wire to your real game later)
  const [mode] = useState("RHYME");
  const [enforcer] = useState("Travis");
  const [currentPlayer, setCurrentPlayer] = useState("Marsh");

  const [deck] = useState(() => buildDeck());
  const [cardIndex] = useState(0);
  const card = deck[cardIndex] ?? "A♠";
  const cardsLeft = Math.max(0, deck.length - cardIndex);

  // Start-of-game: empty mates + rules
  const [mates] = useState({}); // e.g. { Wes: ["Kyle"] }
  const [houseRules] = useState([]); // e.g. ["No swearing"]

  // demo drinks + statuses
  const [drinks] = useState(() => ({
    Wes: 5,
    Zach: 7,
    Marsh: 5,
    Travis: 3,
    Kyle: 4,
    Jeff: 7,
  }));

  const [thumbActive] = useState(() => new Set(["Wes", "Zach"])); // players currently in thumb
  const [turnBadge] = useState(() => new Set(["Marsh"])); // whose turn highlight
  const [loserSet] = useState(() => new Set([])); // demo

  const matePills = useMemo(() => {
    const items = Object.entries(mates).flatMap(([a, list]) =>
      (list || []).map((b) => `${a} → ${b}`)
    );
    return items;
  }, [mates]);

  const mateRows = useMemo(() => {
    const rows = [...matePills];
    while (rows.length < 4) rows.push("");
    return rows.slice(0, 4);
  }, [matePills]);

  const ruleRows = useMemo(() => {
    const rows = [...houseRules];
    while (rows.length < 4) rows.push("");
    return rows.slice(0, 4);
  }, [houseRules]);

  function nextPlayer() {
    const idx = PLAYERS.indexOf(currentPlayer);
    const next = PLAYERS[(idx + 1) % PLAYERS.length];
    setCurrentPlayer(next);
  }

  return (
    <div className="app">
      {/* TITLE */}
      <header className="titlebar">
        <div className="title">KAD Kings</div>
      </header>

      {/* BOARD */}
      <main className="content">
        {/* 3-column board */}
        <section className="board">
          <div className="panel mates">
            <div className="panelHeader">
              <span className="panelIcon">🤝</span>
              <span className="panelTitle">Mates</span>
            </div>

            <div className="panelBody">
              {mateRows.map((txt, i) => (
                <div key={i} className={`rowPill ${txt ? "" : "empty"}`}>
                  {txt ? txt : "—"}
                </div>
              ))}
            </div>
          </div>

          <div className="cardWrap">
            <div className="card">
              <div className="cardFace">{card}</div>
              <div className="cardMeta">{cardsLeft} left</div>
            </div>
          </div>

          <div className="panel rules">
            <div className="panelHeader">
              <span className="panelIcon">📜</span>
              <span className="panelTitle">Rules</span>
            </div>

            <div className="panelBody">
              {ruleRows.map((txt, i) => (
                <div key={i} className={`rowPill ${txt ? "" : "empty"}`}>
                  {txt ? txt : "—"}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ACTION ROW aligned to columns */}
        <section className="actionRow">
          <button className="actionBtn thumbBtn" type="button">
            <span className="btnIcon">👍</span>
            <span>Thumb</span>
          </button>

          <button className="actionBtn readyBtn" type="button">
            Ready
          </button>

          <button className="actionBtn heavenBtn" type="button">
            <span className="btnIcon">☁</span>
            <span>Heaven</span>
          </button>
        </section>

        {/* STATUS BAR */}
        <section className="statusBar">
          <div className="statusLeft">
            <span className="statusIcon">🎤</span>
            <span className="statusMode">{mode}</span>
            <span className="statusSep">|</span>
            <span className="statusText">
              Enforcer: <b>{enforcer}</b> — Current: <b>{currentPlayer}</b>
            </span>
          </div>

          <div className="statusRight">
            <button className="statusBtn" type="button" onClick={nextPlayer}>
              Next
            </button>
            <button className="statusBtn danger" type="button">
              Lose (Current)
            </button>
          </div>
        </section>

        {/* PLAYER GRID */}
        <section className="grid">
          {PLAYERS.map((name) => {
            const isTurn = turnBadge.has(name) || name === currentPlayer;
            const isThumb = thumbActive.has(name);
            const isLoser = loserSet.has(name);

            const classes = [
              "tile",
              isTurn ? "isTurn" : "",
              isThumb ? "isThumb" : "",
              isLoser ? "isLoser" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div className={classes} key={name}>
                <div className="videoFake" />

                <div className="tileBadges">
                  {isThumb ? <div className="badge badgeThumb">THUMB</div> : null}
                  {isTurn ? <div className="badge badgeTurn">TURN</div> : null}
                </div>

                <div className="tileOverlay">
                  <div className="tileName">{name}</div>
                  <div className="tileDrinks">
                    <span className="beer">🍺</span>
                    <span>{drinks[name] ?? 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
