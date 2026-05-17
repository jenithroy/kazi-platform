import Navbar from '@/components/Navbar';
import PricingQuoteSection from '@/components/PricingQuoteSection';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      {/* Page header — sits below fixed navbar (h-32) */}
      <div className="pt-32 bg-kazi-charcoal text-white py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/50 mb-4">Pricing</p>
          <h1 className="font-sans text-4xl md:text-5xl font-normal mb-4">Get a Quote</h1>
          <p className="font-sans text-lg text-white/70">Configure your order and request a quote in one step</p>
        </div>
      </div>

      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-[1200px] mx-auto">
          <PricingQuoteSection />
        </div>
      </section>

      {/* Volume pricing reference */}
      <section className="py-16 px-6 md:px-12 lg:px-20 bg-white border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="font-sans text-xl font-semibold mb-8 text-kazi-charcoal">Volume pricing reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'T-Shirts', rows: [['50–99', '£8.50'], ['100–249', '£6.50'], ['250–499', '£5.00'], ['500–999', '£4.00'], ['1000+', '£3.20']] },
              { name: 'Hoodies', rows: [['50–99', '£18.00'], ['100–249', '£14.50'], ['250–499', '£12.00'], ['500–999', '£10.00'], ['1000+', '£8.50']] },
            ].map(({ name, rows }) => (
              <div key={name} className="border border-kazi-sand rounded-sm overflow-hidden bg-white">
                <div className="bg-kazi-cream px-6 py-4 border-b border-kazi-sand">
                  <h3 className="font-sans font-semibold text-kazi-charcoal">{name}</h3>
                </div>
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="text-kazi-slate border-b border-kazi-sand">
                      <th className="px-6 py-3 text-left font-medium">Quantity</th>
                      <th className="px-6 py-3 text-right font-medium">Per unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([qty, price]) => (
                      <tr key={qty} className="border-b border-kazi-sand last:border-0">
                        <td className="px-6 py-3 text-kazi-slate">{qty}</td>
                        <td className="px-6 py-3 text-right font-semibold text-kazi-charcoal">{price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['Embroidery (small)', '+£2.50'], ['Embroidery (large)', '+£4.00'], ['Screen print /colour', '+£1.50'], ['DTG print', '+£3.50']].map(([label, price]) => (
              <div key={label} className="border border-kazi-sand rounded-sm px-4 py-3 bg-white text-sm font-sans">
                <div className="text-kazi-slate">{label}</div>
                <div className="font-semibold text-kazi-charcoal mt-0.5">{price}/unit</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-kazi-slate/60 mt-6">
            Prices are estimates and exclude shipping, customs, and custom packaging. Final quotes may vary.
          </p>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-kazi-sand">
        <div className="max-w-[1200px] mx-auto text-center text-kazi-slate text-sm">
          <p>&copy; 2026 Kazi Manufacturing. Kathmandu, Nepal.</p>
        </div>
      </footer>
    </main>
  );
}
