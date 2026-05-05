// components/PlusAlphaLogo.jsx
// F-10: +α SVG 로고 컴포넌트 (신규 색상 없음, 기존 BULL 토큰 사용)

/**
 * @param {{ size?: number, color?: string }} props
 */
export default function PlusAlphaLogo({ size = 32, color = "#34D399" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Plusalpha 로고"
      role="img"
    >
      {/* + 기호 */}
      <text
        x="2"
        y="18"
        fontSize="14"
        fontWeight="500"
        fill={color}
        fontFamily="system-ui, sans-serif"
      >+</text>
      {/* α (이탤릭 Georgia) */}
      <text
        x="10"
        y="22"
        fontSize="22"
        fontWeight="400"
        fill={color}
        fontFamily="Georgia, serif"
        fontStyle="italic"
      >α</text>
    </svg>
  );
}
