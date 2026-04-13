'use client';

import { AppProgressBar } from 'next-nprogress-bar';

export function ProgressBar() {
  return (
    <AppProgressBar
      color="#2c1810"
      height="3px"
      options={{ showSpinner: false }}
      shallowRouting={false}
    />
  );
}
