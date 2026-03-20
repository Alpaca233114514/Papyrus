const StartPage = () => {
  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', padding: '64px 0 0 64px' }}>
      <span style={{ fontSize: '56px', fontWeight: 400, lineHeight: 1, color: 'var(--color-text-1)' }}>开始</span>
      <div style={{ position: 'absolute', top: '38.2%', left: '64px', right: '64px', transform: 'translateY(-50%)', height: '320px', border: '1px solid var(--color-border-2)', borderRadius: '4px' }} />
    </div>
  );
};

export default StartPage;