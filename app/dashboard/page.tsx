import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';
import OrderStatusBadge from '@/components/OrderStatusBadge';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirect=/dashboard');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || (profile.role !== 'customer' && profile.role !== 'admin')) redirect('/factory');

  const { data: orders } = await supabase.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
  const { data: quotes } = await supabase.from('quotes').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });

  const stats = [
    { value: orders?.filter(o => o.status !== 'delivered').length ?? 0, label: 'Active Orders' },
    { value: orders?.filter(o => o.status === 'delivered').length ?? 0, label: 'Completed' },
    { value: quotes?.filter(q => q.status === 'pending').length ?? 0,   label: 'Pending Quotes' },
  ];

  return (
    <main className="min-h-screen bg-kazi-cream text-kazi-charcoal">
      <Navbar />

      <div className="pt-32 max-w-[1200px] mx-auto px-6 md:px-12 lg:px-20 py-16">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-12">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-kazi-slate mb-2">Customer Portal</p>
            <h1 className="font-sans text-3xl font-normal text-kazi-charcoal">
              Welcome, {profile.full_name?.split(' ')[0]}
            </h1>
          </div>
          <Link href="/quote"
            className="inline-flex items-center justify-center px-6 py-3 bg-kazi-green hover:bg-kazi-green-dark text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] rounded-sm transition-colors duration-500">
            New Quote
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-kazi-sand border border-kazi-sand rounded-sm overflow-hidden mb-12">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-white px-8 py-8">
              <div className="font-sans text-4xl font-semibold text-kazi-green mb-1">{value}</div>
              <div className="font-sans text-xs uppercase tracking-[0.15em] text-kazi-slate">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-kazi-slate">Your Orders</h2>
              <div className="h-px flex-1 bg-kazi-sand ml-6" />
            </div>
            {orders && orders.length > 0 ? (
              <div className="space-y-3">
                {orders.map((order) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}
                    className="block bg-white border border-kazi-sand rounded-sm p-5 hover:border-kazi-green transition-colors duration-300 group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-sans font-semibold capitalize text-kazi-charcoal group-hover:text-kazi-green transition-colors duration-300">
                          {order.product_type}
                        </div>
                        <div className="font-sans text-xs text-kazi-slate mt-0.5">
                          {order.quantity} units · £{order.total_price}
                        </div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="font-sans text-xs text-kazi-slate/50">
                      Ordered {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-kazi-sand rounded-sm p-10 text-center">
                <p className="font-sans text-sm text-kazi-slate mb-4">No orders yet</p>
                <Link href="/quote" className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-kazi-green hover:text-kazi-green-dark transition-colors">
                  Request your first quote →
                </Link>
              </div>
            )}
          </div>

          {/* Quotes */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-kazi-slate">Your Quotes</h2>
              <div className="h-px flex-1 bg-kazi-sand ml-6" />
            </div>
            {quotes && quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div key={quote.id} className="bg-white border border-kazi-sand rounded-sm p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-sans font-semibold capitalize text-kazi-charcoal">{quote.product_type}</div>
                        <div className="font-sans text-xs text-kazi-slate mt-0.5">{quote.quantity} units</div>
                      </div>
                      <OrderStatusBadge status={quote.status} />
                    </div>
                    {quote.quoted_price && (
                      <div className="font-sans text-sm font-semibold text-kazi-green mb-2">
                        Quote: £{quote.quoted_price}/unit
                      </div>
                    )}
                    <div className="font-sans text-xs text-kazi-slate/50">
                      Submitted {new Date(quote.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-kazi-sand rounded-sm p-10 text-center">
                <p className="font-sans text-sm text-kazi-slate">No quotes yet</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
