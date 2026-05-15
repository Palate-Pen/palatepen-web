import { SafetyShellGate } from '@/components/safety/SafetyShellGate';

export default function SafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SafetyShellGate>{children}</SafetyShellGate>;
}
