/**
 * /phone — Phone UI Bridge foundation page.
 *
 * Server component. Read-only. Builds the module-status dashboard and a safe
 * approval inbox on the server. NO client-side execution logic, NO real command
 * execution, NO message sending. Command preview is surfaced via the API route
 * (POST /api/phone-bridge/command-preview) and shown here only as a static
 * description of the safe flow.
 */

import { buildPhoneBridgeDashboard, buildPhoneApprovalInbox } from "@/lib/phone-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const card: React.CSSProperties = {
  border: "1px solid #2a2a2a",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  background: "#111",
};
const label: React.CSSProperties = { color: "#9aa0a6", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 };
const val: React.CSSProperties = { color: "#e8eaed", fontSize: 14, fontFamily: "monospace" };

function badge(status: string): React.CSSProperties {
  const map: Record<string, string> = {
    ready: "#1e7e34",
    partial: "#8a6d00",
    not_configured: "#5f6368",
    blocked: "#8b1a1a",
  };
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    background: map[status] ?? "#5f6368",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
  };
}

export default async function PhonePage() {
  const dashboard = buildPhoneBridgeDashboard();
  const inbox = await buildPhoneApprovalInbox();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, color: "#e8eaed", background: "#0b0b0b", minHeight: "100vh" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>📱 Phone UI Bridge</h1>
        <p style={{ color: "#9aa0a6", marginTop: 6 }}>
          Foundation only — превью и статусы. Команды не выполняются, сообщения не отправляются.
        </p>
        <div style={{ marginTop: 8 }}>
          <span style={badge(dashboard.status)}>{dashboard.status}</span>{" "}
          <span style={{ ...label, textTransform: "none" }}>обновлено: {dashboard.generatedAt}</span>
        </div>
      </header>

      <section style={card}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Статус модулей</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(dashboard.modules).map(([k, v]) => (
            <div key={k}>
              <div style={label}>{k}</div>
              <div style={val}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      {dashboard.warnings.length > 0 && (
        <section style={{ ...card, borderColor: "#5a4a00" }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>⚠️ Предупреждения</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {dashboard.warnings.map((w, i) => (
              <li key={i} style={{ color: "#ffd479", marginBottom: 4, fontSize: 13 }}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      <section style={card}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Следующие действия</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {dashboard.nextActions.map((a, i) => (
            <li key={i} style={{ color: "#cfd2d6", marginBottom: 4, fontSize: 13 }}>{a}</li>
          ))}
        </ul>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Превью команды (safe)</h2>
        <p style={{ color: "#9aa0a6", fontSize: 13, marginTop: 0 }}>
          Отправьте команду на <code style={val}>POST /api/phone-bridge/command-preview</code> —
          вернётся только план: <code style={val}>planned</code> / <code style={val}>approval_required</code> /{" "}
          <code style={val}>blocked</code> / <code style={val}>not_implemented</code> /{" "}
          <code style={val}>local_agent_not_running</code>. Ничего не выполняется, ничего не подтверждается автоматически.
        </p>
        <pre style={{ ...val, background: "#000", padding: 12, borderRadius: 8, overflowX: "auto", fontSize: 12 }}>
{`{ "text": "покажи daily report", "source": "mobile_web" }`}
        </pre>
      </section>

      <section style={card}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Approval inbox (read-only)</h2>
        <div style={label}>live DB: {String(inbox.liveDb)}</div>
        {inbox.warnings.map((w, i) => (
          <div key={i} style={{ color: "#ffd479", fontSize: 13, marginTop: 4 }}>{w}</div>
        ))}
        {inbox.items.length === 0 ? (
          <p style={{ color: "#9aa0a6", fontSize: 13 }}>Нет ожидающих подтверждений.</p>
        ) : (
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {inbox.items.map((it) => (
              <li key={it.id} style={{ marginBottom: 6, fontSize: 13 }}>
                <span style={val}>[{it.riskLevel ?? "?"}]</span> {it.title}{" "}
                <span style={label}>({it.status})</span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ color: "#5f6368", fontSize: 12, marginTop: 8 }}>
          Approve/Reject не реализованы в этой фазе (Approval UI — следующий этап).
        </p>
      </section>
    </main>
  );
}
