import { FortuneForm } from "@/components/fortune/fortune-form";
import { MysticPage } from "@/components/mystic/celestial-background";
import { OrnamentCard } from "@/components/mystic/ornament-card";

export const metadata = {
  title: "사주 정보 입력",
};

export default function FortunePage() {
  return (
    <MysticPage className="min-h-[70vh]">
      <div className="mx-auto w-full max-w-lg px-5 pb-16 pt-8">
        <p className="hanja-accent mb-3">四柱</p>
        <h1 className="display-title text-[1.75rem] leading-snug md:text-3xl">
          당신의 흐름을 읽기 위해
          <br />
          태어난 순간을 알려주세요.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          입력하신 정보는 사주 명식 구성과 해석에만 사용됩니다.
        </p>
        <OrnamentCard density="corners" className="mt-8 p-5 md:p-6">
          <FortuneForm />
        </OrnamentCard>
      </div>
    </MysticPage>
  );
}
