import Link from 'next/link';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import OneLineTags from '@/components/one-line-tags';

export default function ArticleCard({
  article,
  withIcons = false,
}: {
  article: any;
  withIcons?: boolean;
}) {
  return (
    <Link href={`/${article.slug}`} className="block group" tabIndex={-1}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group-hover:shadow-xl">
        <CardHeader>
          {Array.isArray(article.tags) && article.tags.length > 0 ? (
            <div className="mb-2">
              <OneLineTags tags={article.tags} />
            </div>
          ) : null}

          <h3 className="text-2xl font-semibold leading-none tracking-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
            {article.title}
          </h3>
          <CardDescription className="line-clamp-3">
            {article.excerpt}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
