// app/dashboard/layout.tsx
import { ReactNode } from 'react';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}