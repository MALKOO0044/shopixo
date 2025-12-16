export const metadata = { title: "Data Deletion | Shopixo" };

export default function DataDeletionPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Data Deletion Policy</h1>
      <p className="mt-4 text-slate-700">
        At <strong>Shopixo</strong>, we are committed to protecting your privacy. This document explains the methods
        available to you to request deletion of your personal data associated with your account or purchases.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Data Deletion Methods</h2>
      <ol className="list-decimal pl-6 mt-3 space-y-3 text-slate-700">
        <li>
          Self-service account deletion: If you have a registered account with us, you can request deletion of your account
          and all associated data from the security page in your account: <a className="text-primary underline" href="/account/security">/account/security</a>.
        </li>
        <li>
          Via email: If you cannot log in or do not have an account, you can send a data deletion request to:
          <a className="text-primary underline" href="mailto:support@shopixo.com">support@shopixo.com</a>
          including the following information:
          <ul className="list-disc pl-6 mt-2">
            <li>Full name.</li>
            <li>Email address used for registration (if any).</li>
            <li>Brief description of the data to be deleted.</li>
          </ul>
        </li>
        <li>
          You can also use our contact page: <a className="text-primary underline" href="/contact">/contact</a> to open a support ticket regarding data deletion.
        </li>
      </ol>

      <h2 className="mt-8 text-xl font-semibold">What Gets Deleted?</h2>
      <p className="mt-3 text-slate-700">
        Upon approval of your request, we will delete or anonymize personal data associated with your account,
        which may include profile information, contact methods, and address history. We may retain certain financial,
        tax, or fraud-related records as required by applicable legal obligations.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Request Processing Time</h2>
      <p className="mt-3 text-slate-700">
        Data deletion requests are typically processed within 7 to 30 days after verifying the identity of the requester.
        We will notify you when the process is complete.
      </p>

      <p className="mt-10 text-xs text-slate-500">Last updated: September 14, 2025</p>
    </div>
  );
}
