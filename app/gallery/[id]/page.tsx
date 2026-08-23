import { notFound } from 'next/navigation';
import { paintings } from '../../data/paintings';
import PaintingDetailClient from './PaintingDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

// Generate static params for Next.js build optimization
export async function generateStaticParams() {
  return paintings.map((painting) => ({
    id: painting.id,
  }));
}

export default async function PaintingDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const painting = paintings.find((p) => p.id === resolvedParams.id);

  if (!painting) {
    notFound();
  }

  return <PaintingDetailClient painting={painting} />;
}
