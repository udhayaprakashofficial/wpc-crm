import { LegalH2, LegalShell } from "@/components/landing/legal-shell";

export const metadata = {
  title: "Terms & Conditions · WPC CRM",
  description: "Terms of use for WPC CRM by Web Product Creator.",
};

const HELP_EMAIL =
  process.env.NEXT_PUBLIC_HELP_EMAIL || "webproductcreator@gmail.com";

export default function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="22 November 2026">
      <section className="space-y-3">
        <LegalH2>1. Agreement</LegalH2>
        <p>
          By creating an account or using WPC CRM (&quot;Service&quot;), you
          agree to these Terms &amp; Conditions with Web Product Creator
          (&quot;we&quot;, &quot;us&quot;). If you use the Service on behalf of a
          business, you confirm you are authorised to bind that business.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>2. The service</LegalH2>
        <p>
          WPC CRM is a business management tool for leads, pipeline, payments,
          follow-ups, portfolio, team collaboration, and related features. We
          may add, change, or remove features to improve the product.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>3. Accounts &amp; access</LegalH2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate account information.</li>
          <li>You are responsible for activity under your workspace and team invites.</li>
          <li>
            Keep login credentials confidential. Notify us promptly of
            unauthorised access at {HELP_EMAIL}.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <LegalH2>4. Subscriptions &amp; billing</LegalH2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Access to the CRM requires an active paid plan (Monthly or Yearly)
            unless we state otherwise.
          </li>
          <li>
            Payments are processed by Razorpay. Prices are shown in Indian
            Rupees (₹) and may change with notice on the pricing page.
          </li>
          <li>
            Subscriptions may renew automatically each billing cycle until you
            cancel.
          </li>
          <li>
            You may cancel anytime from Billing; access continues until the end
            of the paid period unless Razorpay or applicable law requires
            otherwise.
          </li>
          <li>
            Fees already paid for the current period are generally
            non-refundable, except where required by law or explicitly offered
            by us.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <LegalH2>5. Acceptable use</LegalH2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for illegal, harmful, or fraudulent activity</li>
          <li>Attempt to break security, scrape, or overload our systems</li>
          <li>Upload malware or content you do not have rights to use</li>
          <li>Resell or misuse the Service without our written permission</li>
        </ul>
      </section>

      <section className="space-y-3">
        <LegalH2>6. Your data</LegalH2>
        <p>
          You retain ownership of data you enter into WPC CRM. You grant us a
          limited licence to host and process that data solely to provide the
          Service. See our{" "}
          <a href="/privacy" className="font-semibold underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>7. Availability &amp; disclaimer</LegalH2>
        <p>
          We aim for reliable uptime but do not guarantee uninterrupted or
          error-free service. The Service is provided &quot;as is&quot; to the
          fullest extent permitted by law. We are not liable for business
          outcomes based on CRM data, missed follow-ups, or third-party outages
          (including payment providers).
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>8. Limitation of liability</LegalH2>
        <p>
          To the maximum extent permitted under Indian law, our total liability
          for claims relating to the Service is limited to the fees you paid us
          for the Service in the three (3) months before the claim.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>9. Termination</LegalH2>
        <p>
          We may suspend or terminate access if you breach these terms or for
          security or legal reasons. You may stop using the Service and cancel
          your plan at any time.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>10. Governing law</LegalH2>
        <p>
          These terms are governed by the laws of India. Courts in India shall
          have exclusive jurisdiction, subject to applicable consumer
          protections.
        </p>
      </section>

      <section className="space-y-3">
        <LegalH2>11. Contact</LegalH2>
        <p>
          For terms or billing questions:{" "}
          <a
            href={`mailto:${HELP_EMAIL}`}
            className="font-semibold underline underline-offset-2"
          >
            {HELP_EMAIL}
          </a>
        </p>
      </section>
    </LegalShell>
  );
}
