import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
