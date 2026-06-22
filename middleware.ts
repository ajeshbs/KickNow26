import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Under Development</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; color: #a0a0c0; margin-bottom: 0.5rem; }
    .icon { font-size: 5rem; margin-bottom: 1.5rem; }
    @media (max-width: 600px) {
      h1 { font-size: 2rem; }
      p { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚧</div>
    <h1>Under Development</h1>
    <p>This site is currently being updated.</p>
    <p>We are currently experiencing bandwidth related issues and are actively fixing the server for smoother streaming experience. Please come back later.</p>
  </div>
</body>
</html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
