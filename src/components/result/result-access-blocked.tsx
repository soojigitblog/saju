import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ResultAccessBlocked({
  reason,
}: {
  reason: "no_session" | "forbidden" | "not_found";
}) {
  const copy =
    reason === "no_session"
      ? {
          title: "이 결과를 열 수 없습니다",
          body: "사주 결과는 생성한 브라우저(세션)에서만 볼 수 있습니다. 주소만 복사해 다른 브라우저·시크릿 창·미리보기 창에서 열면 표시되지 않습니다.",
          hint: "같은 브라우저 탭에서 다시 시도하거나, 결과 화면의 「공유하기」로 링크를 만든 뒤 그 URL을 사용해 주세요.",
        }
      : reason === "forbidden"
        ? {
            title: "접근 권한이 없습니다",
            body: "이 결과는 다른 브라우저 또는 다른 기기에서 생성되었습니다.",
            hint: "본인 결과라면 생성했던 브라우저에서 열거나, 「공유하기」로 만든 공유 링크(/share/...)를 사용해 주세요.",
          }
        : {
            title: "결과를 찾을 수 없습니다",
            body: "예전에 받은 주소로 다시 접속하셨거나, 서버가 재시작되면서 이전 테스트 데이터가 사라졌을 수 있습니다.",
            hint: "아래에서 새로 사주를 입력해 주세요. 같은 브라우저에서 완료하면 결과 URL이 다시 작동합니다. 공유가 필요하면 결과 화면의 「공유하기」를 사용하세요.",
          };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <p className="hanja-accent mb-2">RESULT</p>
      <h1 className="display-title text-xl">{copy.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
        {copy.body}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        {copy.hint}
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button asChild size="full" variant="default">
          <Link href="/fortune">새로 사주 보기</Link>
        </Button>
        <Button asChild size="full" variant="outline">
          <Link href="/">홈으로</Link>
        </Button>
      </div>
    </div>
  );
}
