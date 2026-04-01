import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E06B3F',
        borderRadius: 6,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 800,
        fontSize: 24,
        color: '#FFFAF6',
      }}
    >
      C
    </div>,
    { ...size }
  );
}
