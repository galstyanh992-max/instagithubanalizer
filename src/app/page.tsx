export default function Home() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        margin: 0,
        overflow: "hidden",
        background: "#01040b",
        zIndex: 50,
      }}
    >
      <iframe
        src="/dashboard/index.html?v=volumetric-v55"
        title="JARVIS OS — интерактивная голографическая панель"
        allow="microphone"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          border: 0,
          background: "#01040b",
        }}
      />
      <noscript>Для работы интерактивной панели включите JavaScript.</noscript>
    </main>
  );
}
