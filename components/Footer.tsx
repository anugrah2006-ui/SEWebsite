import Link from 'next/link';
import Image from 'next/image';
import LlmCostsCta from './llm-costs-cta';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto">
        <LlmCostsCta />
        <div className="max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8 px-4 py-12 sm:px-6 lg:px-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/assets/logo-white.webp"
                alt="LLM Cost Optimizer Logo"
                width={200}
                height={200}
                className="h-10 w-auto object-contain"
                sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px"
                priority
              />
              {/* <span className="text-xl font-bold">LetsReact</span> */}
            </div>
            <p className="text-gray-400 max-w-md">
              llmcostoptimizer.com — Use our LLM Cost Calculator to compare
              pricing, plan LLM cost optimization, and pick the plan your team
              needs.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/posts"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Posts
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap.xml"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Sitemap
                </Link>
              </li>
              {/* Jobs link removed */}
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 mb-8 pt-8 border-t border-gray-800">
          <p className="text-center text-gray-400">
            © {new Date().getFullYear()} llmcostoptimizer.com. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
