// Tijdelijke startpagina (stap 1). Wordt in stap 5 vervangen door het echte Home-scherm.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="poster-glow w-full max-w-md rounded-2xl border border-club-dark p-8 text-center">
        <p className="font-display text-sm tracking-[0.3em] text-muted">
          VV PEURSUM · 5E KLASSE
        </p>
        <h1 className="mt-4 font-brush text-5xl text-club">Peursum 4</h1>
        <p className="mt-2 font-display text-3xl tracking-widest">TRACKER</p>
        <p className="mt-8 text-sm text-muted">In aanbouw: stap 1 van 6.</p>
      </section>
    </main>
  );
}
