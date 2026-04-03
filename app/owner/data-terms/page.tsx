import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Owner Analytics Data Usage Terms',
  description:
    'Terms governing shop owners\u2019 use of CafeRoam analytics data.',
};

export default function OwnerDataTermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Analytics Data Usage Terms</h1>
      <p className="text-text-meta mt-1 text-sm">
        For verified shop owners — effective 2026-04-03
      </p>

      <section className="mt-8 space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-semibold">
            1. Aggregate and anonymized data only
          </h2>
          <p className="mt-1">
            All analytics data provided through the CafeRoam owner dashboard is
            aggregate and anonymized. Individual user identities are never
            disclosed. Demographic breakdowns are only surfaced when at least 10
            distinct users contribute to a slice (k-anonymity, k≥10).
          </p>
        </div>

        <div>
          <h2 className="font-semibold">2. Prohibited uses</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              You may not attempt to re-identify individual users from aggregate
              data, including by combining analytics data with other datasets.
            </li>
            <li>
              You may not redistribute, sell, or share this analytics data with
              third parties.
            </li>
            <li>
              You may not use analytics data for purposes other than improving
              your shop&apos;s service to customers.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">3. No personal data transfer</h2>
          <p className="mt-1">
            CafeRoam does not transfer personal data to shop owners. Analytics
            data contains only aggregate counts (e.g., total view counts,
            popular visit times). No names, emails, or device identifiers are
            shared.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">4. PDPA compliance obligation</h2>
          <p className="mt-1">
            By accessing the analytics dashboard, you acknowledge that CafeRoam
            operates under Taiwan&apos;s Personal Data Protection Act (PDPA).
            You agree to handle any insights derived from analytics in a manner
            consistent with PDPA obligations. CafeRoam users have been informed
            of and consented to the aggregate sharing of anonymized data with
            verified shop owners at the time of account creation.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">5. User opt-out</h2>
          <p className="mt-1">
            CafeRoam users may opt out of having their data included in shop
            analytics at any time via their profile settings. Opt-out affects
            future data only; existing aggregate counts are not retroactively
            recalculated.
          </p>
        </div>

        <div>
          <h2 className="font-semibold">6. Revocation</h2>
          <p className="mt-1">
            CafeRoam reserves the right to revoke dashboard access if these
            terms are violated. Violation of re-identification prohibitions may
            also trigger legal obligations under Taiwan PDPA Art. 28–41.
          </p>
        </div>
      </section>

      <div className="mt-10 border-t pt-6">
        <Link href="/privacy" className="text-sm underline">
          View full CafeRoam Privacy Policy
        </Link>
      </div>
    </main>
  );
}
