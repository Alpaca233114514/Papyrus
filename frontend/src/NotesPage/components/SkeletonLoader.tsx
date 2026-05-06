export const SkeletonLoader = () => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '48px 64px 64px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <div className="skeleton-pulse" style={{
            width: '200px',
            height: '40px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '8px',
          }} />
          <div className="skeleton-pulse" style={{
            width: '280px',
            height: '16px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '4px',
            marginTop: '8px',
            animationDelay: '0.2s'
          }} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton-pulse" style={{
            width: '100px',
            height: '32px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '6px',
            animationDelay: '0.4s'
          }} />
          <div className="skeleton-pulse" style={{
            width: '120px',
            height: '32px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '6px',
            animationDelay: '0.6s'
          }} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        marginBottom: '24px',
        borderRadius: '12px',
        border: '1px solid var(--color-border-2)',
        background: 'var(--color-bg-1)',
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton-pulse" style={{
              width: '48px',
              height: '28px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              animationDelay: '0.2s'
            }} />
            <div className="skeleton-pulse" style={{
              width: '60px',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginTop: '4px',
              animationDelay: '0.4s'
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton-pulse" style={{
              width: '48px',
              height: '28px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              animationDelay: '0.3s'
            }} />
            <div className="skeleton-pulse" style={{
              width: '60px',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginTop: '4px',
              animationDelay: '0.5s'
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton-pulse" style={{
              width: '48px',
              height: '28px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              animationDelay: '0.4s'
            }} />
            <div className="skeleton-pulse" style={{
              width: '60px',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginTop: '4px',
              animationDelay: '0.6s'
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton-pulse" style={{
              width: '48px',
              height: '28px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              animationDelay: '0.5s'
            }} />
            <div className="skeleton-pulse" style={{
              width: '60px',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginTop: '4px',
              animationDelay: '0.7s'
            }} />
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              minWidth: '100px',
              height: '32px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '20px',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              minWidth: '60px',
              height: '24px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              backgroundColor: 'var(--color-bg-2)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--color-border-2)',
              animationDelay: `${i * 0.1}s`
            }}
          >
            <div style={{
              width: '100%',
              height: '18px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginBottom: '12px'
            }} />
            <div style={{
              width: '80%',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              width: '60%',
              height: '14px',
              backgroundColor: 'var(--color-fill-2)',
              borderRadius: '4px',
              marginBottom: '16px'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: '50px',
                height: '12px',
                backgroundColor: 'var(--color-fill-2)',
                borderRadius: '4px'
              }} />
              <div style={{
                width: '60px',
                height: '12px',
                backgroundColor: 'var(--color-fill-2)',
                borderRadius: '4px'
              }} />
            </div>
          </div>
        ))}
        <div className="skeleton-pulse" style={{
          backgroundColor: 'var(--color-bg-2)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px dashed var(--color-border-2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '140px',
          animationDelay: '0.6s'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '50%',
            marginBottom: '8px'
          }} />
          <div style={{
            width: '80px',
            height: '14px',
            backgroundColor: 'var(--color-fill-2)',
            borderRadius: '4px'
          }} />
        </div>
      </div>
    </div>
  );
};