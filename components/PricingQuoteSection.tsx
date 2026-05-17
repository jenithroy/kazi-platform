'use client';

import { useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, FolderOpen, FileText, X } from 'lucide-react';

const TSHIRT_TIERS = [
  { minQty: 50,   maxQty: 99,   price: 8.50 },
  { minQty: 100,  maxQty: 249,  price: 6.50 },
  { minQty: 250,  maxQty: 499,  price: 5.00 },
  { minQty: 500,  maxQty: 999,  price: 4.00 },
  { minQty: 1000, maxQty: null, price: 3.20 },
];
const HOODIE_TIERS = [
  { minQty: 50,   maxQty: 99,   price: 18.00 },
  { minQty: 100,  maxQty: 249,  price: 14.50 },
  { minQty: 250,  maxQty: 499,  price: 12.00 },
  { minQty: 500,  maxQty: 999,  price: 10.00 },
  { minQty: 1000, maxQty: null, price: 8.50 },
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const COLORS = [
  { name: 'Black',        hex: '#000000' },
  { name: 'White',        hex: '#FFFFFF' },
  { name: 'Navy',         hex: '#1a365d' },
  { name: 'Heather Grey', hex: '#9ca3af' },
  { name: 'Red',          hex: '#dc2626' },
  { name: 'Royal Blue',   hex: '#2563eb' },
  { name: 'Forest Green', hex: '#166534' },
  { name: 'Custom',       hex: null },
];

type ProductType = 'tshirt' | 'hoodie';

function getPricePerUnit(tiers: typeof TSHIRT_TIERS, qty: number) {
  return tiers.find(t => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty))?.price ?? tiers[0].price;
}

const inputClass = 'w-full px-3 py-2.5 bg-kazi-cream border border-kazi-sand text-kazi-charcoal font-sans text-sm rounded-sm focus:outline-none focus:border-kazi-green transition-colors duration-300 placeholder-kazi-slate/40';
const labelClass = 'block font-sans text-xs font-semibold uppercase tracking-[0.12em] text-kazi-slate mb-1.5';

