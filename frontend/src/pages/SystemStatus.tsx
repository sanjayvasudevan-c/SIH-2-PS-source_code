import { useApi } from "../api";
import { Badge, ErrorBox, Figure, Loading } from "../components/ui";

const LABEL: Record<string, string> = {
  PROTOTYPE: "Built and tested", SIMULATED: "Simulated", NOT_BUILT: "Not built yet", EXTERNAL: "Needs external agreement",
};
const TONE: Record<string, string> = { PROTOTYPE: "ACTIVE", SIMULATED: "SIMULATED", NOT_BUILT: "CANCELLED", EXTERNAL: "OPEN" };

export default function SystemStatus() {
  const r = useApi<any>("/api/v1/system/status");
  if (r.loading && !r.data) return <Loading />;
  const counts: Record<string, number> = r.data?.counts || {};
  return (
    <div className="stack">
      <div className="pagehead"><div><h1>System status</h1>
        <p className="muted">What this prototype does and does not do. Every “built” entry names the tests that prove it; the list is checked automatically against the code.</p></div></div>
      <ErrorBox error={r.error} />
      <div className="figs">
        {Object.keys(LABEL).map((s) => <Figure key={s} k={LABEL[s]} v={counts[s] ?? 0} />)}
      </div>
      <section className="card flat"><table>
        <thead><tr><th>Capability</th><th>Status</th><th>Evidence</th></tr></thead>
        <tbody>{r.data?.claims.map((c: any) => (
          <tr key={c.id}>
            <td><strong>{c.title}</strong>{c.note && <div className="small muted">{c.note}</div>}</td>
            <td><Badge v={TONE[c.status]}>{LABEL[c.status] || c.status}</Badge></td>
            <td className="small">
              {c.routes.length > 0 && <div><code>{c.routes.join(" · ")}</code></div>}
              {c.tests.length > 0 && <div className="muted">{c.tests.length} test{c.tests.length === 1 ? "" : "s"}: {c.tests.map((t: string) => t.split("::")[1]).join(", ")}</div>}
            </td>
          </tr>
        ))}</tbody></table></section>
    </div>
  );
}
