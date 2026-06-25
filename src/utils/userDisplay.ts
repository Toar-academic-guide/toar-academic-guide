import type { User } from '@supabase/supabase-js';

export function getUserInitials(user: User | null | undefined): string | undefined {
  if (!user) return undefined;

  const meta = user.user_metadata;
  const firstName: string | undefined = meta?.first_name || meta?.given_name;
  const lastName: string | undefined = meta?.last_name || meta?.family_name;

  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  const fullName: string | undefined = meta?.full_name || meta?.name;
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  }

  if (!user.email) return undefined;
  const prefix = user.email.split('@')[0];
  const emailParts = prefix.split(/[._-]/);
  if (emailParts.length >= 2) {
    return (emailParts[0][0] + emailParts[1][0]).toUpperCase();
  }
  return prefix.slice(0, 2).toUpperCase();
}
