import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '망원경 설치 실험실 | Telescope Setup Lab',
  description: '중학생을 위한 7단계 망원경 설치 및 관측 시뮬레이션',
  openGraph: {
    title: '망원경 설치 실험실',
    description: '7단계로 완성하는 첫 천체 관측',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: '망원경 설치 실험실' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '망원경 설치 실험실',
    description: '7단계로 완성하는 첫 천체 관측',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
