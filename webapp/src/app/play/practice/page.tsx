import ChessboardComp from '@/components/ChessboardComp';

export default async function PracticePage({
  searchParams
}: {
  searchParams: Promise<{ matein?: 'm3' | 'm6' | 'm9' | 'm12' | 'm15' | string }>;
}) {
  const params = await searchParams;
  const matein = (params?.matein as 'm3' | 'm6' | 'm9' | 'm12' | 'm15') || 'm3';

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Practice</h1>
      <p className="text-slate-700 mb-6">Work on puzzles without affecting your rating.</p>
      <ChessboardComp matein={matein} />
    </main>
  );
}


