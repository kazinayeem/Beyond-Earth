import Link from 'next/link';
import { AuthFrame } from '@/components/network/AuthFrame';
import { ForgotForm } from '@/components/network/AuthForms';

export const metadata = { title: 'Reset password · Mission Control' };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame eyebrow="Account recovery" title="Reset your password" subtitle="We will email you a secure link to choose a new password."
      footer={<Link href="/login" className="text-cyan-300 hover:text-cyan-100">Back to sign in</Link>}>
      <ForgotForm />
    </AuthFrame>
  );
}
