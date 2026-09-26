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
  title: "Terms and Conditions — Divyash Digital",
  description:
    "The terms and conditions governing your use of the Divyash Digital website and services.",
};

const LAST_UPDATED = "March 13, 2025";

const CONTENTS: LegalSection[] = [
  { id: "interpretation", label: "Interpretation and Definitions" },
  { id: "acknowledgment", label: "Acknowledgment" },
  { id: "payment-terms", label: "Payment Terms" },
  { id: "links", label: "Links to Other Websites" },
  { id: "termination", label: "Termination" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "disclaimer", label: '"AS IS" and "AS AVAILABLE" Disclaimer' },
  { id: "governing-law", label: "Governing Law" },
  { id: "disputes", label: "Disputes Resolution" },
  { id: "eu-users", label: "For European Union (EU) Users" },
  { id: "us-compliance", label: "United States Legal Compliance" },
  { id: "severability", label: "Severability and Waiver" },
  { id: "translation", label: "Translation Interpretation" },
  { id: "changes", label: "Changes to These Terms" },
  { id: "contact", label: "Contact Us" },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalDocLayout
      title="Terms and Conditions"
      lastUpdated={LAST_UPDATED}
      sections={CONTENTS}
      intro={<p>Please read these terms and conditions carefully before using Our Service.</p>}
    >
      <Section id="interpretation" title="Interpretation and Definitions">
        <SubHeading>Interpretation</SubHeading>
        <p>
          The words of which the initial letter is capitalized have meanings defined under the
          following conditions. The following definitions shall have the same meaning regardless of
          whether they appear in singular or in plural.
        </p>

        <SubHeading>Definitions</SubHeading>
        <p>For the purposes of these Terms and Conditions:</p>

        <Term term="Affiliate">
          means an entity that controls, is controlled by or is under common control with a party,
          where &quot;control&quot; means ownership of 50% or more of the shares, equity interest or
          other securities entitled to vote for election of directors or other managing authority.
        </Term>
        <Term term="Country">refers to: Delhi, India</Term>
        <Term term="Company">
          (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or
          &quot;Our&quot; in this Agreement) refers to Divyash Digital, Flat no-577, Lig flats,
          Hastsal Village, Uttam Nagar, New Delhi-11059.
        </Term>
        <Term term="Device">
          means any device that can access the Service such as a computer, a cellphone or a digital
          tablet.
        </Term>
        <Term term="Service">refers to the Website.</Term>
        <Term term="Terms and Conditions">
          (also referred as &quot;Terms&quot;) mean these Terms and Conditions that form the entire
          agreement between You and the Company regarding the use of the Service.
        </Term>
        <Term term="Third-party Social Media Service">
          means any services or content (including data, information, products or services) provided
          by a third-party that may be displayed, included or made available by the Service.
        </Term>
        <Term term="Website">
          refers to Divyash Digital: #1 Digital Marketing Agency, accessible from{" "}
          <a href="https://divyashdigital.co.in/" target="_blank" rel="noopener noreferrer" className="text-coral-500 hover:underline">
            https://divyashdigital.co.in/
          </a>
        </Term>
        <Term term="You">
          means the individual accessing or using the Service, or the company, or other legal entity
          on behalf of which such individual is accessing or using the Service, as applicable.
        </Term>
      </Section>

      <Section id="acknowledgment" title="Acknowledgment">
        <p>
          These are the Terms and Conditions governing the use of this Service and the agreement that
          operates between You and the Company. These Terms and Conditions set out the rights and
          obligations of all users regarding the use of the Service.
        </p>
        <p>
          Your access to and use of the Service is conditioned on Your acceptance of and compliance
          with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and
          others who access or use the Service.
        </p>
        <p>
          By accessing or using the Service You agree to be bound by these Terms and Conditions. If
          You disagree with any part of these Terms and Conditions then You may not access the
          Service.
        </p>
        <p>
          You represent that you are over the age of 18. The Company does not permit those under 18 to
          use the Service.
        </p>
        <p>
          Your access to and use of the Service is also conditioned on Your acceptance of and
          compliance with the Privacy Policy of the Company. Our{" "}
          <Link href="/privacy-policy" className="font-medium text-coral-500 hover:underline">
            Privacy Policy
          </Link>{" "}
          describes Our policies and procedures on the collection, use and disclosure of Your personal
          information when You use the Application or the Website and tells You about Your privacy
          rights and how the law protects You. Please read Our Privacy Policy carefully before using
          Our Service.
        </p>
      </Section>

      <Section id="payment-terms" title="Payment Terms">
        <div className="rounded-xl border border-coral-500/30 bg-coral-500/[0.06] p-5">
          <p className="font-semibold text-[var(--ink)]">Please note</p>
          <p className="mt-2">
            In the initial (first) month, we follow a 50-50 payment model to establish trust and
            demonstrate results. After the completion of the first month&apos;s service and full
            payment, we require full advance payments for subsequent months as we also bear
            operational expenses including team salaries, platform fees, and service efforts.
          </p>
        </div>
      </Section>

      <Section id="links" title="Links to Other Websites">
        <p>
          Our Service may contain links to third-party web sites or services that are not owned or
          controlled by the Company.
        </p>
        <p>
          The Company has no control over, and assumes no responsibility for, the content, privacy
          policies, or practices of any third party web sites or services. You further acknowledge and
          agree that the Company shall not be responsible or liable, directly or indirectly, for any
          damage or loss caused or alleged to be caused by or in connection with the use of or
          reliance on any such content, goods or services available on or through any such web sites
          or services.
        </p>
        <p>
          We strongly advise You to read the terms and conditions and privacy policies of any
          third-party web sites or services that You visit.
        </p>
      </Section>

      <Section id="termination" title="Termination">
        <p>
          We may terminate or suspend Your access immediately, without prior notice or liability, for
          any reason whatsoever, including without limitation if You breach these Terms and
          Conditions.
        </p>
        <p>Upon termination, Your right to use the Service will cease immediately.</p>
      </Section>

      <Section id="liability" title="Limitation of Liability">
        <p>
          Notwithstanding any damages that You might incur, the entire liability of the Company and
          any of its suppliers under any provision of this Terms and Your exclusive remedy for all of
          the foregoing shall be limited to the amount actually paid by You through the Service or 100
          USD if You haven&apos;t purchased anything through the Service.
        </p>
        <p>
          To the maximum extent permitted by applicable law, in no event shall the Company or its
          suppliers be liable for any special, incidental, indirect, or consequential damages
          whatsoever (including, but not limited to, damages for loss of profits, loss of data or
          other information, for business interruption, for personal injury, loss of privacy arising
          out of or in any way related to the use of or inability to use the Service, third-party
          software and/or third-party hardware used with the Service, or otherwise in connection with
          any provision of this Terms), even if the Company or any supplier has been advised of the
          possibility of such damages and even if the remedy fails of its essential purpose.
        </p>
        <p>
          Some states do not allow the exclusion of implied warranties or limitation of liability for
          incidental or consequential damages, which means that some of the above limitations may not
          apply. In these states, each party&apos;s liability will be limited to the greatest extent
          permitted by law.
        </p>
      </Section>

      <Section id="disclaimer" title='"AS IS" and "AS AVAILABLE" Disclaimer'>
        <p>
          The Service is provided to You &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; and with all
          faults and defects without warranty of any kind. To the maximum extent permitted under
          applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and
          their respective licensors and service providers, expressly disclaims all warranties,
          whether express, implied, statutory or otherwise, with respect to the Service, including all
          implied warranties of merchantability, fitness for a particular purpose, title and
          non-infringement, and warranties that may arise out of course of dealing, course of
          performance, usage or trade practice. Without limitation to the foregoing, the Company
          provides no warranty or undertaking, and makes no representation of any kind that the
          Service will meet Your requirements, achieve any intended results, be compatible or work
          with any other software, applications, systems or services, operate without interruption,
          meet any performance or reliability standards or be error free or that any errors or defects
          can or will be corrected.
        </p>
        <p>
          Without limiting the foregoing, neither the Company nor any of the company&apos;s provider
          makes any representation or warranty of any kind, express or implied:
        </p>
        <Bullets
          items={[
            "as to the operation or availability of the Service, or the information, content, and materials or products included thereon;",
            "that the Service will be uninterrupted or error-free;",
            "as to the accuracy, reliability, or currency of any information or content provided through the Service; or",
            "that the Service, its servers, the content, or e-mails sent from or on behalf of the Company are free of viruses, scripts, trojan horses, worms, malware, timebombs or other harmful components.",
          ]}
        />
        <p>
          Some jurisdictions do not allow the exclusion of certain types of warranties or limitations
          on applicable statutory rights of a consumer, so some or all of the above exclusions and
          limitations may not apply to You. But in such a case the exclusions and limitations set
          forth in this section shall be applied to the greatest extent enforceable under applicable
          law.
        </p>
      </Section>

      <Section id="governing-law" title="Governing Law">
        <p>
          The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and
          Your use of the Service. Your use of the Application may also be subject to other local,
          state, national, or international laws.
        </p>
      </Section>

      <Section id="disputes" title="Disputes Resolution">
        <p>
          If You have any concern or dispute about the Service, You agree to first try to resolve the
          dispute informally by contacting the Company.
        </p>
      </Section>

      <Section id="eu-users" title="For European Union (EU) Users">
        <p>
          If You are a European Union consumer, you will benefit from any mandatory provisions of the
          law of the country in which You are resident.
        </p>
      </Section>

      <Section id="us-compliance" title="United States Legal Compliance">
        <p>
          You represent and warrant that (i) You are not located in a country that is subject to the
          United States government embargo, or that has been designated by the United States
          government as a &quot;terrorist supporting&quot; country, and (ii) You are not listed on any
          United States government list of prohibited or restricted parties.
        </p>
      </Section>

      <Section id="severability" title="Severability and Waiver">
        <SubHeading>Severability</SubHeading>
        <p>
          If any provision of these Terms is held to be unenforceable or invalid, such provision will
          be changed and interpreted to accomplish the objectives of such provision to the greatest
          extent possible under applicable law and the remaining provisions will continue in full
          force and effect.
        </p>

        <SubHeading>Waiver</SubHeading>
        <p>
          Except as provided herein, the failure to exercise a right or to require performance of an
          obligation under these Terms shall not affect a party&apos;s ability to exercise such right
          or require such performance at any time thereafter nor shall the waiver of a breach
          constitute a waiver of any subsequent breach.
        </p>
      </Section>

      <Section id="translation" title="Translation Interpretation">
        <p>
          These Terms and Conditions may have been translated if We have made them available to You on
          our Service. You agree that the original English text shall prevail in the case of a
          dispute.
        </p>
      </Section>

      <Section id="changes" title="Changes to These Terms and Conditions">
        <p>
          We reserve the right, at Our sole discretion, to modify or replace these Terms at any time.
          If a revision is material We will make reasonable efforts to provide at least 30 days&apos;
          notice prior to any new terms taking effect. What constitutes a material change will be
          determined at Our sole discretion.
        </p>
        <p>
          By continuing to access or use Our Service after those revisions become effective, You agree
          to be bound by the revised terms. If You do not agree to the new terms, in whole or in part,
          please stop using the website and the Service.
        </p>
      </Section>

      <Section id="contact" title="Contact Us">
        <p>If you have any questions about these Terms and Conditions, You can contact us:</p>
        <ul className="space-y-3 pt-1">
          <li>
            By email:{" "}
            <a href="mailto:divyash.digital@gmail.com" className="font-medium text-coral-500 hover:underline">
              divyash.digital@gmail.com
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
            </a>{" "}
            /{" "}
            <a href="tel:+919266452029" className="font-medium text-coral-500 hover:underline">
              +91 92664 52029
            </a>
          </li>
        </ul>
      </Section>
    </LegalDocLayout>
  );
}
