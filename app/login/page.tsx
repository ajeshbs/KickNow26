import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Login – KICKNOW26',
  description: 'Enter your passlock to access the KICKNOW26 streaming gateway.',
};

export default function LoginPage() {
  return <LoginForm />;
}
