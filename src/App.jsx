import { useMemo, useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"]; // 6–8 ready

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function getRank(card) { return card.replace(/[^A-Z0-9]/g, ""); }

export default function App() {
  // Core
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealTick, setRevealTick] = useState(0);

  // Temporary roles
  const [thumbmaster, setThumbmaster] = useState(null); // J
  const [heaven, setHeaven] = useState(null); // 7
  const [questionMaster, setQuestionMaster] = useState(null); // Q

  // Reactions
  const [reaction, setReaction] = useState(null);

  // Persistent mates (directed)
  const [mates, setMates] = useState(() => Object.fromEntries(PLAYERS.map(p => [p, []])));

  // Selection modes
  // null | { type:"mate", leader:string } | { type:"qm" }
  const [selectMode, setSelectMode] = useState(null);

  // Overlay: show mate links
  const [showLinks, setShowLinks] = useState(false);

  // Drinks
  const [beers, setBeers] = useState(() => Object.fromEntries(PLAYERS.map(p => [p, 0])));

  const cardsLeft = deck.length;
  const cardsDrawn = 52 - cardsLeft;
  const currentPlayer = () => PLAYERS[turnIndex];

  // Incoming leader (for UI badge)
  const incomingLeader = useMemo(() => {
    const incoming = Object.fromEntries(PLAYERS.map(p => [p, null]));
    for (const leader of PLAYERS) {
      for (const m of mates[leader] ?? []) if (!incoming[m]) incoming[m] = leader;
    }
    return incoming;
  }, [mates]);

  // ---- Mate graph helpers ----
  function hasPath(from, to, visited = new Set()) {
    if (from === to) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    for (const nxt of mates[from] ?? []) if (hasPath(nxt, to, visited)) return true;
    return false;
  }
  function canAddMateEdge(leader, mate) {
    if (!leader || !mate) return false;
    if (leader === mate) return false;
    if ((mates[leader] ?? []).includes(mate)) return false;
    if (hasPath(mate, leader)) return false; // prevent cycles
    return true;
  }
  function addMateEdge(leader, mate) {
    if (!canAddMateEdge(leader, mate)) return false;
    setMates(prev => ({ ...prev, [leader]: [...(prev[leader] ?? []), mate] }));
    return true;
  }

  // ---- Drink propagation (one-way, recursive) ----
  function drink(name, amount = 1) {
    setBeers(prev => {
      const next = { ...prev };
      const visited = new Set();
      function dfs(p) {
        if (visited.has(p)) return;
        visited.add(p);
        next[p] = (next[p] ?? 0) + amount;
        for (const f of mates[p] ?? []) dfs(f);
      }
      dfs(name);
      return next;
    });
  }

  // ---- Draw (tap stack) ----
  function drawCard() {
    if (reaction || selectMode || isDrawing || cardsLeft === 0) return;
    setIsDrawing(true);
    setDeck(d => {
      if (!d.length) return d;
      const [next, ...rest] = d;
      const rank = getRank(next);
      const player = currentPlayer();

      setRevealTick(t => t + 1);
      setCard(next);

      if (rank === "J") setThumbmaster(player);
      if (rank === "7") setHeaven(player);
      if (rank === "Q") setQuestionMaster(player);
      if (rank === "8") setSelectMode({ type: "mate", leader: player });

      setTurnIndex(t => (t + 1) % PLAYERS.length);
      return rest;
    });
    setTimeout(() => setIsDrawing(false), 520);
  }

  // ---- Reactions ----
  function startReaction(type) {
    if (reaction || selectMode || isDrawing) return;
    const starter = type === "J" ? thumbmaster : heaven;
    if (!starter) return;
    setReaction({ type, starter, reacted: new Set([starter]) });
  }
  function react(name) {
    if (!reaction) return;
    if (reaction.reacted.has(name)) return;
    const updated = new Set(reaction.reacted);
    updated.add(name);
    if (updated.size === PLAYERS.length) {
      setReaction(null);
      return;
    }
    setReaction({ ...reaction, reacted: updated });
  }

  // ---- Question Master manual penalty ----
  function startQMPick() {
    if (!questionMaster || reaction || selectMode || isDrawing) return;
    setSelectMode({ type: "qm" });
  }
  function applyQMPenalty(victim) {
    drink(victim, 1);
    setSelectMode(null);
  }

  // ---- Selection handlers ----
  function onPickPlayer(name) {
    if (!selectMode) return;
    if (selectMode.type === "mate") {
      const ok = addMateEdge(selectMode.leader, name);
      if (ok) setSelectMode(null);
      return;
    }
    if (selectMode.type === "qm") {
      if (name === questionMaster) return;
      applyQMPenalty(name);
    }
  }
  function cancelSelection() {
    setSelectMode(null);
  }

  // ---- Reset ----
  function resetGame() {
    if (reaction || selectMode || isDrawing || thumbmaster || heaven) return;
    setDeck(buildDeck());
    setCard(null);
    setTurnIndex(0);
    setIsDrawing(false);
    setRevealTick(t => t + 1);
    setThumbmaster(null);
    setHeaven(null);
    setQuestionMaster(null);
    setReaction(null);
    setMates(Object.fromEntries(PLAYERS.map(p => [p, []])));
    setBeers(Object.fromEntries(PLAYERS.map(p => [p, 0])));
  }

  const deckDisabled = reaction || selectMode || isDrawing || cardsLeft === 0;
  const headerHint =
    cardsLeft === 0 ? "Deck empty" :
    reaction ? "Reaction active" :
    selectMode?.type === "mate" ? `Choose a mate for ${selectMode.leader}` :
    selectMode?.type === "qm" ? "Pick who answered the Question Master" :
    "Tap the stack to draw";

  return (
    <div className={`app ${reaction ? "reaction" : ""} ${selectMode ? "selecting" : ""}`}>
      <h1>KAD Kings</h1>

      {/* STACK */}
      <div className="stage">
        <button
          type="button"
          className={`card-stack ${deckDisabled ? "disabled" : ""}`}
          onClick={drawCard}
          aria-label="Tap the card stack to draw"
        >
          <span className="stack-back back-2" />
          <span className="stack-back back-1" />
          <span key={revealTick} className={`stack-card ${card ? "reveal" : ""}`}>
            <span className="card-face">{card ?? "—"}</span>
            <span className="card-meta">{cardsLeft} left</span>
          </span>
          <span className="stack-hint">{headerHint}</span>
        </button>

        {/* INFO */}
        <div className="info-bar">
          <div className="pill"><div className="pill-label">Progress</div><div className="pill-value">{cardsDrawn}/52</div></div>
          <div className="pill"><div className="pill-label">Current</div><div className="pill-value">{currentPlayer()}</div></div>
          <div className="pill"><div className="pill-label">Thumb (J)</div><div className="pill-value">{thumbmaster ?? "—"}</div></div>
          <div className="pill"><div className="pill-label">Heaven (7)</div><div className="pill-value">{heaven ?? "—"}</div></div>
          <div className="pill"><div className="pill-label">Q Master</div><div className="pill-value">{questionMaster ?? "—"}</div></div>
        </div>
      </div>

      {/* MATE LINKS OVERLAY */}
      {showLinks && (
        <div className="links-overlay">
          <div className="links-card">
            <div className="links-title">Mate Links</div>
            {PLAYERS.every(p => (mates[p] ?? []).length === 0) && (
              <div className="links-empty">No mates yet</div>
            )}
            {PLAYERS.map(p => (mates[p] ?? []).length > 0 && (
              <div key={p} className="link-row">
                <span className="leader">{p}</span>
                <span className="arrow">→</span>
                <span className="followers">{mates[p].join(", ")}</span>
              </div>
            ))}
            <button className="links-close" onClick={() => setShowLinks(false)}>Close</button>
          </div>
        </div>
      )}

      {/* PLAYERS */}
      <div className="table">
        {PLAYERS.map((name, i) => {
          const isActive = i === turnIndex;
          const isQM = questionMaster === name;
          const isThumb = thumbmaster === name;
          const isHeav = heaven === name;
          const leaderOf = incomingLeader[name];
          const mateCount = (mates[name] ?? []).length;

          const selectingMate = selectMode?.type === "mate";
          const selectingQM = selectMode?.type === "qm";
          const isSelectable =
            !!selectMode &&
            name !== (selectMode.type === "mate" ? selectMode.leader : null) &&
            (!selectingQM || name !== questionMaster);
          const mateAllowed = selectingMate ? canAddMateEdge(selectMode.leader, name) : true;
          const tileDisabled = !!selectMode && (!isSelectable || (selectingMate && !mateAllowed));

          return (
            <button
              key={name}
              type="button"
              className={[
                "player",
                isActive && "active",
                tileDisabled && "tile-disabled",
                isSelectable && "selectable",
              ].filter(Boolean).join(" ")}
              onClick={() => {
                if (selectMode) {
                  if (!tileDisabled) onPickPlayer(name);
                } else if (reaction) {
                  react(name);
                } else {
                  drink(name, 1);
                }
              }}
            >
              <div className="video-surface" />
              <div className="tile-row">
                <div className="name">{name}</div>
                <div className="badges">
                  {isQM && <span className="badge qm">Q</span>}
                  {isThumb && <span className="badge thumb">J</span>}
                  {isHeav && <span className="badge heaven">7</span>}
                  {mateCount > 0 && <span className="badge mate">🤝{mateCount}</span>}
                  {leaderOf && <span className="badge follows">↳</span>}
                </div>
              </div>
              <div className="tile-row">
                <div className="count">🍺 {beers[name]}</div>
                <div className="action">
                  {selectMode?.type === "mate" ? "Pick" :
                   selectMode?.type === "qm" ? "Got caught" :
                   reaction ? "TAP" : "+1"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* DOCK */}
      <div className="dock">
        <button className="dock-btn" onClick={() => startReaction("J")} disabled={!thumbmaster || reaction || selectMode || isDrawing}>Start J</button>
        <button className="dock-btn" onClick={() => startReaction("7")} disabled={!heaven || reaction || selectMode || isDrawing}>Start 7</button>
        <button className="dock-btn" onClick={startQMPick} disabled={!questionMaster || reaction || selectMode || isDrawing}>QM Got You</button>
        <button className="dock-btn" onClick={() => setShowLinks(v => !v)}>{showLinks ? "Hide Links" : "Show Links"}</button>
        <button className="dock-btn reset" onClick={resetGame} disabled={reaction || selectMode || isDrawing}>Reset</button>
      </div>

      {/* CANCEL SELECTION BAR */}
      {selectMode && (
        <div className="cancel-bar">
          <div className="cancel-text">
            {selectMode.type === "mate" ? `Selecting mate for ${selectMode.leader}` : "Selecting QM penalty"}
          </div>
          <button className="cancel-btn" onClick={cancelSelection}>Cancel</button>
        </div>
      )}
    </div>
  );
}
