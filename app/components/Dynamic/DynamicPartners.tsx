'use client';

import { useState, useEffect } from 'react';
import { client } from '../../../sanity/lib/client';
import { urlFor } from '../../../sanity/lib/image';
import HtmlBlock from '../HtmlBlock';

type DynamicPartnersProps = {
  initialHtml: string;
};

const PARTNERS_QUERY = `*[_type == "landingPage"][0]{
  partners[]->{
    name,
    "logoUrl": logo.asset->url,
    url
  }
}`;

export default function DynamicPartners({ initialHtml }: DynamicPartnersProps) {
  const [partners, setPartners] = useState<any[] | null>(null);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const data = await client.fetch(PARTNERS_QUERY);
        if (data && data.partners) {
          setPartners(data.partners);
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      }
    };

    fetchPartners();

    const subscription = client
      .listen(PARTNERS_QUERY)
      .subscribe(() => {
        fetchPartners();
      });

    return () => subscription.unsubscribe();
  }, []);

  if (!partners || partners.length === 0) {
    return <HtmlBlock id="icon-grid" html={initialHtml} />;
  }

  return (
    <section className="py-20 bg-[#0a0a0a] text-white" id="partners-dynamic">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center tracking-tight">
          Ecosystem Partners
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
          {partners.map((partner: any, idx: number) => (
            <a
              key={idx}
              href={partner.url || '#'}
              target={partner.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center p-6 bg-[#111] rounded-xl border border-transparent hover:border-gray-800 transition-all duration-300 grayscale hover:grayscale-0"
            >
              {partner.logoUrl && (
                <img
                  src={urlFor(partner.logoUrl).width(200).url()}
                  alt={partner.name}
                  className="h-12 w-auto object-contain mb-4 transition-transform group-hover:scale-110"
                />
              )}
              <span className="text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
                {partner.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
