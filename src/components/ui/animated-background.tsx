export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0b0e13]">
      <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(79,125,243,0.075),transparent_68%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
    </div>
  );
}
