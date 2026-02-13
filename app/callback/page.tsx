'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code) {
      router.push(`/?code=${code}`);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white gap-4">
      {/* Miro Loading Spinner Style */}
      <div className="w-10 h-10 border-4 border-[#E6E6E6] border-t-[#4262FF] rounded-full animate-spin"></div>
      <p className="text-[#050038] font-medium animate-pulse">Completing Auth...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}