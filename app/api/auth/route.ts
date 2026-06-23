import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const passlock = process.env.PASSLOCK;

    if (!passlock) {
      return NextResponse.json({ success: true });
    }

    if (password === passlock) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('passlock_authorized', passlock, {
        httpOnly: true,
        secure: true, // Set secure true for safety in cloud environment, Next.js handles it or it will be over HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
