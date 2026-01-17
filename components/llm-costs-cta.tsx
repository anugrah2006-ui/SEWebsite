import Link from 'next/link';
import { Button } from '@/components/ui/button';

// CTA section for LLM costs - red background variant
export default function LlmCostsCta() {
  return (
    <section className="bg-red-600 text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
          Need quick answers on LLM costs?
        </h2>
        <p className="mx-auto max-w-3xl text-lg mb-10">
          The calculator shows price per request and per token so you can
          explain LLM cost optimization trade-offs with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="sm:min-w-[200px] bg-white hover:bg-gray-100 text-red-600"
          >
            <Link href="/calculator">Calculate my cost</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="sm:min-w-[200px] border-white text-white hover:bg-red-700 bg-red-600 hover:text-white"
          >
            <Link href="/contact">Ask our team</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
