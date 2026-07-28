import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeCheckoutPricing, computeDynamicTry, findIyzicoPlan, isIyzicoCurrency, type DisplayCurrency } from "./iyzico-plans";
import { fetchUsdTryRate } from "./iyzico-pricing";
import { fetchRatesPerUsd } from "./fx-rates";

const PUBLIC_SITE_URL = "https://bgremovify.com";

/**
 * iyzico Checkout Form başlatır — kullanıcıyı `paymentPageUrl` adresine
 * yönlendireceğiz. Ödeme tamamlanınca iyzico webhook'a POST yapar.
 */
export const createIyzicoCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string; lang?: string; currency?: string; displayCurrency?: string }) => {
    const plan = findIyzicoPlan(String(input?.planId ?? ""));
    if (!plan) throw new Error("invalid_plan");
    const requestedCurrency = String(input?.currency ?? "USD").toUpperCase();
    if (!isIyzicoCurrency(requestedCurrency)) throw new Error(`unsupported_iyzico_currency:${requestedCurrency}`);
    const displayCurrency = String(input?.displayCurrency ?? requestedCurrency).toUpperCase() as DisplayCurrency;
    const rawLang = String(input?.lang ?? "").toLowerCase();
    // iyzico Checkout Form yalnızca "tr" ve "en" locale destekliyor.
    const locale: "tr" | "en" = rawLang === "tr" ? "tr" : "en";
    return { planId: plan.id, locale, currency: requestedCurrency, displayCurrency };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const plan = findIyzicoPlan(data.planId)!;
    const email = (claims as { email?: string })?.email || "customer@bgremovify.com";
    const conversationId = crypto.randomUUID();

    const usdTry = await fetchUsdTryRate();
    const ratesPerUsd = await fetchRatesPerUsd();
    const pricing = computeCheckoutPricing({
      plan,
      billingCurrency: data.currency,
      displayCurrency: data.displayCurrency,
      ratesPerUsd,
      usdTryRate: usdTry,
    });
    const dynamicAmountTry = computeDynamicTry(plan, usdTry);

    const { data: order, error } = await supabase
      .from("iyzico_orders")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        plan_id: plan.id,
        credits: plan.credits,
        amount_try: dynamicAmountTry,
        amount: pricing.amount,
        currency: pricing.currency,
        display_amount: pricing.displayAmount,
        display_currency: pricing.displayCurrency,
        fx_rate: pricing.fxRate,
        description: plan.label,
        status: "pending",
      })
      .select("id, conversation_id")
      .single();
    if (error) throw new Error(error.message);

    const site = process.env.PUBLIC_SITE_URL || PUBLIC_SITE_URL;
    let ip = "85.34.78.112";
    try {
      const detected = getRequestIP({ xForwardedFor: true });
      if (detected) ip = detected;
    } catch { /* SSR IP tespit edilemedi — default kullan */ }

    const { initCheckoutForm } = await import("./iyzico.server");
    const result = await initCheckoutForm({
      conversationId: order.conversation_id,
      amount: pricing.amount,
      currency: pricing.currency,
      description: plan.label,
      basketId: plan.id,
      callbackUrl: `${site}/api/public/webhooks/iyzico`,
      buyerId: userId,
      buyerEmail: email,
      ip,
      locale: data.locale,
    });

    if (result.status !== "success" || !result.paymentPageUrl) {
      await supabase
        .from("iyzico_orders")
        .update({
          status: "failed",
          error_message: result.errorMessage || result.errorCode || "init_failed",
        })
        .eq("id", order.id);
      throw new Error(`iyzico_init_failed:${result.errorMessage || result.errorCode || "unknown"}`);
    }

    if (result.token) {
      await supabase
        .from("iyzico_orders")
        .update({ iyzico_token: result.token })
        .eq("id", order.id);
    }

    return { orderId: order.id, paymentPageUrl: result.paymentPageUrl, amount: pricing.amount, currency: pricing.currency };
  });

export const getIyzicoOrderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    const id = String(input?.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid_id");
    return { orderId: id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("iyzico_orders")
      .select("id, status, plan_id, credits, amount_try, amount, currency, display_amount, display_currency, completed_at, error_message")
      .eq("id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
