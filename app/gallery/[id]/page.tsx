import { notFound } from 'next/navigation';
import { getLivePaintings } from '../../../lib/oracleCatalog';
import PaintingDetailClient from './PaintingDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function PaintingDetailPage({ params }: Props) {
  const paintings = await getLivePaintings();
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
