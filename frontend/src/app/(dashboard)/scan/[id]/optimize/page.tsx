import { OptimizeView } from "./optimize-view";

export default async function OptimizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OptimizeView scanId={id} />;
}
