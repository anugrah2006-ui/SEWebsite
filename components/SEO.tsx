import React from 'react';

interface JSONLDProps {
  data: Record<string, any>;
}

export function JSONLD({ data }: JSONLDProps): JSX.Element {
  return (
    <script
      type="application/ld+json"
      // We intentionally stringify here; consumer passes trusted schema object.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
