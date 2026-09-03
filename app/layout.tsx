import type { Metadata } from 'next';
import './globals.css';
import './assembly-layout.css';

const productionHost =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(productionHost),
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
