'use client';

import ViewsChart from '@/components/views-chart';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export default function ProfileViewsCard({ total }: { total: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="w-full text-left p-4 rounded-lg border bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <p className="text-sm text-gray-500 mb-1">Total Views</p>
          <p className="text-2xl font-semibold">{total.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-1">
            Click to view daily trend
          </p>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Daily Views (last 30 days)</SheetTitle>
          <SheetDescription>
            Based on recorded view events across your articles.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3">
          <ViewsChart days={30} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
