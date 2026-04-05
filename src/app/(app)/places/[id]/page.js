import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PlaceDetail from '@/components/places/PlaceDetail';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: place } = await supabase
    .from('places')
    .select('name, nickname')
    .eq('id', id)
    .single();

  return {
    title: place
      ? `${place.nickname || place.name} — Axolocal`
      : 'Place — Axolocal',
  };
}

export default async function PlaceDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: place } = await supabase
    .from('places')
    .select('id')
    .eq('id', id)
    .single();

  if (!place) {
    notFound();
  }

  return <PlaceDetail placeId={id} />;
}
