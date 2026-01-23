// Sentry logo component
// Simplified version based on Sentry branding
export const SentryLogo = ({ className = '' }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sentry Logo"
    >
      <title>Sentry Logo</title>
      <circle cx="100" cy="100" r="90" fill="currentColor" opacity="0.1" />
      <path
        d="M100 40C77.909 40 60 57.909 60 80C60 84.971 61.013 89.709 62.863 94.026L75.625 80.625C78.458 77.708 82.5 76 86.875 76H100V40Z"
        fill="currentColor"
      />
      <path
        d="M100 124V160C122.091 160 140 142.091 140 120C140 115.029 138.987 110.291 137.137 105.974L124.375 119.375C121.542 122.292 117.5 124 113.125 124H100Z"
        fill="currentColor"
      />
      <path
        d="M80 100C80 94.477 84.477 90 90 90H110C115.523 90 120 94.477 120 100C120 105.523 115.523 110 110 110H90C84.477 110 80 105.523 80 100Z"
        fill="currentColor"
      />
    </svg>
  );
};
