/** Client-safe Toss types (no secrets). */

export type TossWidgetCheckoutParams = {
  orderId: string;
  orderName: string;
  amount: number;
  currency: "KRW";
  customerKey: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
};

export type TossConfirmRequest = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type TossPaymentObject = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string | null;
  approvedAt?: string | null;
  card?: { number?: string; company?: string } | null;
  easyPay?: { provider?: string } | null;
  [key: string]: unknown;
};

export type TossErrorBody = {
  code?: string;
  message?: string;
};
