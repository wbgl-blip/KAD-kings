import React, { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);

  const cardsLeft = deck.length - index;

  function drawCard() {
    if (index >= deck.length) {
      setCard("DECK EMPTY");
      return;
    }

    const next = deck[index];
    setIndex(i => i + 1);
    setCard(next);
  }

<div className="app">
  <h1 className="title">KAD Kings</h1>

  <div className="table">
    <div className="deck">
      <div className="deck-card">
        {card ? card : "DRAW"}
      </div>
      <div className="deck-sub">{cardsLeft} left</div>
    </div>

    {PLAYERS.map((name, i) => (
      <div
        className="player"
        key={name}
        style={{ "--i": i, "--n": PLAYERS.length }}
      >
        <div className="avatar" />
        <div className="name">{name}</div>
        <div className="count">🍺 0</div>
      </div>
    ))}
  </div>

  <button className="draw" onClick={drawCard}>
    DRAW CARD
  </button>
</div>

