import { StudioLogo } from "@/components/layout/studio-logo";
export default function Loading() {
  return (
    <div className="page-loading" role="status">
      <StudioLogo />
      <span>Preparing your view…</span>
    </div>
  );
}
