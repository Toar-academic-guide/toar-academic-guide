import AuthRouteScreen from '@/components/AuthRouteScreen';
import { ROUTES, normalizeSafeNextPath } from '@/lib/routes';

export const metadata = { robots: { index: false, follow: true } };

interface SignupPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = Array.isArray(params?.next) ? params?.next[0] : params?.next;

  return (
    <AuthRouteScreen
      mode="signup"
      nextPath={normalizeSafeNextPath(next, { defaultPath: ROUTES.home })}
    />
  );
}
