import { notFound } from 'next/navigation';
import { AssetSheet } from '@/features/cooperative-world/dev/AssetSheet';

export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AssetSheet />;
}
