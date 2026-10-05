import { ADULT_V2_PREVIEW_SAMPLE, type AdultV2PreviewData } from "@/lib/adult-v2/preview-sample";
import { adultV2ReportToPresentation } from "@/lib/adult-v2/presentation";
import type { AdultV2ReportData } from "@/lib/adult-v2/report-data";
import styles from "./adult-v2-preview.module.css";

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <header className={styles.sectionTitle}><p>{eyebrow}</p><h2>{title}</h2>{children}</header>;
}

/** Shared editorial renderer. Production receives an explicit persisted V2 contract. */
function AdultV2Document({ sample }: { sample: AdultV2PreviewData }) {
  return <main className={styles.page}>
    <section className={styles.cover}><div className={styles.coverGrain} /><div className={styles.coverTop}><span>UNYEOGYEOL</span><span>예시 리포트</span></div><div className={styles.coverCenter}><p className={styles.coverEyebrow}>결 · 흐름 · 현재의 선택</p><h1>{sample.subject}의<br />인생 지도</h1><div className={styles.coverRule} /><p>{sample.subtitle}</p></div><div className={styles.coverBottom}><span>{sample.year}</span><span>UNYEOGYEOL ADULT V2</span></div></section>

    <section className={styles.section}><SectionTitle eyebrow="01 · A PORTRAIT" title="나라는 사람" /><p className={styles.lead}>{sample.portrait.lead}</p><div className={styles.wordRow}>{sample.coreWords.map((word) => <span key={word}>{word}</span>)}</div><div className={styles.contrastInsights}><article><b>겉으로 보이는 나</b><p>{sample.portrait.outward}</p></article><article><b>실제 내면</b><p>{sample.portrait.inward}</p></article></div><p className={styles.bodyCopy}>{sample.portrait.context}</p></section>

    <section className={`${styles.section} ${styles.tinted}`}><SectionTitle eyebrow="02 · CORE TENDENCY" title="타고난 핵심 성향"><p>생활 속 선택에서 반복해서 드러나는 방식입니다.</p></SectionTitle><article className={styles.primaryTendency}><b>대표 성향</b><h3>{sample.tendencies.primary.title}</h3><p>{sample.tendencies.primary.body}</p></article><div className={styles.supportingTendencies}>{sample.tendencies.supporting.map((item, index) => <article key={item.title}><b>보조 성향 0{index + 1}</b><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>

    <section className={styles.section}><SectionTitle eyebrow="03 · LIFE FLOW" title="내 인생의 흐름"><p>좋고 나쁨이 아닌, 시기마다 전면에 나타나는 테마와 변화의 밀도를 살펴봅니다.</p></SectionTitle><ol className={styles.lifeFlow} aria-label="나이 구간별 인생 흐름">{sample.lifeFlow.map((item) => <li className={item.current ? styles.currentFlow : ""} key={item.ageRange}>{item.current && <span className={styles.currentMarker}>현재</span>}<div className={`${styles.flowBar} ${styles[item.prominence]}`}><i /></div><strong>{item.ageRange}</strong><span>{item.theme}</span><em>{item.change}</em></li>)}</ol></section>

    <section className={`${styles.section} ${styles.darkSection}`}><SectionTitle eyebrow="04 · NEXT FIVE" title="앞으로 5년의 흐름"><p>정해진 결과가 아닌, 해마다 더 또렷하게 드러나는 주제를 읽습니다.</p></SectionTitle><ol className={styles.yearList}>{sample.years.map((item) => <li key={item.year}><div className={styles.yearHeading}><time>{item.year}</time>{item.current && <em>현재</em>}</div><div className={styles.yearDetails}><strong>{item.headline}</strong><p>{item.primaryTheme}<br />{item.secondaryTheme} · {item.changePressure}</p><div className={styles.keywords}>{item.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><p className={styles.yearInterpretation}>{item.interpretation}</p></div></li>)}</ol></section>

    <section className={styles.section}><SectionTitle eyebrow="05 · WORK & RESOURCE" title="돈과 커리어"><p>좋고 나쁨이 아니라, 현재 삶에서 어떤 주제가 더 전면에 나타나는지를 보여줍니다.</p></SectionTitle><div className={styles.signalList}>{sample.themes.map((theme) => <div key={theme.label}><div><span>{theme.label}</span><b>{theme.level}</b></div><i><i style={{ width: theme.width }} /></i></div>)}</div><blockquote>“무엇을 더 얻을지보다, 지금 가진 자원과 역할을 어떤 기준으로 정리할지에 시선을 둡니다.”</blockquote></section>

    <section className={`${styles.section} ${styles.tinted}`}><SectionTitle eyebrow="06 · RELATIONSHIP" title="사랑과 관계" /><div className={styles.relationship}><span>結</span><p>{sample.relationship.opening}</p></div><div className={styles.relationshipInsights}>{sample.relationship.insights.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
    {sample.family ? <section className={styles.section}><SectionTitle eyebrow="07 · FAMILY" title="가족과 생활" /><p className={styles.lead}>{sample.family}</p></section> : null}

    <section className={styles.section}><SectionTitle eyebrow="08 · LIFE MAP" title="운의결 인생지도"><p>점수가 아니라, 지금 강하게 움직이는 삶의 테마를 한눈에 봅니다.</p></SectionTitle><div className={styles.radarWrap} aria-label="자원, 역할, 표현, 관계, 변화의 테마 활성도"><svg className={styles.radar} viewBox="0 0 300 300" role="img" aria-hidden="true"><polygon className={styles.radarGrid} points="150,40 255,116 215,240 85,240 45,116" /><polygon className={styles.radarGrid} points="150,72 224,126 196,212 104,212 76,126" /><line x1="150" y1="150" x2="150" y2="40" /><line x1="150" y1="150" x2="255" y2="116" /><line x1="150" y1="150" x2="215" y2="240" /><line x1="150" y1="150" x2="85" y2="240" /><line x1="150" y1="150" x2="45" y2="116" /><polygon className={styles.radarData} points="150,62 208,131 190,205 114,198 83,128" />{sample.lifeMap.axes.map((axis) => <text key={axis.label} x={axis.x} y={axis.y} textAnchor="middle">{axis.label}</text>)}</svg><span className={styles.radarCenter}>현재의<br />선택</span></div><p className={styles.strongestThemes}><b>현재 가장 강하게 움직이는 두 가지 주제</b>{sample.lifeMap.strongestThemes}</p></section>

    <section className={`${styles.section} ${styles.tarotSection}`}><SectionTitle eyebrow="09 · CROSS READING" title="사주 × 타로 교차리딩" />{sample.tarotCardLabel ? <div className={styles.tarotGrid}><div className={styles.tarotCard}>{sample.tarotCardLabel}</div><div><p className={styles.tarotLabel}>CROSS READING</p><h3>서로 다른 두 읽기가 현재의 선택을 어떻게 비추는지 살펴봅니다.</h3><p>실제로 뽑은 카드가 있을 때에만 사주 신호와 함께 읽습니다.</p></div></div> : null}<div className={styles.crossSignals}>{sample.crossReading.map((item) => <article key={item.label}><h3>{item.label}</h3><p>{item.body}</p></article>)}</div></section>
    {sample.actionGuide ? <section className={styles.section}><SectionTitle eyebrow="10 · ACTION GUIDE" title="지금의 행동 가이드" /><div className={styles.relationshipInsights}>{sample.actionGuide.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section> : null}

    <section className={styles.cta}><p>UNYEOGYEOL · ADULT V2</p><h2>당신의 흐름은<br />여기서부터 달라집니다.</h2><span>생년월일과 출생시간을 바탕으로<br />나만의 흐름과 현재의 선택을 읽어드립니다.</span><a href="/fortune">내 운의결 리포트 시작하기</a><small>성향 · 인생 흐름 · 돈과 커리어 · 관계 ·<br />사주 × 타로 교차리딩</small><strong>한 사람의 흐름을 가볍게 소비하지 않습니다.</strong></section>
  </main>;
}

/** Internal sample-only route. It never reads customer reports. */
export function AdultV2Preview() {
  return <AdultV2Document sample={ADULT_V2_PREVIEW_SAMPLE} />;
}

/** Customer renderer: callers must provide a validated, persisted production contract. */
export function AdultV2ReportView({ data }: { data: AdultV2ReportData }) {
  return <AdultV2Document sample={adultV2ReportToPresentation(data)} />;
}
