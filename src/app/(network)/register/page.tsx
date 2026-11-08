import Link from 'next/link';
import { AuthFrame } from '@/components/network/AuthFrame';
import { RegisterForm } from '@/components/network/AuthForms';
import { isGoogleEnabled } from '@/lib/network/authSettings';

export const metadata = { title: 'Create account · Mission Control' };

export default async function RegisterPage() {
  return (
    <AuthFrame eyebrow="Pilot registration" title="Join Mission Control" subtitle="You will receive a permanent player ID like MC-7K9X2P."
      footer={<>Already registered? <Link href="/login" className="text-cyan-300 hover:text-cyan-100">Sign in</Link></>}>
      <RegisterForm googleEnabled={await isGoogleEnabled()} />
    </AuthFrame>
  );
}
