export default function Header({ title }) {
  return (
    <header className="top-header">
      <h2 style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: '1.2rem',
        color: '#15324a',
        letterSpacing: '-0.02em',
      }}>
        {title}
      </h2>
    </header>
  )
}
