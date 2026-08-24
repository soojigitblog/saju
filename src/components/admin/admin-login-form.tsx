"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("로그인에 실패했습니다.");
        return;
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleRow?.role !== "ADMIN") {
        await supabase.auth.signOut();
        setError("관리자 권한이 없습니다.");
        return;
      }

      const safeNext =
        next.startsWith("/admin") && !next.startsWith("/admin/login")
          ? next
          : "/admin/dashboard";
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="admin-email">이메일</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          className="mt-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="admin-password">비밀번호</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          className="mt-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "로그인 중…" : "관리자 로그인"}
      </Button>
    </form>
  );
}
