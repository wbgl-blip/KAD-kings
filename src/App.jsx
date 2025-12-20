import { useMemo, useState } from "react";

const RULES = [
  { card: "A", label: "Ace", text: "Waterfall – everyone drinks (you start)." },
  { card: "2", label: "2", text: "You – pick someone to drink." },
  { card: "3", label: "3", text: "Me – you drink." },
  { card: "4", label: "4", text: "Floor – last person to touch the floor drinks." },
  { card: "5", label: "5", text: "Guys drink." },
  { card: "6", label: "6", text: "Girls drink." },
  { card: "7", label: "7", text: "Heaven – last person to raise a hand drinks." },
  { card: "8", label: "8", text: "Mate – pick a drinking buddy." },
  { card: "9", label: "9", text: "Rhyme – mess up, drink." },
  { card: "10", label: "10", text: "Categories – mess up, drink." },
  // ✅ Correct swap:
  { card: "J", label: "Jack", text: "Thumb Master 👆 (last to thumb drinks)." },
  { card: "Q", label: "Queen", text: "Question Master (answer a question? drink)." },
  { card: "K", label: "King", text: "Make a rule 👑 (and pour into the King’s Cup if you’re playing that way)." },
];

// Medal pools
const MEDALS_NORMAL = [
  "🥇 FIRST BLOOD",
  "🔥 DOUBLE DOWN",
  "👑 KING SLAYER",
  "🧠 THUMB TYRANT",
];

const MEDALS_DEGENERATE = [
  "🍺 THIRSTY",
  "🍻 ALCOHOLIC",
  "🛢️ HUMAN KEG",
  "☠️ DEATH WISH",
  "🚑 MEDIC!",
];

const MEDALS_NSFW = [
  "🤡 CLOWN ENERGY",
  "🗑️ TRASH PULL",
  "🍼 LIGHTWEIGHT",
  "🧠❌ NO THOUGHTS",
  "👀 CAN’T READ",
  "🫠 ABSOLUTELY FOLDED",
];

const MEDALS_TOXIC = [
  "🚮 DOGSHIT LUCK",
  "🎮 SKILL ISSUE",
  "🧠 ROOM TEMPERATURE IQ",
  "🥴 YOU GOOD, BRO?",
  "⚰️ SHOULD’VE STAYED SOBER",
  "🪦 PACK IT UP",
  "📉 FELL OFF",
  "👑➡️🤡 THIS YOUR KING?",
  "🧲 EVERYONE HATES YOU",
  "🎯 DESIGNATED VICTIM",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function App() {
  const [current, setCurrent] = useState(null);
  const [last, setLast] = useState(null);
  const [drawCount, setDrawCount] = useState(0);
  const [medal, setMedal] = useState(null);

  // Toggles
  const [degenerateOn, setDegenerateOn] = useState(true);
  const [nsfwOn, setNsfwOn] = useState(true);
  const [toxicOn, setToxicOn] = useState(true);

  const medalPool = useMemo(() => {
    let pool = [...MEDALS_NORMAL];
    if (degenerateOn) pool = pool.concat(MEDALS_DEGENERATE);
    if (nsfwOn) pool = pool.concat(MEDALS_NSFW);
    if (toxicOn) pool = pool.concat(MEDALS_TOXIC);
    return pool;
  }, [degenerateOn, nsfwOn, toxicOn]);

  const drawCard = () => {
    const next = pickRandom(RULES);
    const nextCount = drawCount + 1;

    setLast(current);
    setCurrent(next);
    setDrawCount(nextCount);

    // Medal priority (so “big moments” win)
    if (nextCount === 1) {
      setMedal("🥇 FIRST BLOOD");
      return;
    }

    if (next.card === "K") {
      setMedal("👑 KING SLAYER");
      return;
    }

    if (next.card === "J") {
      setMedal("🧠 THUMB TYRANT");
      return;
    }

    if (last && last.card === next.card) {
      setMedal("🔥 DOUBLE DOWN");
      return;
    }

    // Degenerate milestones (feel-earned)
    if (degenerateOn && nextCount === 3) {
      setMedal("🍺 THIRSTY");
      return;
    }
    if (degenerateOn && nextCount === 5) {
      setMedal("🍻 ALCOHOLIC");
      return;
    }
    if (degenerateOn && nextCount >= 8) {
      setMedal("🛢️ HUMAN KEG");
      return;
    }

    // Random roast medal (rate-limited so it’s not constant)
    // If all toggles off, medalPool still has normal medals.
    const roastChance = (nsfwOn || toxicOn || degenerateOn) ? 0.25 : 0.0;
    if (Math.random() < roastChance) {
      setMedal(pickRandom(medalPool));
      return;
    }

    setMedal(null);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>👑 KAD Kings</h1>

        <div style={S.toggles}>
          <Toggle label="Degenerate" on={degenerateOn} setOn={setDegenerateOn} />
          <Toggle label="NSFW" on={nsfwOn} setOn={setNsfwOn} />
          <Toggle label="Toxic" on={toxicOn} setOn={setToxicOn} />
        </div>

        <button style={S.button} onClick={drawCard}>
          Draw Card
        </button>

        {medal && <div style={S.medal}>{medal}</div>}

        {current ? (
          <div style={S.ruleBox}>
            <div style={S.rank}>{current.label}</div>
            <div style={S.rule}>{current.text}</div>
            <div style={S.meta}>Draws: {drawCount}</div>
          </div>
        ) : (
          <div style={S.hint}>Tap “Draw Card” to start the chaos.</div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, on, setOn }) {
  return (
    <label style={S.toggle}>
      <input
        type="checkbox"
        checked={on}
        onChange={() => setOn(!on)}
        style={S.checkbox}
      />
      <span>{label}</span>
    </label>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "#0b0b0f",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#111118",
    borderRadius: 16,
    padding: 18,
    color: "#fff",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    textAlign: "center",
  },
  title: { margin: "4px 0 14px", fontSize: 34, letterSpacing: 0.2 },
  toggles: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
    opacity: 0.95,
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#1a1a24",
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 13,
    userSelect: "none",
  },
  checkbox: { transform: "scale(1.1)" },
  button: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: "#ffffff",
    color: "#000",
    fontSize: 18,
    fontWeight: 800,
  },
  medal: {
    marginTop: 14,
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 999,
    background: "#ff3b3b",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  ruleBox: {
    marginTop: 14,
    background: "#1a1a24",
    borderRadius: 16,
    padding: 16,
    textAlign: "left",
  },
  rank: { fontSize: 22, fontWeight: 900, marginBottom: 6 },
  rule: { fontSize: 16, lineHeight: 1.35, opacity: 0.95 },
  meta: { marginTop: 10, fontSize: 12, opacity: 0.65 },
  hint: { marginTop: 14, opacity: 0.7, fontSize: 14 },
};
