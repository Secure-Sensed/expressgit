import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl pt-12">
      <Card>
        <CardHeader>
          <CardTitle>Route not found</CardTitle>
          <CardDescription>The requested page does not exist in the new client router.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Return home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
