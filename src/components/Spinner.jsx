export default function Spinner({ size = 28, color = "#f0c987" }) {
  return (
    <div
      className="spinner"
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `3px solid ${color}22`,
        borderTopColor: color,
        flexShrink: 0,
      }}
    />
  );
}
