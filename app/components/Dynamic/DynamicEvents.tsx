'use client';

import { useState, useEffect } from 'react';
import { client } from '../../../sanity/lib/client';
import { urlFor } from '../../../sanity/lib/image';
import HtmlBlock from '../HtmlBlock';

type DynamicEventsProps = {
  initialHtml: string;
};

const EVENTS_QUERY = `*[_type == "landingPage"][0]{
  events[]->{
    title,
    date,
    location,
    description,
    type,
    "imageUrl": image.asset->url,
    link
  }
}`;

export default function DynamicEvents({ initialHtml }: DynamicEventsProps) {
  const [events, setEvents] = useState<any[] | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchEvents = async () => {
      try {
        const data = await client.fetch(EVENTS_QUERY);
        if (data && data.events) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();

    // Real-time subscription
    const subscription = client
      .listen(EVENTS_QUERY)
      .subscribe((update) => {
        // Simple re-fetch on any update to keep it simple and robust
        fetchEvents();
      });

    return () => subscription.unsubscribe();
  }, []);

  // Use initial static HTML if no dynamic content is loaded yet or is empty
  // Ideally, we want to transition smoothly.
  // If 'events' is null, it might mean loading or no data.
  // We'll stick to initialHtml if null.
  if (!events || events.length === 0) {
    return <HtmlBlock id="info-grid" html={initialHtml} />;
  }

  return (
    <section className="py-20 bg-black text-white" id="events-dynamic">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center text-[#e94560]">
          Upcoming Events
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event: any, idx: number) => (
            <div
              key={idx}
              className="bg-[#16213e] p-6 rounded-xl border border-[#0f3460] hover:border-[#e94560] transition-colors"
            >
              {event.imageUrl && (
                <img
                  src={urlFor(event.imageUrl).width(400).height(250).url()}
                  alt={event.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-[#0f3460] rounded text-blue-200 uppercase tracking-wider">
                  {event.type === 'partner' ? 'Partner Event' : 'Meetup'}
                </span>
                {event.date && (
                  <span className="text-sm text-gray-400">
                    {new Date(event.date).toLocaleDateString()}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2 text-white">
                {event.title}
              </h3>
              
              {event.location && (
                 <p className="text-sm text-gray-400 mb-4 flex items-center gap-1">
                   📍 {event.location}
                 </p>
              )}

              {event.description && (
                <p className="text-gray-300 mb-6 line-clamp-3">
                  {event.description}
                </p>
              )}

              {event.link && (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full text-center py-2 px-4 bg-[#e94560] hover:bg-[#c33c50] text-white rounded-lg font-medium transition-colors"
                >
                  Register Now
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
