import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Simple top-of-homepage hero section
export default function HomepageHero() {
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-gray-600 mb-4 uppercase">
          LLM Cost Reduction
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Cut your LLM spend right now
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-gray-600 mb-10">
          Use our LLM Cost Calculator to compare pricing, plan LLM cost
          optimization, and pick the plan your team needs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="sm:min-w-[240px] bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Link href="/calculator">Calculate my cost</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="sm:min-w-[240px]"
          >
            <Link href="/contact">Talk with our team</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
