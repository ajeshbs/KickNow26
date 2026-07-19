import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in' };

// Rendered by the worker on demand: OpenNext's static-page path 500s on this
// deployment ("ComponentMod.handler is not a function"), so keep it dynamic.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
