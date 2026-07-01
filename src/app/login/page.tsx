import AuthRouteScreen from '@/components/AuthRouteScreen';
import { ROUTES, normalizeSafeNextPath } from '@/lib/routes';

interface LoginPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = Array.isArray(params?.next) ? params?.next[0] : params?.next;

  return (
    <AuthRouteScreen
      mode="login"
      nextPath={normalizeSafeNextPath(next, { defaultPath: ROUTES.home })}
    />
  );
}
