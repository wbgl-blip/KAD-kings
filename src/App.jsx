import { useState, useEffect } from "react";

const CARD_RULES = {
  A: "Waterfall 🍺",
  2: "You 🫵",
  3: "Me 😈",
  4: "Floor 🌊",
  5: "Guys 👨",
  6: "Chicks 👩",
  7: "Heaven ☁️",
  8: "Mate 🤝",
  9: "Rhyme 🎤",
  10: "Categories 🧠",
  J: "Never Have I Ever 🙈",
  Q: "Question Master ❓",
  K: "Make a Rule 👑",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const buildDeck = () => {
  const deck = [];
  VALUES.forEach(v =>
    SUITS.forEach(s => deck.push({ value: v, suit: s }))
  );
  return deck.sort(() => Math.random() - 0.5);
};

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Beau", beers: 0 },
    { name: "Mike", beers: 0 },
    { name: "Jess", beers: 0 },
    { name: "Alex", beers: 0 },
    { name: "Emily", beers: 0 },
    { name: "Sean", beers: 0 },
  ]);

  const [deck, setDeck] = useState([]);
  const [drawn, setDrawn] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [kings, setKings] = useState(0);

  useEffect(() => {
    setDeck(buildDeck());
  }, []);

  const drawCard = () => {
    if (deck.length === 0) return;

    const newDeck = [...deck];
    const card = newDeck.pop();

    setDeck(newDeck);
    setDrawn(card);

    if (card.value === "K") {
      setKings(k => k + 1);
    }

    setCurrentPlayer((currentPlayer + 1) % players.length);
  };

  const addBeer = index => {
    const copy = [...players];
    copy[index].beers += 1;
    setPlayers(copy);
  };

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>KAD Kings</h1>

      <div style={styles.table}>
        {players.map((p, i) => (
          <div
            key={i}
            style={{
              ...styles.player,
              ...(i === currentPlayer ? styles.activePlayer : {})
            }}
          >
            <div style={styles.avatar}></div>
            <div style={styles.name}>{p.name}</div>
            <div>🍺 {p.beers}</div>
            <button style={styles.beerBtn} onClick={() => addBeer(i)}>
              +1 Beer
            </button>
          </div>
        ))}

        <div style={styles.cardArea}>
          <div style={styles.card}>
            {drawn ? (
              <>
                <div style={styles.cardValue}>
                  {drawn.value}{drawn.suit}
                </div>
                <div style={styles.rule}>
                  {CARD_RULES[drawn.value]}
                </div>
              </>
            ) : (
              <div style={styles.cardBack}>
                Draw a card<br />No mercy
              </div>
            )}
          </div>

          <button style={styles.drawBtn} onClick={drawCard}>
            DRAW CARD
          </button>

          <div style={styles.footer}>
            Cards Left: {deck.length} / 52<br />
            Kings Drawn: {kings} / 4
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    background: "radial-gradient(circle at top, #222, #000)",
    color: "white",
    fontFamily: "serif",
    textAlign: "center",
    overflow: "hidden",
  },
  title: {
    margin: "10px 0",
    fontSize: "36px",
  },
  table: {
    position: "relative",
    width: "100%",
    height: "calc(100vh - 80px)",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(3, 1fr)",
    alignItems: "center",
    justifyItems: "center",
  },
  player: {
    background: "#111",
    borderRadius: "16px",
    padding: "10px",
    width: "110px",
    boxShadow: "0 0 20px rgba(0,0,0,.8)",
  },
  activePlayer: {
    outline: "3px solid #3fffdc",
    boxShadow: "0 0 25px #3fffdc",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#555",
    margin: "0 auto 6px",
  },
  name: {
    fontSize: "16px",
    marginBottom: "4px",
  },
  beerBtn: {
    marginTop: "6px",
    padding: "4px 10px",
    borderRadius: "12px",
    border: "none",
    fontWeight: "bold",
  },
  cardArea: {
    gridColumn: "2",
    gridRow: "2",
  },
  card: {
    width: "140px",
    height: "200px",
    background: "#fff",
    color: "#000",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    fontSize: "22px",
    marginBottom: "10px",
  },
  cardValue: {
    fontSize: "42px",
  },
  rule: {
    marginTop: "8px",
    fontSize: "16px",
  },
  cardBack: {
    fontSize: "18px",
  },
  drawBtn: {
    padding: "8px 18px",
    borderRadius: "20px",
    border: "none",
    fontWeight: "bold",
  },
  footer: {
    marginTop: "6px",
    fontSize: "12px",
    opacity: 0.8,
  },
};
