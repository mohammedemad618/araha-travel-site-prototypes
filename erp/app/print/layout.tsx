import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

/** Paper-style layout for invoices and receipts (no app chrome). */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-canvas py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] justify-end px-4">
        <PrintButton />
      </div>
      <div className="print-sheet mx-auto max-w-[820px] rounded-xl border border-line bg-white p-10 shadow-sm">
        {children}
      </div>
    </div>
  );
}
