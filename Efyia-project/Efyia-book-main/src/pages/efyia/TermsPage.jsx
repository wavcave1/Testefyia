export default function TermsPage() {
  return (
    <div className="eyf-page">
      <section className="eyf-section" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
        <div className="eyf-card eyf-stack" style={{ padding: '2.5rem', lineHeight: 1.75 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', margin: '0 0 0.3rem' }}>Terms of Service</h1>
            <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              <strong>Efyiabook Inc.</strong> &nbsp;·&nbsp; Effective Date: April 14, 2026 &nbsp;·&nbsp; Last Updated: April 14, 2026
            </p>
          </div>

          <div
            style={{
              background: 'rgba(98,243,212,0.06)',
              border: '1px solid rgba(98,243,212,0.2)',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              fontSize: '0.875rem',
            }}
          >
            <strong style={{ color: 'var(--mint)' }}>PLEASE READ THESE TERMS CAREFULLY.</strong>{' '}
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree, do not use our Services.
          </div>

          <LegalSection title="1. Acceptance of Terms">
            <p>
              These Terms of Service constitute a legally binding agreement between you ("User," "you," or "your") and Efyiabook
              Inc., governing your access to and use of the efyiabook platform and all associated services, features, content,
              and functionality. Your continued use of the Services constitutes your ongoing acceptance of any revisions to
              these Terms.
            </p>
            <p>
              These Terms incorporate by reference our Privacy Policy, Cookie Policy, and any additional guidelines or rules
              posted on our platform, all of which form part of this Agreement.
            </p>
          </LegalSection>

          <LegalSection title="2. Eligibility and Account Registration">
            <h4>2.1 Age Requirements</h4>
            <p>
              You must be at least thirteen (13) years of age to use efyiabook. If you are under the age of eighteen (18),
              you must have the consent of a parent or legal guardian to use our Services. By using the Services, you
              represent and warrant that you meet all applicable eligibility requirements.
            </p>
            <h4>2.2 Account Creation</h4>
            <p>To access certain features of the Services, you may be required to register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during the registration process;</li>
              <li>Maintain and promptly update your account information to keep it accurate and current;</li>
              <li>Maintain the security of your account credentials and not share your password with third parties;</li>
              <li>Notify us immediately upon discovering any unauthorized use of your account;</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
            </ul>
            <p>
              Efyiabook reserves the right to suspend or terminate accounts that provide false, misleading, or incomplete
              information.
            </p>
          </LegalSection>

          <LegalSection title="3. License Grant and Restrictions">
            <h4>3.1 Limited License</h4>
            <p>
              Subject to your compliance with these Terms, efyiabook grants you a limited, non-exclusive, non-transferable,
              revocable license to access and use the Services for your personal, non-commercial purposes. This license does
              not include:
            </p>
            <ul>
              <li>Reproducing, distributing, publicly displaying, or creating derivative works from any content on the platform without express written permission;</li>
              <li>Reverse engineering, decompiling, disassembling, or attempting to discover the source code of the Services;</li>
              <li>Using data mining, robots, scrapers, or similar data gathering tools;</li>
              <li>Framing or mirroring any portion of the Services without written authorization;</li>
              <li>Selling, reselling, licensing, or commercially exploiting the Services or any content therein.</li>
            </ul>
            <h4>3.2 Intellectual Property</h4>
            <p>
              All intellectual property rights in and to the Services, including but not limited to software, design,
              trademarks, trade names, logos, and content created by efyiabook, are owned exclusively by efyiabook or its
              licensors. Nothing in these Terms transfers any intellectual property rights to you.
            </p>
          </LegalSection>

          <LegalSection title="4. User Content">
            <h4>4.1 Ownership of User Content</h4>
            <p>
              You retain all ownership rights in content you submit, post, or display on or through the Services ("User
              Content"). By providing User Content, you grant efyiabook a worldwide, royalty-free, sublicensable, and
              transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content
              in connection with operating and improving the Services.
            </p>
            <h4>4.2 Content Standards</h4>
            <p>You represent and warrant that your User Content does not:</p>
            <ul>
              <li>Violate any applicable law, regulation, or third-party rights;</li>
              <li>Contain defamatory, obscene, pornographic, abusive, offensive, or otherwise objectionable material;</li>
              <li>Contain viruses, malware, or any other harmful code;</li>
              <li>Constitute spam, phishing, or unauthorized advertising;</li>
              <li>Infringe upon any third-party copyright, trademark, trade secret, or other proprietary right;</li>
              <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity.</li>
            </ul>
            <h4>4.3 Monitoring and Removal</h4>
            <p>
              Efyiabook reserves the right, but not the obligation, to review, monitor, or remove User Content at any time,
              for any reason, without notice. We are not responsible for User Content posted by third parties.
            </p>
          </LegalSection>

          <LegalSection title="5. Prohibited Conduct">
            <p>You agree not to engage in any of the following activities while using the Services:</p>
            <ul>
              <li>Violating any applicable local, national, or international laws or regulations;</li>
              <li>Engaging in fraudulent, deceptive, or misleading activities;</li>
              <li>Harassing, threatening, intimidating, or harming other users;</li>
              <li>Attempting to gain unauthorized access to any portion of the Services or related systems;</li>
              <li>Interfering with or disrupting the integrity or performance of the Services;</li>
              <li>Collecting or harvesting user data without consent;</li>
              <li>Engaging in any conduct that restricts or inhibits anyone's use or enjoyment of the Services;</li>
              <li>Circumventing or manipulating any security or authentication measures.</li>
            </ul>
            <p>
              Violation of any prohibited conduct may result in immediate suspension or termination of your account and may
              be reported to appropriate law enforcement authorities.
            </p>
          </LegalSection>

          <LegalSection title="6. Payments and Subscriptions">
            <h4>6.1 Fees</h4>
            <p>
              Certain features of the Services may require payment. All fees are stated in U.S. dollars (or your local
              currency where applicable) and are non-refundable unless expressly stated otherwise. Efyiabook reserves the
              right to change pricing at any time, with reasonable advance notice to existing subscribers.
            </p>
            <h4>6.2 Subscriptions</h4>
            <p>
              If you purchase a subscription, you authorize efyiabook to charge the applicable fees to your designated
              payment method on a recurring basis. Subscriptions automatically renew unless cancelled at least twenty-four
              (24) hours before the end of the current billing period.
            </p>
            <h4>6.3 Refunds</h4>
            <p>
              Refunds are provided at efyiabook's sole discretion in accordance with our Refund Policy. Requests for refunds
              should be submitted to our customer support team within thirty (30) days of the charge.
            </p>
          </LegalSection>

          <LegalSection title="7. Third-Party Services and Links">
            <p>
              The Services may contain links to third-party websites, services, or applications that are not owned or
              controlled by efyiabook. We have no control over and assume no responsibility for the content, privacy
              policies, or practices of any third-party services. We strongly advise you to review the terms and privacy
              policies of any third-party services you access.
            </p>
            <p>
              Any transactions or dealings you have with third parties found through the Services are solely between you and
              the third party. Efyiabook shall not be liable for any loss or damage of any kind incurred as a result of such
              dealings.
            </p>
          </LegalSection>

          <LegalSection title="8. Disclaimers and Limitation of Liability">
            <h4>8.1 Disclaimer of Warranties</h4>
            <p style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>
              The Services are provided on an "as is" and "as available" basis without warranties of any kind, either express
              or implied, including but not limited to warranties of merchantability, fitness for a particular purpose,
              non-infringement, and any warranties arising from course of dealing or usage of trade. Efyiabook does not
              warrant that the Services will be uninterrupted, error-free, secure, or free of viruses or other harmful
              components.
            </p>
            <h4>8.2 Limitation of Liability</h4>
            <p style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>
              To the maximum extent permitted by applicable law, in no event shall efyiabook, its officers, directors,
              employees, agents, licensors, or service providers be liable for any indirect, incidental, special,
              consequential, exemplary, or punitive damages, including but not limited to loss of profits, data, goodwill, or
              other intangible losses, arising out of or in connection with your use of or inability to use the Services.
              Efyiabook's total aggregate liability shall not exceed the greater of (a) one hundred U.S. dollars ($100.00) or
              (b) the amount paid by you to efyiabook in the twelve (12) months preceding the claim.
            </p>
          </LegalSection>

          <LegalSection title="9. Indemnification">
            <p>
              You agree to defend, indemnify, and hold harmless efyiabook, its affiliates, licensors, service providers,
              employees, agents, officers, and directors from and against any claims, liabilities, damages, judgments, awards,
              losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your
              violation of these Terms, your use of the Services, your User Content, or your violation of any law or the
              rights of a third party.
            </p>
          </LegalSection>

          <LegalSection title="10. Termination">
            <h4>10.1 Termination by You</h4>
            <p>
              You may terminate your account at any time by contacting us at{' '}
              <a href="mailto:support@efyia.com" style={{ color: 'var(--mint)' }}>support@efyia.com</a> or through the
              account settings within the Services. Termination does not entitle you to a refund of any fees paid.
            </p>
            <h4>10.2 Termination by Efyiabook</h4>
            <p>
              Efyiabook may, in its sole discretion, suspend or terminate your access to the Services, with or without
              notice, for any reason, including but not limited to violation of these Terms, suspected fraudulent activity,
              or actions deemed harmful to other users or the integrity of the platform.
            </p>
            <h4>10.3 Effect of Termination</h4>
            <p>
              Upon termination, all rights and licenses granted to you under these Terms will immediately cease. Sections
              pertaining to intellectual property, disclaimers, limitation of liability, indemnification, and dispute
              resolution shall survive any termination.
            </p>
          </LegalSection>

          <LegalSection title="11. Dispute Resolution and Governing Law">
            <h4>11.1 Governing Law</h4>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United
              States of America, without regard to its conflict of law provisions.
            </p>
            <h4>11.2 Arbitration</h4>
            <p>
              Any dispute, controversy, or claim arising out of or relating to these Terms or the Services shall be resolved
              by binding arbitration administered by the American Arbitration Association ("AAA") in accordance with its
              Commercial Arbitration Rules. The arbitration shall take place in Delaware, and the language shall be English.
              The decision of the arbitrator shall be final and binding.
            </p>
            <h4>11.3 Class Action Waiver</h4>
            <p style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>
              You and efyiabook agree that each may bring claims against the other only in your or its individual capacity
              and not as a plaintiff or class member in any purported class, consolidated, or representative proceeding. The
              arbitrator may not consolidate more than one person's claims, and may not otherwise preside over any form of a
              representative or class proceeding.
            </p>
          </LegalSection>

          <LegalSection title="12. Changes to Terms">
            <p>
              Efyiabook reserves the right to modify these Terms at any time. We will notify you of material changes by
              posting an updated version on our website and, where appropriate, via email. Your continued use of the Services
              following the posting of revised Terms constitutes your acceptance of the changes. We encourage you to review
              these Terms periodically.
            </p>
          </LegalSection>

          <LegalSection title="13. General Provisions">
            <h4>13.1 Entire Agreement</h4>
            <p>
              These Terms, together with the Privacy Policy and any other legal notices or policies published by efyiabook on
              the Services, constitute the entire agreement between you and efyiabook regarding your use of the Services.
            </p>
            <h4>13.2 Severability</h4>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be modified to
              the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force
              and effect.
            </p>
            <h4>13.3 Waiver</h4>
            <p>
              No failure by efyiabook to enforce any right or provision of these Terms shall constitute a waiver of such
              right or provision.
            </p>
            <h4>13.4 Assignment</h4>
            <p>
              You may not assign or transfer these Terms or any rights hereunder without efyiabook's prior written consent.
              Efyiabook may assign or transfer these Terms without restriction.
            </p>
          </LegalSection>

          <LegalSection title="14. Contact Information">
            <p>If you have any questions, concerns, or complaints regarding these Terms of Service, please contact us:</p>
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '1rem 1.25rem',
                fontSize: '0.9rem',
                display: 'grid',
                gap: '0.3rem',
              }}
            >
              <strong>Efyiabook Inc.</strong>
              <span>Legal Department</span>
              <a href="mailto:support@efyia.com" style={{ color: 'var(--mint)' }}>support@efyia.com</a>
              <a href="https://www.efyiabook.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mint)' }}>
                www.efyiabook.com
              </a>
            </div>
          </LegalSection>

          <p className="eyf-muted" style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
            © 2026 Efyiabook Inc. All Rights Reserved.
          </p>
        </div>
      </section>
    </div>
  );
}

function LegalSection({ title, children }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          margin: '0 0 0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-secondary)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: '0.9rem',
          color: 'var(--text)',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        {children}
      </div>
    </div>
  );
}
