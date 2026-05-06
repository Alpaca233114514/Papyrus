export const ChartsSkeletonLoader = () => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px', background: 'var(--color-bg-1)' }}>
      <div className="skeleton-pulse" style={{
        width: '150px',
        height: '40px',
        borderRadius: '8px',
        marginBottom: '32px'
      }} />

      <div className="skeleton-pulse" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '32px',
        borderRadius: '12px',
        border: '1px solid var(--color-text-3)',
        background: 'var(--color-bg-1)',
        height: '72px'
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-pulse" style={{
            background: 'var(--color-bg-1)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--color-border-2)',
            height: '100px',
            animationDelay: `${i * 0.1}s`
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        <div className="skeleton-pulse" style={{
          background: 'var(--color-bg-1)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--color-border-2)',
          height: '280px',
          animationDelay: '0.2s'
        }} />

        <div className="skeleton-pulse" style={{
          background: 'var(--color-bg-1)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--color-border-2)',
          height: '200px',
          animationDelay: '0.3s'
        }} />
      </div>

      <div className="skeleton-pulse" style={{
        width: '120px',
        height: '28px',
        borderRadius: '6px',
        marginBottom: '24px',
        animationDelay: '0.4s'
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-pulse" style={{
            background: 'var(--color-bg-1)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--color-border-2)',
            height: '160px',
            animationDelay: `${i * 0.1}s`
          }} />
        ))}
      </div>

      <div style={{ height: '32px' }} />
    </div>
  );
};