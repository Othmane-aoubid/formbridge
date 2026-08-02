'use client';

import { Honeybadger, HoneybadgerErrorBoundary } from '@honeybadger-io/react';
import '../honeybadger.browser.config';

export default function HoneybadgerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HoneybadgerErrorBoundary honeybadger={Honeybadger}>
      {children}
    </HoneybadgerErrorBoundary>
  );
}
