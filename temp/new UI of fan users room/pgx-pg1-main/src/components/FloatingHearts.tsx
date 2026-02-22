const FloatingHearts = () => {
  const hearts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 10 + Math.random() * 20,
    delay: Math.random() * 6,
    duration: 4 + Math.random() * 6,
    opacity: 0.08 + Math.random() * 0.15,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((h) => (
        <svg
          key={h.id}
          className="absolute"
          style={{
            left: h.left,
            top: h.top,
            width: h.size,
            height: h.size,
            opacity: h.opacity,
            animation: `heart-float ${h.duration}s ease-in-out ${h.delay}s infinite`,
            filter: `drop-shadow(0 0 ${h.size / 3}px hsl(330 90% 55% / 0.6))`,
          }}
          viewBox="0 0 24 24"
          fill="hsl(330, 90%, 55%)"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ))}
    </div>
  );
};

export default FloatingHearts;
