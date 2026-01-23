'use client';

import dynamic from 'next/dynamic';

const Flow = dynamic(() => import('./Flow'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Loading canvas...</div>
    </div>
  ),
});

export function DiagramEditor() {
  return (
    <div className="h-screen w-full">
      <Flow />
    </div>
  );
}
