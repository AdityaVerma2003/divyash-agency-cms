import type { Metadata } from "next";
import Link from "next/link";
import LegalDocLayout, {
  LegalSectionBlock as Section,
  LegalSubHeading as SubHeading,
  LegalTerm as Term,
  LegalBullets as Bullets,
  type LegalSection,
} from "@/components/LegalDocLayout";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy — Divyash Digital",
  description:
    "How cancellations, returns and refunds work for purchases made with Divyash Digital.",
};

const LAST_UPDATED = "April 14, 2025";

const CONTENTS: LegalSection[] = [
  { id: "interpretation", label: "Interpretation and Definitions" },
  { id: "cancellation", label: "Your Order Cancellation Rights" },
  { id: "conditions", label: "Conditions for Returns" },
  { id: "returning", label: "Returning Goods" },
  { id: "gifts", label: "Gifts" },
  { id: "contact", label: "Contact Us" },
];

export default function RefundPolicyPage() {
  return (
    <LegalDocLayout
      title="Cancellation and Refund Policy"
      lastUpdated={LAST_UPDATED}
      sections={CONTENTS}
      intro={
        <>
          <p>Thank you for shopping at Divyash Digital.</p>
          <p>
            If, for any reason, You are not completely satisfied with a purchase We invite You to
            review our policy on refunds and returns. The following terms are applicable for any
            products that You purchased with Us.
          </p>
        </>
      }
    >
      <Section id="interpretation" title="Interpretation and Definitions">
        <SubHeading>Interpretation</SubHeading>
        <p>
          The words of which the initial letter is capitalized have meanings defined under the
          following conditions. The following definitions shall have the same meaning regardless of
          whether they appear in singular or in plural.
        </p>

        <SubHeading>Definitions</SubHeading>
        <p>For the purposes of this Return and Refund Policy:</p>

        <Term term="Company">
          (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or
          &quot;Our&quot; in this Agreement) refers to Divyash Digital.
        </Term>
        <Term term="Goods">refer to the items offered for sale on the Service.</Term>
        <Term term="Orders">mean a request by You to purchase Goods from Us.</Term>
        <Term term="Service">refers to the Website.</Term>
        <Term term="Website">
          refers to Divyash Digital, accessible from{" "}
          <a href="https://divyashdigital.co.in/" target="_blank" rel="noopener noreferrer" className="text-coral-500 hover:underline">
            https://divyashdigital.co.in/
          </a>
        </Term>
        <Term term="You">
          means the individual accessing or using the Service, or the company, or other legal entity
          on behalf of which such individual is accessing or using the Service, as applicable.
        </Term>
      </Section>

      <Section id="cancellation" title="Your Order Cancellation Rights">
        <p>You are entitled to cancel Your Order within 7 days without giving any reason for doing so.</p>
        <p>
          The deadline for cancelling an Order is 7 days from the date on which You received the Goods
          or on which a third party you have appointed, who is not the carrier, takes possession of
          the product delivered.
        </p>
        <p>
          In order to exercise Your right of cancellation, You must inform Us of your decision by
          means of a clear statement. You can inform us of your decision by:
        </p>
        <ul className="space-y-3 pt-1">
          <li>
            By email:{" "}
            <a href="mailto:info@divyashdigital.co.in" className="font-medium text-coral-500 hover:underline">
              info@divyashdigital.co.in
            </a>
          </li>
          <li>
            By visiting this page on our website:{" "}
            <Link href="/contact" className="font-medium text-coral-500 hover:underline">
              Contact Us
            </Link>
          </li>
          <li>
            By phone:{" "}
            <a href="tel:+918810376026" className="font-medium text-coral-500 hover:underline">
              +91 88103 76026
            </a>
          </li>
        </ul>
        <p className="pt-2">
          We will reimburse You no later than 14 days from the day on which We receive the returned
          Goods. We will use the same means of payment as You used for the Order, and You will not
          incur any fees for such reimbursement.
        </p>
      </Section>

      <Section id="conditions" title="Conditions for Returns">
        <p>In order for the Goods to be eligible for a return, please make sure that:</p>
        <Bullets
          items={["The Goods were purchased in the last 7 days", "The Goods are in the original packaging"]}
        />

        <p className="pt-2">The following Goods cannot be returned:</p>
        <Bullets
          items={[
            "The supply of Goods made to Your specifications or clearly personalized.",
            "The supply of Goods which according to their nature are not suitable to be returned, deteriorate rapidly or where the date of expiry is over.",
            "The supply of Goods which are not suitable for return due to health protection or hygiene reasons and were unsealed after delivery.",
            "The supply of Goods which are, after delivery, according to their nature, inseparably mixed with other items.",
          ]}
        />
        <p>
          We reserve the right to refuse returns of any merchandise that does not meet the above
          return conditions in our sole discretion.
        </p>
        <p>
          Only regular priced Goods may be refunded. Unfortunately, Goods on sale cannot be refunded.
          This exclusion may not apply to You if it is not permitted by applicable law.
        </p>
      </Section>

      <Section id="returning" title="Returning Goods">
        <p>
          You are responsible for the cost and risk of returning the Goods to Us. You should send the
          Goods at the following address:
        </p>
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 font-medium text-[var(--ink)]">
          Uttam Nagar, New Delhi
        </p>
        <p>
          We cannot be held responsible for Goods damaged or lost in return shipment. Therefore, We
          recommend an insured and trackable mail service. We are unable to issue a refund without
          actual receipt of the Goods or proof of received return delivery.
        </p>
      </Section>

      <Section id="gifts" title="Gifts">
        <p>
          If the Goods were marked as a gift when purchased and then shipped directly to you,
          You&apos;ll receive a gift credit for the value of your return. Once the returned product is
          received, a gift certificate will be mailed to You.
        </p>
        <p>
          If the Goods weren&apos;t marked as a gift when purchased, or the gift giver had the Order
          shipped to themselves to give it to You later, We will send the refund to the gift giver.
        </p>
      </Section>

      <Section id="contact" title="Contact Us">
        <p>If you have any questions about our Returns and Refunds Policy, please contact us:</p>
        <ul className="space-y-3 pt-1">
          <li>
            By email:{" "}
            <a href="mailto:info@divyashdigital.co.in" className="font-medium text-coral-500 hover:underline">
              info@divyashdigital.co.in
            </a>
          </li>
          <li>
            By visiting this page on our website:{" "}
            <Link href="/contact" className="font-medium text-coral-500 hover:underline">
              Contact Us
            </Link>
          </li>
          <li>
            By phone:{" "}
            <a href="tel:+918810376026" className="font-medium text-coral-500 hover:underline">
              +91 88103 76026
            </a>
          </li>
        </ul>
      </Section>
    </LegalDocLayout>
  );
}
