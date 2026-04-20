'use client';

import { useSearchParams } from 'next/navigation';
import { NewProcessForm } from './new-process-form';

export function NewProcessFormWrapper() {
  const sp = useSearchParams();
  return <NewProcessForm preselectedClientId={sp.get('client_id')} />;
}
