import { useState, useMemo } from "react";
import "./App.css";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const RULES = {
  A:"Waterfall. Keep up, idiot.",
  2:"Pick someone. Ruin their night.",
  3:"Me. Congrats, dumbass.",
  4:"Whores. Everyone drinks.",
  5:"Thumb master. Miss it, drink.",
  6:"Dicks drink. Sorry boys.",
  7:"Heaven. Look up or shut up.",
  8:"Mate. You’re not free.",
  9:"Rhyme. Hesitate = drink.",
  10:"Categories. Brain optional.",
  J:"Make a rule. Abuse it.",
  Q:"Questions. Speak and suffer.",
  K:"King’s Cup. God help you."
};

export default function App() {
  const [players, setPlayers] = useState([
    { name: "dt", beers: 0 },
    { name: "vh", beers: 0 },
    { name: "rf", beers: 0 },
    { name: "fff", beers: 0 },
    { name: "gg", beers: 0 },
    { name: "hh", beers: 0 }
  ]);

  const [deck, setDeck] = useState(shuffleDeck());
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);
  const [trash, setTrash] = useState("");

  function shuffleDeck() {
    const d=[];
    for (let s of SUITS) for (let v of VALUES) d.push({suit:s,value:v});
    return d.sort(()=>Math.random()-0.5);
  }

  function adjustBeer(i, d) {
    setPlayers(p =>
      p.map((pl,idx)=>
        idx===i ? {...pl,beers:Math.max(0,pl.beers+d)} : pl
      )
    );
  }

  function drawCard() {
    if (!deck.length) return;
    const next = deck[0];
    setCard(next);
    setDeck(deck.slice(1));
    setTurn((turn+1)%players.length);
    setTrash(generateTrash());
  }

  const gameOver = deck.length === 0;

  const ranked = useMemo(() => {
    return [...players].sort((a,b)=>b.beers-a.beers);
  }, [players]);

  function generateTrash() {
    const avg = players.reduce((s,p)=>s+p.beers,0)/players.length;
    const top = ranked[0];
    const bottom = ranked[ranked.length-1];

    const lines = [
      `${top.name} is a menace to sobriety.`,
      `${bottom.name} is nursing that drink like a child.`,
      `Some of you aren’t pulling your weight.`,
      `This table is embarrassing.`,
      `${top.name} needs supervision.`,
      `${bottom.name} is basically sober. Gross.`
    ];
    return lines[Math.floor(Math.random()*lines.length)];
  }

  function medal(p, i) {
    if (i===0) return "🥇 Menace to Sobriety";
    if (i===1) return "🥈 Public Intoxication";
    if (i===2) return "🥉 Walking Red Flag";
    if (p.beers<=2) return "🧃 Designated Liar";
    if (i===ranked.length-1) return "🤡 Hydrated Little Bitch";
    return "🧠 Functional Alcoholic";
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {!gameOver && (
        <>
          <div className="table">
            {players.map((p,i)=>{
              const angleStart=210, angleEnd=-30;
              const step=(angleEnd-angleStart)/(players.length-1);
              const a=(angleStart+step*i)*(Math.PI/180);
              const x=50+Math.cos(a)*42;
              const y=52+Math.sin(a)*28;

              return (
                <div
                  key={i}
                  className={`player ${i===turn?"active":""}`}
                  style={{left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)"}}
                >
                  <div className="name">{p.name}</div>
                  <div className="controls">
                    <button onClick={()=>adjustBeer(i,-1)}>-</button>
                    <span>🍺 {p.beers}</span>
                    <button onClick={()=>adjustBeer(i,1)}>+</button>
                  </div>
                </div>
              );
            })}

            <div className="center">
              {card && (
                <div className="card">
                  <div className="top">{card.value}{card.suit}</div>
                  <div className="middle">{card.suit}</div>
                  <div className="rule">{RULES[card.value]}</div>
                </div>
              )}

              <button className="draw" onClick={drawCard}>Draw Card</button>
              <div className="meta">Cards left: {deck.length}</div>
              {trash && <div className="trash">{trash}</div>}
            </div>
          </div>
        </>
      )}

      {gameOver && (
        <div className="scoreboard">
          <h2>Final Damage Report</h2>
          {ranked.map((p,i)=>(
            <div key={p.name} className="score-row">
              <span>{p.name}</span>
              <span>🍺 {p.beers}</span>
              <span>{medal(p,i)}</span>
            </div>
          ))}
          <div className="trash big">
            This was a disgrace. See you next weekend.
          </div>
        </div>
      )}
    </div>
  );
}
