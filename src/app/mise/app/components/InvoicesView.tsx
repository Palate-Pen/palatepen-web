'use client';
import { useAuth } from '@/context/AuthContext';
import ProGate from './ProGate';

export default function InvoicesView() {
  const { tier } = useAuth();
  return (
    <ProGate feature="invoice" title="Invoice Scanning" tier={tier}
      desc="Photograph any supplier invoice. Claude AI extracts every ingredient, quantity and price into your ingredients bank instantly.">
      <div className="p-8 font-epilogue">
        <h1 className="font-fraunces font-light text-3xl text-mise-text mb-2">Invoices & Ingredients Bank</h1>
        <p className="text-sm text-mise-faint mb-8">Pro feature active — invoice scanning available on mobile app</p>
        <div className="bg-mise-surface border border-mise-border p-8 text-center">
          <p className="text-4xl mb-4">📱</p>
          <p className="font-fraunces font-light text-xl text-mise-text mb-3">Invoice scanning on mobile</p>
          <p className="text-sm text-mise-dim max-w-sm mx-auto leading-relaxed">Use the Mise mobile app to photograph invoices with your camera. Your ingredients bank syncs automatically to this web app.</p>
        </div>
      </div>
    </ProGate>
  );
}