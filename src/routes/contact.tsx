import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — BgRemovify" },
      { name: "description", content: "Get in touch with the BgRemovify team." },
      { property: "og:title", content: "Contact — BgRemovify" },
      { property: "og:description", content: "Get in touch with the BgRemovify team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <article className="container mx-auto max-w-2xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      <h1 className="text-4xl font-bold tracking-tight mt-4 mb-4">Contact us</h1>
      <p className="text-muted-foreground mb-10 leading-relaxed">
        Questions, feedback, partnership requests or privacy enquiries — we'd love to hear from you.
        We typically respond within 2 business days.
      </p>

      <div className="space-y-4">
        <a
          href="mailto:support@bgremovify.com"
          className="flex items-center gap-4 rounded-2xl border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="size-11 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <Mail className="size-5" />
          </div>
          <div>
            <p className="font-medium">Email</p>
            <p className="text-sm text-muted-foreground">support@bgremovify.com</p>
          </div>
        </a>

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
          <div className="size-11 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
            <MessageCircle className="size-5" />
          </div>
          <div>
            <p className="font-medium">Feedback</p>
            <p className="text-sm text-muted-foreground">Tell us what's working and what could be better.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
