import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl pt-16 text-center">
      <p className="font-display text-6xl font-extrabold text-[color:var(--brand-primary)]">404</p>
      <h1 className="mt-3 text-xl font-semibold">This page does not exist</h1>
      <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Check the address, or go back and track a shipment.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
