/** Client-safe bank types — no credentials. */

export type HanaRawIncomingRow = {
  /** Optional bank-side id */
  id?: string;
  occurredAt: string;
  amount: number;
  depositorName?: string;
  description?: string;
};
