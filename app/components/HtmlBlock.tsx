type HtmlBlockProps = {
  html?: string;
  id?: string;
};

export default function HtmlBlock({ html, id }: HtmlBlockProps) {
  if (!html) return null;

  return (
    <div
      id={id}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
