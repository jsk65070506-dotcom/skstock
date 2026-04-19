import { Html, Head, Main, NextScript } from "next/document";

const ADSENSE_CLIENT = "ca-pub-8044640881453603";
const SITE_URL   = "https://skstock.vercel.app";
const SITE_TITLE = "월급만으론 부족한 우리를 위해";
const SITE_DESC  = "주식 · 부동산 · 가상자산 · 실물자산 · AI 자산 관리 습관, 하루 3분";
const OG_IMAGE   = `${SITE_URL}/og-image.png`;

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* ── 기본 메타 ── */}
        <meta charSet="utf-8" />
        <meta name="description" content={SITE_DESC} />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#07080c" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon.ico" />

        {/* ── Open Graph (카카오톡/페이스북) ── */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="+α" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="+α - AI 자산 관리 습관" />
        <meta property="og:locale" content="ko_KR" />

        {/* ── Twitter Card ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* ── AdSense ── */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
