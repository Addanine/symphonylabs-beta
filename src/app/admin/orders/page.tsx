"use client";

import { useEffect, useState } from "react";
import Navigation from "~/components/Navigation";
import { supabase } from "~/lib/supabase";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";

interface SelectedModifier {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  priceAdjustment: number;
}

interface Order {
  id: string;
  order_number: string;
  btcpay_invoice_id: string | null;
  status: string;
  total_amount: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedModifiers?: SelectedModifier[];
  }>;
  shipping_name: string;
  shipping_email: string | null;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  shipping_phone: string | null;
  shipping_carrier: string | null;
  shipping_service: string | null;
  tracking_number: string | null;
  shipping_label_url: string | null;
  shipping_tracking_url: string | null;
  shipping_cost: number | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
}

function AdminOrdersContent() {
  const { isAuthenticated, isLoading, login, logout } = useAdminAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data ?? []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      showToast("Failed to update order status", "error");
    }
  };

  const markAsShipped = async (orderId: string, trackingNumber: string, trackingUrl: string) => {
    try {
      // Schedule notification email for 24 hours from now
      const notificationScheduledAt = new Date();
      notificationScheduledAt.setHours(notificationScheduledAt.getHours() + 24);

      const { error } = await supabase
        .from("orders")
        .update({
          status: "shipped",
          tracking_number: trackingNumber,
          shipping_tracking_url: trackingUrl,
          shipped_at: new Date().toISOString(),
          shipping_notification_scheduled_at: notificationScheduledAt.toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      showToast("Order marked as shipped. Email will be sent in 24 hours.", "success");

      await fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error("Error marking as shipped:", error);
      showToast("Failed to mark as shipped", "error");
    }
  };

  if (isLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Navigation />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <main className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-wide mb-2">orders & shipping</h1>
            <div className="h-[3px] w-20 bg-black"></div>
          </div>
          <button onClick={logout} className="btn-brutalist text-xs">
            logout
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 brutalist-border bg-white">
              <div className="text-4xl mb-4">[ ]</div>
              <p className="text-sm tracking-wide">no orders yet</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="brutalist-border bg-white p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold tracking-wide">{order.order_number}</h3>
                    <div className="flex gap-4 text-xs tracking-wide mt-2">
                      <span>status: <strong>{order.status}</strong></span>
                      <span>total: <strong>${order.total_amount.toFixed(2)}</strong></span>
                      <span>created: {new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "paid" && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn-brutalist-black text-xs px-4 py-2"
                      >
                        mark shipped
                      </button>
                    )}
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="input-brutalist text-xs px-2 py-1"
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="h-[2px] w-full bg-black my-4"></div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Items */}
                  <div>
                    <h4 className="text-sm font-bold tracking-wide mb-2">items:</h4>
                    <div className="space-y-2 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          <div>
                            {item.name} x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="ml-4 mt-1 space-y-0.5 opacity-70">
                              {item.selectedModifiers.map((modifier, modIdx) => (
                                <div key={modIdx}>
                                  {modifier.groupLabel}: {modifier.optionLabel}
                                  {modifier.priceAdjustment !== 0 && (
                                    <span> ({modifier.priceAdjustment > 0 ? '+' : ''}${modifier.priceAdjustment.toFixed(2)})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="text-sm font-bold tracking-wide mb-2">shipping address:</h4>
                    <div className="text-xs tracking-wide space-y-1">
                      <div>{order.shipping_name}</div>
                      {order.shipping_email && <div>{order.shipping_email}</div>}
                      <div>{order.shipping_address_line1}</div>
                      {order.shipping_address_line2 && <div>{order.shipping_address_line2}</div>}
                      <div>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</div>
                      <div>{order.shipping_country}</div>
                      {order.shipping_phone && <div>{order.shipping_phone}</div>}
                    </div>
                  </div>
                </div>

                {/* Tracking Info */}
                {(order.tracking_number ?? order.shipping_tracking_url) && (
                  <div className="mt-4 pt-4 border-t-[2px] border-black">
                    {order.tracking_number && (
                      <div className="text-xs tracking-wide">
                        <strong>tracking:</strong> {order.tracking_number}
                      </div>
                    )}
                    {order.shipping_tracking_url && (
                      <div className="text-xs tracking-wide">
                        <strong>tracking url:</strong>{" "}
                        <a
                          href={order.shipping_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:opacity-50"
                        >
                          {order.shipping_tracking_url}
                        </a>
                      </div>
                    )}
                    {order.shipped_at && (
                      <div className="text-xs tracking-wide">
                        shipped: {new Date(order.shipped_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mark as Shipped Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="brutalist-border bg-white p-6 max-w-md w-full">
            <h2 className="text-xl font-bold tracking-wide mb-4">mark as shipped</h2>
            <div className="h-[2px] w-full bg-black mb-4"></div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const trackingNumber = formData.get("tracking") as string;
                const trackingUrl = formData.get("trackingUrl") as string;
                if (trackingNumber && trackingUrl) {
                  void markAsShipped(selectedOrder.id, trackingNumber, trackingUrl);
                }
              }}
            >
              <div className="mb-4">
                <label htmlFor="tracking" className="block text-sm font-bold tracking-wide mb-2">
                  tracking number
                </label>
                <input
                  type="text"
                  id="tracking"
                  name="tracking"
                  className="input-brutalist w-full"
                  placeholder="e.g., 1Z999AA10123456784"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="trackingUrl" className="block text-sm font-bold tracking-wide mb-2">
                  tracking url
                </label>
                <input
                  type="url"
                  id="trackingUrl"
                  name="trackingUrl"
                  className="input-brutalist w-full"
                  placeholder="https://tools.usps.com/go/TrackConfirmAction?tLabels=..."
                  required
                />
                <p className="text-xs tracking-wide mt-1 opacity-60">
                  full tracking link (will open when customer checks order)
                </p>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-brutalist-black flex-1">
                  confirm
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn-brutalist flex-1"
                >
                  cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminOrdersPage() {
  return (
    <AdminAuthProvider>
      <AdminOrdersContent />
    </AdminAuthProvider>
  );
}
