import { Html, Head, Main, NextScript } from "next/document";

const ADSENSE_CLIENT = "ca-pub-8044640881453603";

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
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
