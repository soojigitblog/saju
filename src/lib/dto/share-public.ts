import type { FreeResultPublicDTO } from "@/lib/dto/free-result-public";

/** Minimal profile info allowed on public share pages. */
export type ShareProfileDisplay = {
  nickname: string;
  birthYearLabel: string | null;
};

export type TarotShareSnapshot = {
  type: "TAROT_READING";
  profile: ShareProfileDisplay;
  questionCategory: string;
  cards: Array<{
    position: string;
    positionLabel: string;
    nameKo: string;
    orientation: string;
    interpretation: string;
  }>;
  fortunePattern: {
    title: string;
    summary: string;
    insightBasis: string[];
  };
  crossInsight: {
    headline: string;
    body: string;
    fortuneBasis: string[];
    tarotBasis: string[];
  };
  closingMessage: string;
  disclaimer: string;
};

export type FreeResultShareSnapshot = {
  type: "FREE_RESULT";
  profile: ShareProfileDisplay;
  result: Omit<FreeResultPublicDTO, "id">;
};

export type ShareSnapshot = FreeResultShareSnapshot | TarotShareSnapshot;

export type PublicShareDTO = {
  shareToken: string;
  sharedAt: string;
  snapshot: ShareSnapshot;
};
