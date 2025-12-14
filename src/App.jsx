import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        🂡 KAD Kings 🂡
      </h1>

      <p style={{ opacity: 0.8, marginBottom: "2rem" }}>
        React is rendering correctly.
      </p>

      <button
        onClick={() => setCount(count + 1)}
        style={{
          padding: "12px 20px",
          fontSize: "1rem",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
        }}
      >
        Clicks: {count}
      </button>
    </div>
  );
}
