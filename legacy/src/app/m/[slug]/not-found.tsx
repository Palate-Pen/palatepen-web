export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#1A1A18', color: '#F0E8DC',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'system-ui, sans-serif', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontStyle: 'italic', color: '#F0E8DC', fontSize: '28px' }}>P</span>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C8960A', marginBottom: '11px' }} />
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 300, color: '#F0E8DC', fontSize: '28px', letterSpacing: '5px' }}>ALATABLE</span>
      </div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: '32px', marginBottom: '10px' }}>Menu not found</h1>
      <p style={{ fontSize: '14px', color: '#9A8E7A', maxWidth: '420px', lineHeight: 1.6 }}>
        This menu link is no longer active. The restaurant may have unpublished it or made changes to their account.
      </p>
    </div>
  );
}
