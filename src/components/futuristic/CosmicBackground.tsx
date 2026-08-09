"use client";

export function CosmicBackground() {
  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0,25,50,1) 0%, rgba(2,5,10,1) 100%)',
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 240, 255, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 240, 255, 1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
    </>
  );
}
