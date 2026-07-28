import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BgRemovify" },
      { name: "description", content: "How BgRemovify handles your data, cookies and third-party services." },
      { property: "og:title", content: "Privacy Policy — BgRemovify" },
      { property: "og:description", content: "How BgRemovify handles your data, cookies and third-party services." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16 prose-like">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 9, 2026</p>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <p>
          BgRemovify ("we", "our", "us") respects your privacy. This Privacy Policy explains what information
          we collect, how we use it, and the choices you have when using our website and background-removal tool.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">1. Photos you upload</h2>
          <p>
            Background removal runs entirely in your browser using an on-device AI model. The photos you select
            or drop into BgRemovify are <strong>never uploaded to our servers</strong>. They stay on your device
            and are discarded as soon as you close or refresh the page.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Information we collect</h2>
          <p>
            We collect minimal technical information such as your language preference (stored locally in your
            browser), basic anonymous usage analytics, and standard server logs (IP address, user agent, referrer)
            for security and abuse prevention.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Cookies and local storage</h2>
          <p>
            We use local storage to remember your selected language. We may use cookies for analytics and, if
            enabled, to serve advertising via third-party networks such as Google AdSense.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Third-party advertising</h2>
          <p>
            We may display ads provided by third-party vendors, including Google. These vendors may use cookies
            to serve ads based on your prior visits to this and other websites. You can opt out of personalized
            advertising by visiting <a className="underline" href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer">Google Ads Settings</a> or
            {" "}<a className="underline" href="https://www.aboutads.info" target="_blank" rel="noreferrer">aboutads.info</a>.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Children's privacy</h2>
          <p>BgRemovify is not directed to children under 13 and we do not knowingly collect data from them.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Changes to this policy</h2>
          <p>We may update this policy from time to time. Material changes will be highlighted on this page.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p>Questions? Reach us via our <Link to="/contact" className="underline">contact page</Link>.</p>
        </div>
      </section>
    </article>
  );
}
