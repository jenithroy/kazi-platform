function renderBlock(block, i) {
  if (block.type === "list") {
    return (
      <ul key={i} className="m-0 mb-4 list-disc space-y-2 pl-5 font-body leading-relaxed text-pine-soft">
        {block.items.map((item, j) => (
          <li key={j}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={i} className="m-0 mb-4 font-body leading-relaxed text-pine-soft last:mb-0">
      {block}
    </p>
  );
}

export function LegalPageLayout({ title, lastUpdated, intro, sections }) {
  return (
    <div className="bg-paper">
      <section className="border-b border-pine/15 px-6 pb-10 pt-16 md:px-8 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-3xl">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-moss-deep">Legal</span>
          <h1 className="m-0 font-display text-3xl text-pine md:text-4xl">{title}</h1>
          <p className="mt-4 font-body text-sm text-pine-soft">Last updated: {lastUpdated}</p>
          {intro && (
            <p className="mt-6 max-w-2xl font-body leading-relaxed text-pine-soft">{intro}</p>
          )}
        </div>
      </section>

      <section className="px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="m-0 mb-4 font-display text-xl text-pine md:text-2xl">{section.heading}</h2>
              {section.body.map(renderBlock)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
