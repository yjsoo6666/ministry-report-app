import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// 브라우저가 이 앱에서 불러올 수 있는 것을 같은 주소(self)로만 제한한다.
// - 외부 주소로 스크립트·데이터를 불러오거나 보내는 것을 막아, 내부용 파일이 밖으로 나가는 길을 줄인다.
// - 개발 서버에서만 'unsafe-eval'이 필요하다(React 개발용 기능). 운영(배포)에는 넣지 않는다.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // 다른 사이트가 이 앱을 액자(iframe)로 끼워 넣는 것을 막는다.
  { key: "X-Frame-Options", value: "DENY" },
  // 파일 종류를 브라우저가 멋대로 추측하지 않게 한다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 이동할 때 이 주소를 알려주지 않는다.
  { key: "Referrer-Policy", value: "no-referrer" },
  // 이 앱이 쓰지 않는 기능(카메라, 마이크, 위치)을 꺼 둔다.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // 항상 https로만 접속하게 한다.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // 내부 업무용이라 검색 사이트에 노출되지 않게 한다.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
