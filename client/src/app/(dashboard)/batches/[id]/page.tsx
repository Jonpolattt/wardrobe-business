'use client';

import { useParams } from 'next/navigation';
import { BatchDetail } from '@/components/batches/BatchDetail';

export default function BatchPage() {
  const { id } = useParams<{ id: string }>();
  return <BatchDetail id={id} />;
}
