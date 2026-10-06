import Link from "next/link";

const fields = [
  ["상호", process.env.BUSINESS_NAME], ["대표자", process.env.BUSINESS_OWNER ?? process.env.BUSINESS_REPRESENTATIVE], ["사업자등록번호", process.env.BUSINESS_REGISTRATION_NUMBER ?? process.env.BUSINESS_REGISTRATION_NO], ["통신판매업 신고번호", process.env.ECOMMERCE_REGISTRATION_NUMBER ?? process.env.BUSINESS_MAIL_ORDER_NO], ["주소", process.env.BUSINESS_ADDRESS], ["이메일", process.env.CUSTOMER_SERVICE_EMAIL ?? process.env.BUSINESS_EMAIL], ["고객센터", process.env.CUSTOMER_SERVICE_PHONE ?? process.env.BUSINESS_SUPPORT_CONTACT],
] as const;

/** Deliberately omits missing values — PG review must not show invented business details. */
export function BusinessFooter() {
  const values = fields.filter(([, value]) => value?.trim());
  return <footer className="border-t border-[var(--border-subtle)] px-5 py-8 text-xs text-[var(--text-muted)]"><div className="mx-auto max-w-5xl space-y-3"><div className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/refund-policy">환불정책</Link></div>{values.length ? <div className="space-y-1">{values.map(([label, value]) => <p key={label}>{label}: {value}</p>)}</div> : null}</div></footer>;
}