export default function PricingQuoteSection() {
  const [productType, setProductType] = useState<ProductType>('tshirt');
  const [quantity, setQuantity] = useState(100);
  const [addOns, setAddOns] = useState({
    embroidery: false, embroiderySize: 'small',
    screenPrint: false, screenPrintColors: 1,
    dtgPrint: false,
  });
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', phone: '',
    sizes: {} as Record<string, number>,
    colors: [] as string[],
    details: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const tiers = productType === 'tshirt' ? TSHIRT_TIERS : HOODIE_TIERS;
  const basePrice = getPricePerUnit(tiers, quantity);
  const addOnPrice = useMemo(() => {
    let total = 0;
    if (addOns.embroidery) total += addOns.embroiderySize === 'small' ? 2.50 : 4.00;
    if (addOns.screenPrint) total += addOns.screenPrintColors * 1.50;
    if (addOns.dtgPrint) total += 3.50;
    return total;
  }, [addOns]);
  const unitPrice = basePrice + addOnPrice;
  const totalPrice = unitPrice * quantity;
  const savings = useMemo(() => (tiers[0].price + addOnPrice - unitPrice) * quantity, [tiers, addOnPrice, unitPrice, quantity]);

  const toggleColor = (name: string) =>
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(name) ? prev.colors.filter(c => c !== name) : [...prev.colors, name],
    }));

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const totalFromSizes = Object.values(formData.sizes).reduce((a, b) => a + b, 0);
      const finalQty = totalFromSizes > 0 ? totalFromSizes : quantity;

      let customerId = null;
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', formData.email).single();
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({ email: formData.email, full_name: formData.name, company_name: formData.company || null, phone: formData.phone || null, role: 'customer' })
          .select('id').single();
        if (profileError) throw profileError;
        customerId = newProfile.id;
      }

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          customer_id: customerId, product_type: productType, quantity: finalQty,
          size_breakdown: formData.sizes, colors: formData.colors,
          details: [
            addOns.embroidery ? `Embroidery (${addOns.embroiderySize})` : null,
            addOns.screenPrint ? `Screen print (${addOns.screenPrintColors} colour${addOns.screenPrintColors > 1 ? 's' : ''})` : null,
            addOns.dtgPrint ? 'DTG print' : null,
            formData.details,
          ].filter(Boolean).join(' · '),
          quoted_price: unitPrice, status: 'pending',
        })
        .select('id').single();
      if (quoteError) throw quoteError;

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${quote.id}/${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
        await supabase.storage.from('design-files').upload(path, file);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border border-kazi-sand bg-kazi-green-light rounded-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-kazi-green flex items-center justify-center mx-auto mb-6">
          <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <h3 className="font-serif text-2xl text-kazi-charcoal mb-2">Quote submitted</h3>
        <p className="font-sans text-sm text-kazi-slate">We'll review your details and respond within 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-kazi-sand rounded-sm overflow-hidden">

      {/* LEFT — Calculator */}
      <div className="bg-white border-r border-kazi-sand">

        {/* Product type */}
        <div className="p-6 border-b border-kazi-sand">
          <label className={labelClass}>Product</label>
          <div className="grid grid-cols-2 gap-2">
            {(['tshirt', 'hoodie'] as ProductType[]).map(type => (
              <button key={type} onClick={() => setProductType(type)}
                className={`py-3 px-4 rounded-sm border font-sans text-sm font-semibold transition-all duration-300 ${
                  productType === type
                    ? 'border-kazi-green bg-kazi-green-light text-kazi-green'
                    : 'border-kazi-sand bg-kazi-cream text-kazi-slate hover:border-kazi-green/50'
                }`}>
                {type === 'tshirt' ? 'T-Shirts' : 'Hoodies'}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="p-6 border-b border-kazi-sand">
          <div className="flex justify-between items-baseline mb-4">
            <label className={labelClass}>Quantity</label>
            <span className="font-sans text-2xl font-semibold text-kazi-charcoal">{quantity.toLocaleString()} units</span>
          </div>
          <input type="range" min="50" max="2000" step="10" value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value))}
            className="w-full h-1.5 bg-kazi-sand rounded-sm appearance-none cursor-pointer accent-[#166951]" />
          <div className="flex justify-between font-sans text-xs text-kazi-slate/50 mt-2">
            <span>50</span><span>500</span><span>1000</span><span>2000</span>
          </div>
          <div className="flex mt-3 gap-1">
            {tiers.map((tier, idx) => (
              <div key={idx} className={`flex-1 h-1 rounded-sm transition-colors duration-300 ${
                quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)
                  ? 'bg-kazi-green' : 'bg-kazi-sand'
              }`} />
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div className="p-6 border-b border-kazi-sand">
          <label className={labelClass}>Add-ons</label>
          <div className="space-y-2">
            {[
              { key: 'embroidery', label: 'Embroidery', price: `+£${addOns.embroiderySize === 'small' ? '2.50' : '4.00'}/unit` },
              { key: 'screenPrint', label: 'Screen Print', price: '+£1.50/colour/unit' },
              { key: 'dtgPrint', label: 'DTG Print', price: '+£3.50/unit' },
            ].map(({ key, label, price }) => (
              <label key={key} className="flex items-center gap-3 p-3 border border-kazi-sand rounded-sm hover:border-kazi-green/40 hover:bg-kazi-green-light/30 cursor-pointer transition-all duration-300">
                <input type="checkbox"
                  checked={addOns[key as keyof typeof addOns] as boolean}
                  onChange={e => setAddOns({ ...addOns, [key]: e.target.checked })}
                  className="w-4 h-4 accent-[#166951]" />
                <div className="flex-1 font-sans text-sm">
                  <div className="font-semibold text-kazi-charcoal">{label}</div>
                  <div className="text-kazi-slate/60 text-xs">{price}</div>
                </div>
                {key === 'embroidery' && addOns.embroidery && (
                  <select value={addOns.embroiderySize}
                    onChange={e => setAddOns({ ...addOns, embroiderySize: e.target.value })}
                    className="font-sans text-xs border border-kazi-sand rounded-sm px-2 py-1 bg-kazi-cream text-kazi-charcoal focus:outline-none focus:border-kazi-green">
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                )}
                {key === 'screenPrint' && addOns.screenPrint && (
                  <input type="number" min="1" max="6" value={addOns.screenPrintColors}
                    onChange={e => setAddOns({ ...addOns, screenPrintColors: parseInt(e.target.value) || 1 })}
                    className="w-14 font-sans text-xs border border-kazi-sand rounded-sm px-2 py-1 bg-kazi-cream text-kazi-charcoal focus:outline-none focus:border-kazi-green" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Price summary */}
        <div className="p-6 bg-kazi-charcoal">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-sans text-xs uppercase tracking-[0.15em] text-white/50">Per unit</span>
            <span className="font-sans text-xl font-semibold text-white">£{unitPrice.toFixed(2)}</span>
          </div>
          {savings > 0 && (
            <div className="font-sans text-xs text-kazi-green-light mb-3">
              You save £{savings.toFixed(2)} vs minimum order pricing
            </div>
          )}
          <div className="flex justify-between items-baseline pt-4 border-t border-white/10 mt-3">
            <span className="font-sans text-sm text-white/60">Total estimate</span>
            <span className="font-sans text-3xl font-semibold text-white">
              £{totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="font-sans text-xs text-white/30 mt-2">Excludes shipping, customs, and packaging</p>
        </div>
      </div>

      {/* RIGHT — Quote form */}
      <div className="bg-white flex flex-col">
        <div className="p-6 border-b border-kazi-sand bg-kazi-cream">
          <h3 className="font-sans font-semibold text-kazi-charcoal">Request this quote</h3>
          <p className="font-sans text-xs text-kazi-slate mt-1">
            {quantity.toLocaleString()} × {productType === 'tshirt' ? 'T-Shirts' : 'Hoodies'} · £{unitPrice.toFixed(2)}/unit ·{' '}
            <span className="font-semibold text-kazi-green">£{totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} est.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && (
            <div className="bg-kazi-green/10 border border-kazi-green/30 text-kazi-green px-4 py-3 rounded-sm font-sans text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Name *',  type: 'text',  key: 'name',    required: true },
              { label: 'Email *', type: 'email', key: 'email',   required: true },
              { label: 'Company', type: 'text',  key: 'company', required: false },
              { label: 'Phone',   type: 'tel',   key: 'phone',   required: false },
            ].map(({ label, type, key, required }) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input type={type} required={required}
                  value={formData[key as keyof typeof formData] as string}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  className={inputClass} />
              </div>
            ))}
          </div>

          {/* Size breakdown */}
          <div>
            <label className={labelClass}>Size breakdown <span className="normal-case font-normal text-kazi-slate/50">(optional)</span></label>
            <div className="grid grid-cols-7 gap-1.5">
              {SIZES.map(size => (
                <div key={size} className="text-center">
                  <label className="font-sans text-[10px] text-kazi-slate/50 block mb-1">{size}</label>
                  <input type="number" min="0" value={formData.sizes[size] || ''}
                    onChange={e => setFormData(prev => ({ ...prev, sizes: { ...prev.sizes, [size]: parseInt(e.target.value) || 0 } }))}
                    className="w-full px-1 py-1.5 bg-kazi-cream border border-kazi-sand rounded-sm text-center font-sans text-xs text-kazi-charcoal focus:outline-none focus:border-kazi-green transition-colors"
                    placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          {/* Garment colours */}
          <div>
            <label className={labelClass}>Garment colours</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map(color => (
                <button key={color.name} type="button" onClick={() => toggleColor(color.name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border font-sans text-xs transition-all duration-200 ${
                    formData.colors.includes(color.name)
                      ? 'border-kazi-green bg-kazi-green-light text-kazi-green ring-1 ring-kazi-green/30'
                      : 'border-kazi-sand bg-kazi-cream text-kazi-slate hover:border-kazi-green/50'
                  }`}>
                  {color.hex && <span className="w-3 h-3 rounded-full border border-kazi-sand/60 shrink-0" style={{ backgroundColor: color.hex }} />}
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className={labelClass}>
              Design files <span className="normal-case font-normal text-kazi-slate/50">(PNG, JPG, PDF, AI, PSD)</span>
            </label>
            <div onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}
              className="border-2 border-dashed border-kazi-sand rounded-sm p-4 text-center hover:border-kazi-green transition-colors duration-300 cursor-pointer bg-kazi-cream">
              <FolderOpen className="w-6 h-6 text-kazi-slate/40 mx-auto mb-1.5" />
              <p className="font-sans text-xs text-kazi-slate/50 mb-2">Drag & drop or</p>
              <label className="inline-block bg-kazi-green text-white px-3 py-1.5 rounded-sm cursor-pointer hover:bg-kazi-green-dark transition-colors font-sans text-xs font-semibold">
                Browse
                <input type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.ai,.psd" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-kazi-cream border border-kazi-sand px-3 py-2 rounded-sm font-sans text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-kazi-slate/50" />
                      <span className="truncate max-w-[160px] text-kazi-charcoal">{file.name}</span>
                      <span className="text-kazi-slate/40">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    </div>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="text-kazi-slate/40 hover:text-kazi-charcoal transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <label className={labelClass}>Additional details</label>
            <textarea rows={3} value={formData.details}
              onChange={e => setFormData({ ...formData, details: e.target.value })}
              placeholder="Deadline, fabric preferences, special instructions..."
              className={`${inputClass} resize-none`} />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-kazi-green hover:bg-kazi-green-dark text-white py-4 rounded-sm font-sans font-semibold text-sm uppercase tracking-[0.12em] disabled:opacity-50 transition-colors duration-500">
            {submitting ? 'Submitting…' : `Submit Quote — £${totalPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </button>
        </form>
      </div>
    </div>
  );
}
