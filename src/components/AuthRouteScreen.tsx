'use client';

import { useRouter } from 'next/navigation';

import AuthScreen from '@/components/AuthScreen';
import { ROUTES, normalizeSafeNextPath } from '@/lib/routes';

interface AuthRouteScreenProps {
  mode: 'login' | 'signup';
  nextPath: string;
}

export default function AuthRouteScreen({ mode, nextPath }: AuthRouteScreenProps) {
  const router = useRouter();

  return (
    <AuthScreen
      initialMode={mode}
      nextPath={nextPath}
      onBack={() => router.push(ROUTES.home)}
      onSuccess={(destination) => {
        router.push(normalizeSafeNextPath(destination, { defaultPath: ROUTES.home }));
      }}
    />
  );
}
