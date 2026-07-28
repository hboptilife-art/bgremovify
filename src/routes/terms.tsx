import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — BgRemovify" },
      { name: "description", content: "The terms that govern your use of BgRemovify." },
      { property: "og:title", content: "Terms of Service — BgRemovify" },
      { property: "og:description", content: "The terms that govern your use of BgRemovify." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="container mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 9, 2026</p>

      <section className="space-y-6 text-foreground/90 leading-relaxed">
        <p>
          By accessing or using BgRemovify (the "Service") you agree to be bound by these Terms of Service.
          If you do not agree, please do not use the Service.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">1. Use of the Service</h2>
          <p>
            BgRemovify is provided free of charge for personal and commercial use. You agree not to use the
            Service to process content that is unlawful, infringing, or harmful, and not to attempt to disrupt
            the Service or its underlying infrastructure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Your content</h2>
          <p>
            You retain all rights to the images you process. Because background removal runs in your browser,
            we do not receive copies of your images. You are solely responsible for ensuring you have the right
            to process the images you upload.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Intellectual property</h2>
          <p>
            The BgRemovify name, logo, website, and software are owned by us and protected by applicable laws.
            You may not copy, modify or redistribute the Service without permission.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Disclaimer of warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind. We do not
            guarantee uninterrupted availability or that results will be free of errors.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, BgRemovify shall not be liable for any indirect, incidental,
            or consequential damages arising from your use of the Service.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Changes</h2>
          <p>We may update these Terms at any time. Continued use of the Service after changes means you accept the new Terms.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
          <p>For any questions, please use our <Link to="/contact" className="underline">contact page</Link>.</p>
        </div>
      </section>
    </article>
  );
}
