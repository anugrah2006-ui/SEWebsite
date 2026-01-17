type LegacyContentProps = {
  html: string;
  bodyAttributes?: Record<string, string>;
};

const buildBodyScript = (attrs: Record<string, string>) => {
  if (!attrs || Object.keys(attrs).length === 0) return '';
  const serialized = JSON.stringify(attrs);
  return `<script>(function(){try{const attrs=${serialized};const body=document.body;Object.entries(attrs).forEach(function([key,value]){body.setAttribute(key,value);});}catch(e){}})();</script>`;
};

export default function LegacyContent({
  html,
  bodyAttributes = {},
}: LegacyContentProps) {
  const content = `${buildBodyScript(bodyAttributes)}${html}`;

  return (
    <div
      id="legacy-page"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
