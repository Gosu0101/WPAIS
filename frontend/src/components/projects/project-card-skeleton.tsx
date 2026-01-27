"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProjectCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-5 w-12 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-12 bg-muted rounded" />
            <div className="h-4 w-8 bg-muted rounded" />
          </div>
          <div className="h-2 w-full bg-muted rounded" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-12 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
