export const metadata = { title: 'Connections — Palatable' };

type Service = {
  name: string;
  icon: string;
  status: string;
  connected: boolean;
};

const services: Service[] = [
  { name: 'Square', icon: '🟩', status: 'Connected · 12 May', connected: true },
  { name: 'Resy', icon: '🔷', status: 'Connected · 8 May', connected: true },
  { name: 'Stripe', icon: '💳', status: 'Not connected', connected: false },
  { name: 'Google Calendar', icon: '📅', status: 'Not connected', connected: false },
];

export default function ConnectionsPage() {
  return (
    <div className="px-14 pt-12 pb-20 max-w-[1000px]">
      <h1 className="font-serif text-5xl mb-8 text-ink">Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {services.map((s) => (
          <ServiceCard key={s.name} service={s} />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="bg-card border border-rule px-7 py-7 text-center cursor-pointer transition-colors hover:border-gold">
      <div className="text-4xl mb-3">{service.icon}</div>
      <div className="font-serif font-semibold text-lg mb-2 text-ink">
        {service.name}
      </div>
      <div className="text-[11px] text-muted mb-4">{service.status}</div>
      <button
        className={
          service.connected
            ? 'font-display font-semibold text-[8px] tracking-[0.3em] uppercase px-5 py-2.5 bg-transparent text-gold border border-gold'
            : 'font-display font-semibold text-[8px] tracking-[0.3em] uppercase px-5 py-2.5 bg-gold text-white border-0'
        }
      >
        {service.connected ? 'Settings' : 'Connect'}
      </button>
    </div>
  );
}
