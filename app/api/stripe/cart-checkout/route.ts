import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPriceForQty } from '@/lib/products';
import type { CartItem } from '@/contexts/CartContext';

export async function POST(request: NextRequest) {
  try {
    const { items, email, name } = await request.json() as {
      items: CartItem[];
      email: string;
      name: string;
    };

    if (!items?.length || !email || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stripe = getStripe();

    const lineItems = items.map((item: CartItem) => {
      const unitPrice = getPriceForQty(item.product, item.quantity);
      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `${item.product.name} — ${item.color.name} / ${item.size}`,
            description: `${item.quantity} units @ £${unitPrice.toFixed(2)}/unit`,
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'] as any,
      line_items: lineItems as any,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/shop/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/shop/checkout`,
      customer_email: email,
      metadata: { name, itemCount: String(items.length) },
    } as any);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Cart checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
