import { notFound } from 'next/navigation';
import { CooperativeWorld } from '@/features/cooperative-world/CooperativeWorld';
import { sampleWorkspace } from './sample';
const emptyWorkspace = {};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ contoh?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { contoh } = await searchParams;
  return <CooperativeWorld data={contoh ? sampleWorkspace() : emptyWorkspace} preview />;
}
