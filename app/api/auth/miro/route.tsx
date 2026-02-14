import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    const response = await fetch('https://api.miro.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_MIRO_CLIENT_ID!,
        client_secret: process.env.MIRO_CLIENT_SECRET!, 
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to exchange token');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}