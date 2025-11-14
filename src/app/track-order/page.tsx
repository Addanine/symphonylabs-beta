"use client";

import { useState } from "react";
import NavigationWrapper from "~/components/NavigationWrapper";
import { supabase } from "~/lib/supabase";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_tracking_url: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderId.trim()) {
      setError("Please enter an order ID");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, shipping_tracking_url, created_at, paid_at, shipped_at")
        .eq("id", orderId.trim())
        .single();

      if (fetchError || !data) {
        setError("Order not found. Please check your order ID and try again.");
        return;
      }

      const orderData = data as Order;
      setOrder(orderData);

      // If there's a tracking URL, open it
      if (orderData.shipping_tracking_url) {
        window.open(orderData.shipping_tracking_url, "_blank");
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to fetch order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-wide mb-8">track your order</h1>

        <div className="brutalist-border bg-white p-6 mb-8">
          <p className="text-sm tracking-wide mb-6">
            enter your order id (sent to your email after purchase) to check your order status
          </p>

          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div>
              <label htmlFor="orderId" className="block text-sm font-bold tracking-wide mb-2">
                order id
              </label>
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="input-brutalist w-full"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brutalist-black w-full"
            >
              {loading ? "searching..." : "track order"}
            </button>
          </form>
        </div>

        {error && (
          <div className="brutalist-border bg-red-50 p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-2xl">[ ! ]</div>
              <div>
                <div className="font-bold tracking-wide mb-1">error</div>
                <p className="text-sm tracking-wide">{error}</p>
              </div>
            </div>
          </div>
        )}

        {order && (
          <div className="brutalist-border bg-white p-6">
            <h2 className="text-xl font-bold tracking-wide mb-6">order details</h2>

            <div className="space-y-4">
              <div>
                <div className="text-xs tracking-wide opacity-60 mb-1">order number</div>
                <div className="font-bold tracking-wide">{order.order_number}</div>
              </div>

              <div>
                <div className="text-xs tracking-wide opacity-60 mb-1">status</div>
                <div className="font-bold tracking-wide">
                  <span
                    className={`inline-block px-3 py-1 text-xs ${
                      order.status === "shipped"
                        ? "bg-green-100 text-green-800"
                        : order.status === "paid"
                        ? "bg-blue-100 text-blue-800"
                        : order.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs tracking-wide opacity-60 mb-1">total amount</div>
                <div className="font-bold tracking-wide">${order.total_amount.toFixed(2)}</div>
              </div>

              <div>
                <div className="text-xs tracking-wide opacity-60 mb-1">order date</div>
                <div className="font-bold tracking-wide">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>

              {order.paid_at && (
                <div>
                  <div className="text-xs tracking-wide opacity-60 mb-1">paid date</div>
                  <div className="font-bold tracking-wide">
                    {new Date(order.paid_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {order.shipped_at && (
                <div>
                  <div className="text-xs tracking-wide opacity-60 mb-1">shipped date</div>
                  <div className="font-bold tracking-wide">
                    {new Date(order.shipped_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {order.shipping_tracking_url && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a
                    href={order.shipping_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brutalist-black w-full text-center block"
                  >
                    view tracking details →
                  </a>
                </div>
              )}

              {!order.shipping_tracking_url && order.status === "paid" && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm tracking-wide opacity-60">
                    your order has been paid and will be shipped soon. tracking information will be added once shipped.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
