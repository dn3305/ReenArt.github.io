import { notFound } from 'next/navigation';
import { paintings } from '../../data/paintings';
import PaintingDetailClient from './PaintingDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

// Generate static params for Next.js build optimization
export async function generateStaticParams() {
  return paintings.map((painting) => ({
    id: painting.id,
  }));
}

export default async function PaintingDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id ? decodeURIComponent(resolvedParams.id).trim() : '';
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_]+/g, '-');

  const painting = paintings.find(
    (p) => p.id === rawId || normalize(p.id) === normalize(rawId)
  );

  if (!painting) {
    notFound();
  }

  return <PaintingDetailClient painting={painting} />;
}
