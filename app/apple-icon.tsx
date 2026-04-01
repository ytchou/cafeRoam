import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#E06B3F',
          borderRadius: 36,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 800,
          fontSize: 128,
          color: '#FFFAF6',
        }}
      >
        C
      </div>
    ),
    { ...size }
  );
}
