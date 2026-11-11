import { redirect } from 'next/navigation';
import { AuthFrame } from '@/components/network/AuthFrame';
import { ResetForm } from '@/components/network/AuthForms';
import { getVerifiedUserId } from '@/lib/supabase/server';

export const metadata = { title: 'New password', robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  // The recovery link signs the user in with a short-lived session
  if (!(await getVerifiedUserId())) redirect('/forgot-password');
  return (
    <AuthFrame eyebrow="Account recovery" title="Choose a new password" subtitle="Your recovery session is active for a few minutes.">
      <ResetForm />
    </AuthFrame>
  );
}
