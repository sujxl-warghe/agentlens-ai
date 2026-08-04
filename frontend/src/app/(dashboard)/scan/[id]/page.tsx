import { ScanView } from "./scan-view";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScanView scanId={id} />;
}
