import {
  getActivePromptVersion,
  listPromptDefinitions,
} from "@/lib/repositories/prompts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prompt | Admin" };

export default async function AdminPromptsPage() {
  const defs = await listPromptDefinitions();
  const rows = await Promise.all(
    defs.map(async (d) => {
      const active = await getActivePromptVersion(d.id);
      return {
        id: d.id,
        name: d.name,
        slug: d.slug,
        version: active?.version ?? null,
        model: active?.model ?? null,
        updatedAt: active?.updated_at ?? d.updated_at,
      };
    })
  );

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--admin-gold)]">
        Prompt 관리
      </h1>
      <p className="text-sm text-[var(--admin-muted)]">
        조회 전용 (Editor는 이후 Phase)
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--admin-line)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[var(--admin-panel)] text-[var(--admin-muted)]">
            <tr>
              <th className="px-3 py-2">Prompt</th>
              <th className="px-3 py-2">ACTIVE version</th>
              <th className="px-3 py-2">model</th>
              <th className="px-3 py-2">updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--admin-line)]">
                <td className="px-3 py-2">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{r.slug}</p>
                </td>
                <td className="px-3 py-2">{r.version ?? "—"}</td>
                <td className="px-3 py-2">{r.model ?? "—"}</td>
                <td className="px-3 py-2 text-[var(--admin-muted)]">
                  {new Date(r.updatedAt).toLocaleString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
