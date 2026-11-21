import { LegalH2, LegalShell } from "@/components/landing/legal-shell";

export const metadata = {
  title: "Privacy Policy · WPC CRM",
  description:
    "How Web Product Creator collects, uses, and protects data in WPC CRM.",
};

const HELP_EMAIL =
  process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="22 November 2026">
      <section className="space-y-3">
        <LegalH2>1. Who we are</LegalH2>
        <p>
          WPC CRM is operated by Web Product Creator (&quot;we&quot;,
          &quot;us&quot;). This policy explains how we handle information when
          you use our website, app, and related services.
        </p>
        <p>
          Contact:{" "}
          <a
            href={`mailto:${HELP_EMAIL}`}
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            {HELP_EMAIL}
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>2. Information we collect</LegalH2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account data</strong> — name, email, password (stored hashed),
            and business details you provide during signup.
          </li>
          <li>
            <strong>Business CRM data</strong> — leads, contacts, deals,
            follow-ups, payments, invoices, portfolio, team members, and related
            records you or your staff enter.
          </li>
          <li>
            <strong>Payment data</strong> — subscription status and plan. Card
            and UPI payments are processed by Razorpay; we do not store full card
            numbers.
          </li>
          <li>
            <strong>Usage data</strong> — basic logs needed to run and secure the
            service (for example sign-in time and device/browser type).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <LegalH2>3. How we use information</LegalH2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide and improve WPC CRM for your business</li>
          <li>Authenticate users and manage team access</li>
          <li>Process subscriptions and send billing-related notices</li>
          <li>Respond to support requests</li>
          <li>Protect against abuse, fraud, and security incidents</li>
        </ul>
        <p>We do not sell your CRM customer lists to third parties.</p>
      </section>

      <section className="space-y-3">
        <LegalH2>4. Sharing</LegalH2>
        <p>We share data only when needed to operate the product, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Hosting and database providers</li>
          <li>Razorpay for payments and subscriptions</li>
          <li>When required by law or to protect our rights and users</li>
        </ul>
      </section>

      <section className="space-y-3">
        <LegalH2>5. Data retention &amp; deletion</LegalH2>
        <p>
          We keep account and business data while your subscription is active
          and as needed for legal, tax, or security reasons. Soft-deleted records
          may remain in backups for a limited period. You can request account
          deletion by emailing {HELP_EMAIL}.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>6. Security</LegalH2>
        <p>
          We use industry-standard measures such as encrypted connections
          (HTTPS), hashed passwords, and access controls. No method of
          transmission or storage is 100% secure.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>7. Your responsibilities</LegalH2>
        <p>
          You are responsible for the personal data of your customers and leads
          that you upload into WPC CRM, and for having a lawful basis to process
          that data under applicable Indian laws.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>8. Changes</LegalH2>
        <p>
          We may update this policy from time to time. The &quot;Last
          updated&quot; date at the top will change when we do. Continued use of
          WPC CRM after updates means you accept the revised policy.
        </p>
      </section>
    </LegalShell>
  );
}
