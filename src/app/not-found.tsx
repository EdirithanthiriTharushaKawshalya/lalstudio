import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="section inner-page">
      <span className="eyebrow">404</span>
      <h1>A moment out of frame.</h1>
      <p>We couldn’t find this page.</p>
      <Button href="/">Back to the studio</Button>
    </main>
  );
}
