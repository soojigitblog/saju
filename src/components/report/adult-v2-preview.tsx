import { ADULT_V2_PREVIEW_SAMPLE } from "@/lib/adult-v2/preview-sample";
import styles from "./adult-v2-preview.module.css";

const sample = ADULT_V2_PREVIEW_SAMPLE;

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <header className={styles.sectionTitle}>
    <p>{eyebrow}</p>
    <h2>{title}</h2>
    {children}
  </header>;
}

/** Server-rendered, sample-only editorial layout. No report, order, or AI data enters here. */
export function AdultV2Preview() {
  return <main className={styles.page}>
    <section className={styles.cover}>
      <div className={styles.coverGrain} />
      <div className={styles.coverTop}><span>UNYEOGYEOL</span><span>ADULT V2 · SAMPLE</span></div>
      <div className={styles.coverCenter}>
        <p className={styles.coverEyebrow}>결 · 흐름 · 현재의 선택</p>
        <h1>{sample.subject}의<br />인생 지도</h1>
        <div className={styles.coverRule} />
        <p>{sample.subtitle}</p>
      </div>
      <div className={styles.coverBottom}><span>{sample.year}</span><span>PREVIEW EDITION</span></div>
    </section>

    <div className={styles.notice}>이 화면은 디자인과 정보 구조 확인을 위한 샘플입니다. 실제 고객 데이터나 미래 예측 결과가 아닙니다.</div>

    <section className={styles.section}>
      <SectionTitle eyebrow="01 · A PORTRAIT" title="나라는 사람" />
      <p className={styles.lead}>빠르게 답을 고르기보다, 흐름을 충분히 살핀 뒤 자기 기준으로 움직이는 사람입니다.</p>
      <div className={styles.wordRow}>{sample.coreWords.map((word) => <span key={word}>{word}</span>)}</div>
      <p className={styles.bodyCopy}>운의결은 한 문장으로 사람을 규정하지 않습니다. 반복해서 선택하는 방식과 지금 눈앞에 있는 흐름을 함께 살펴, 다음 선택을 더 선명하게 만드는 데 집중합니다.</p>
    </section>

    <section className={`${styles.section} ${styles.tinted}`}>
      <SectionTitle eyebrow="02 · CORE TENDENCY" title="타고난 핵심 성향">
        <p>이런 결은 상황을 이해하고 자기 페이스를 만드는 방식에서 드러납니다.</p>
      </SectionTitle>
      <div className={styles.portraitGrid}>
        <article><b>01</b><h3>관찰 후 결정</h3><p>처음부터 앞서기보다 구조를 읽은 뒤 필요한 순간에 움직입니다.</p></article>
        <article><b>02</b><h3>작은 기준의 힘</h3><p>남의 속도보다 나에게 맞는 기준을 세울 때 오래 갑니다.</p></article>
        <article><b>03</b><h3>정리하는 실행</h3><p>복잡한 일을 내 방식으로 정리할수록 다음 단계가 또렷해집니다.</p></article>
      </div>
    </section>

    <section className={styles.section}>
      <SectionTitle eyebrow="03 · LIFE FLOW" title="인생 흐름 Preview">
        <p>그래프는 실제 운세값이 아닌 Preview용 흐름 표현입니다.</p>
      </SectionTitle>
      <div className={styles.flowChart} aria-label="샘플 인생 흐름 그래프">
        <div className={styles.flowLine} />
        {[18, 43, 28, 63, 48, 78, 57].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
      </div>
      <div className={styles.flowLabels}><span>탐색</span><span>정리</span><span>확장</span><span>선택</span></div>
    </section>

    <section className={`${styles.section} ${styles.darkSection}`}>
      <SectionTitle eyebrow="04 · NEXT FIVE" title="앞으로 5년 Preview">
        <p>미래를 단정하지 않는 테마형 예시입니다.</p>
      </SectionTitle>
      <ol className={styles.yearList}>{sample.years.map((item) => <li key={item.year}><time>{item.year}</time><div><strong>{item.theme}</strong>{item.emphasis && <em>{item.emphasis}</em>}</div><span>↗</span></li>)}</ol>
    </section>

    <section className={styles.section}>
      <SectionTitle eyebrow="05 · WORK & RESOURCE" title="돈과 커리어">
        <p>좋고 나쁨이 아닌, 올해 전면에 나타나는 주제를 보는 예시입니다.</p>
      </SectionTitle>
      <div className={styles.signalList}>{sample.themes.map((theme) => <div key={theme.label}><div><span>{theme.label}</span><b>{theme.level}</b></div><i><i style={{ width: theme.width }} /></i></div>)}</div>
      <blockquote>“무엇을 더 얻을지보다, 지금 가진 자원과 역할을 어떤 기준으로 정리할지에 시선을 둡니다.”</blockquote>
    </section>

    <section className={`${styles.section} ${styles.tinted}`}>
      <SectionTitle eyebrow="06 · RELATIONSHIP" title="사랑과 관계" />
      <div className={styles.relationship}><span>結</span><p>관계에서 중요한 것은 정답을 빨리 찾는 일이 아니라, 나의 기준을 잃지 않고 서로의 속도를 조율하는 일입니다.</p></div>
      <p className={styles.smallCopy}>실제 리포트에서는 계산 근거가 충분한 경우에만 개인화된 문장으로 이어집니다.</p>
    </section>

    <section className={styles.section}>
      <SectionTitle eyebrow="07 · LIFE MAP" title="운의결 인생지도" />
      <div className={styles.map}><span className={styles.mapCenter}>현재의<br />선택</span><span className={styles.mapOne}>결</span><span className={styles.mapTwo}>흐름</span><span className={styles.mapThree}>관계</span><span className={styles.mapFour}>일</span></div>
      <p className={styles.centerCopy}>한 번의 답보다, 지금의 나와 앞으로의 선택이 이어지는 지도를 만듭니다.</p>
    </section>

    <section className={`${styles.section} ${styles.tarotSection}`}>
      <SectionTitle eyebrow="08 · CROSS READING" title="사주 × 타로 교차리딩 Preview" />
      <div className={styles.tarotGrid}><div className={styles.tarotCard}>THE<br />STAR</div><div><p className={styles.tarotLabel}>SAMPLE CROSS READING</p><h3>지금은 답을 서두르기보다, 오래 가져갈 기준을 다시 고르는 장면입니다.</h3><p>실제 교차리딩은 별도 계산·카드 데이터가 검증된 뒤에만 개인 결과로 제공됩니다.</p></div></div>
    </section>

    <section className={styles.cta}>
      <p>UNYEOGYEOL · ADULT V2</p><h2>한 사람의 흐름을<br />가볍게 소비하지 않습니다.</h2><span>현재는 내부 Preview 전용 화면입니다.</span>
    </section>
  </main>;
}
