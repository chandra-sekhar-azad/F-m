const LoopBanner = () => (
  <aside
    className="fixed left-0 right-0 top-16 z-40 overflow-hidden border-y border-primary/20 bg-primary text-primary-foreground md:top-[73px] 3xl:top-[121px]"
    aria-label="Best Private Theatre & Party Hall"
  >
    <div className="navbar-marquee flex w-max items-center whitespace-nowrap py-1.5 text-xs font-bold uppercase tracking-[0.2em] md:text-sm">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="mx-8">
          Best Private Theatre &amp; Party Hall <span className="ml-8 opacity-70">✦</span>
        </span>
      ))}
    </div>
  </aside>
);

export default LoopBanner;
