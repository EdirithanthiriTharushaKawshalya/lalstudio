"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section inner-page">
      <h1>A brief pause.</h1>
      <p>
        This page could not be loaded. Please try again or contact the studio.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}
