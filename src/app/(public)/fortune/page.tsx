import { FortuneForm } from "@/components/fortune/fortune-form";

export const metadata = {
  title: "사주 정보 입력",
};

export default function FortunePage() {
  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-4">
      <p className="hanja-accent mb-2">四柱 · 命式</p>
      <h1 className="display-title text-3xl">명식 작성</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
        태어난 순간의 정보를 입력하시면
        <br />
        당신만의 사주 명식을 구성합니다.
      </p>
      <div className="mt-8">
        <FortuneForm />
      </div>
    </div>
  );
}
