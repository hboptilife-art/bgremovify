// Server-only iyzico API yardımcıları.
// Yalnızca server function ve webhook route'undan import edilir.
// iyzico v2 authentication: IYZWSv2 header + HMAC-SHA256 imza.
import { createHmac, randomBytes } from "crypto";

export function getIyzicoCreds() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const baseUrl = process.env.IYZICO_BASE_URL || "https://api.iyzipay.com";
  if (!apiKey || !secretKey) {
    throw new Error("iyzico_not_configured");
  }
  return { apiKey, secretKey, baseUrl };
}

function generateAuthHeader(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  payload: string,
): { authorization: string; randomKey: string } {
  const randomKey = `${Date.now()}-${randomBytes(8).toString("hex")}`;
  const signatureBase = randomKey + uriPath + payload;
  const signature = createHmac("sha256", secretKey).update(signatureBase).digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const authorization = "IYZWSv2 " + Buffer.from(authString).toString("base64");
  return { authorization, randomKey };
}

async function iyzicoRequest<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { apiKey, secretKey, baseUrl } = getIyzicoCreds();
  const payload = JSON.stringify(body);
  const { authorization, randomKey } = generateAuthHeader(apiKey, secretKey, path, payload);

  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": authorization,
      "x-iyzi-rnd": randomKey,
    },
    body: payload,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`iyzico_bad_json:${text.slice(0, 300)}`);
  }
  return data as T;
}

export interface CheckoutFormInitInput {
  conversationId: string;
  amount: number;
  currency: "TRY" | "USD" | "EUR" | "GBP" | "NOK" | "CHF" | "KZT" | "UZS";
  description: string;
  basketId: string;
  callbackUrl: string;
  buyerId: string;
  buyerEmail: string;
  ip: string;
  locale?: "tr" | "en";
}

export interface CheckoutFormInitResponse {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
  conversationId?: string;
  tokenExpireTime?: number;
}

export async function initCheckoutForm(input: CheckoutFormInitInput) {
  const price = input.amount.toFixed(2);
  const body = {
    locale: input.locale ?? "tr",
    conversationId: input.conversationId,
    price,
    paidPrice: price,
    currency: input.currency,
    basketId: input.basketId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: input.currency === "TRY" ? [1, 2, 3, 6, 9] : [1],
    buyer: {
      id: input.buyerId,
      name: "Musteri",
      surname: "Musteri",
      gsmNumber: "+905350000000",
      email: input.buyerEmail,
      identityNumber: "11111111111",
      registrationAddress: "Dijital urun teslimati - bgremovify.com",
      ip: input.ip,
      city: "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: "Dijital Musteri",
      city: "Istanbul",
      country: "Turkey",
      address: "Dijital urun - hesaba anlik kredi tanimlanir",
    },
    billingAddress: {
      contactName: "Dijital Musteri",
      city: "Istanbul",
      country: "Turkey",
      address: "Dijital urun - hesaba anlik kredi tanimlanir",
    },
    basketItems: [
      {
        id: input.basketId,
        name: input.description.slice(0, 100),
        category1: "Dijital Hizmet",
        itemType: "VIRTUAL",
        price,
      },
    ],
  };
  return iyzicoRequest<CheckoutFormInitResponse>(
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    body,
  );
}

export interface CheckoutFormDetailResponse {
  status: string;
  paymentStatus?: string;
  paymentId?: string;
  price?: number;
  paidPrice?: number;
  conversationId?: string;
  errorCode?: string;
  errorMessage?: string;
  currency?: string;
  basketId?: string;
}

export async function retrieveCheckoutForm(input: {
  conversationId: string;
  token: string;
}) {
  return iyzicoRequest<CheckoutFormDetailResponse>(
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    {
      locale: "tr",
      conversationId: input.conversationId,
      token: input.token,
    },
  );
}
