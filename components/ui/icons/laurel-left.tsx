import { type SVGProps } from "react";

export function LaurelLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 48"
      fill="currentColor"
      {...props}
    >
      <path d="M20 4c-2 2-4 6-4 10s2 8 4 10c-4-1-8-5-8-10s4-9 8-10z" opacity="0.3" />
      <path d="M18 14c-2 2-4 6-4 10s2 8 4 10c-4-1-8-5-8-10s4-9 8-10z" opacity="0.4" />
      <path d="M16 24c-2 2-4 6-4 10s2 8 4 10c-4-1-8-5-8-10s4-9 8-10z" opacity="0.5" />
      <path d="M14 34c-1 1-2 3-2 5s1 4 2 5c-2-.5-4-2.5-4-5s2-4.5 4-5z" opacity="0.6" />
    </svg>
  );
}
