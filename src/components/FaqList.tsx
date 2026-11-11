import { ChevronDown } from 'lucide-react';

/** "Hỏi nhanh" accordion for landing pages; the page emits the matching FAQPage JSON-LD. */
export function FaqList({ faq }: { faq: { q: string; a: string }[] }) {
  return (
    <section aria-labelledby="faq" className="mt-7">
      <h2 id="faq" className="font-display text-section font-bold">
        Hỏi nhanh
      </h2>
      <div className="mt-2 divide-y divide-line rounded-card bg-surface px-3 shadow-card">
        {faq.map((f, i) => (
          <details key={f.q} open={i === 0} className="group py-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[15px] font-semibold">
              {f.q}
              <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="pb-3 text-[14px] text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
