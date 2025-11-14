"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "~/context/ToastContext";
import NavigationWrapper from "~/components/NavigationWrapper";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");

    if (orderIdParam) {
      setOrderId(orderIdParam);
    }

    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          </div>
        </div>
      </main>
    );
  }

  if (!orderId) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16 brutalist-border bg-white p-12">
            <div className="text-6xl mb-6">[ ! ]</div>
            <h2 className="text-3xl font-bold tracking-wide mb-4">
              no order found
            </h2>
            <p className="text-sm tracking-wide mb-8">
              unable to retrieve order information
            </p>
            <button
              onClick={() => router.push("/")}
              className="btn-brutalist-black"
            >
              browse products
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="brutalist-border bg-white p-12">
          <div className="text-center">
            {/* Success Icon */}
            <div className="text-6xl mb-6">[ ✓ ]</div>

            {/* Success Message */}
            <h1 className="text-4xl font-bold tracking-wide mb-4">
              payment complete!
            </h1>

            <p className="text-lg tracking-wide mb-8">
              thank you for your purchase
            </p>

            {/* Order ID Section */}
            <div className="brutalist-border bg-white p-6 mb-8 inline-block">
              <div className="text-sm font-bold tracking-wide mb-2">
                your order ID
              </div>
              <div className="text-xl font-bold tracking-wide font-mono mb-4 break-all">
                {orderId}
              </div>
              <p className="text-xs tracking-wide opacity-70">
                save this ID to track your order
              </p>
            </div>

            {/* Additional Information */}
            <div className="text-left brutalist-border bg-white p-6 mb-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-bold tracking-wide mb-4">
                what happens next?
              </h3>
              <div className="space-y-3 text-sm tracking-wide">
                <p>
                  <strong>1. confirmation</strong> - your order has been received and confirmed
                </p>
                <p>
                  <strong>2. processing</strong> - we will prepare your order for shipment
                </p>
                <p>
                  <strong>3. shipping</strong> - you will receive tracking information once your order ships
                </p>
              </div>
            </div>

            {/* Copy Order ID Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(orderId);
                  showToast("Order ID copied to clipboard!", "success");
                }}
                className="btn-brutalist"
              >
                copy order ID
              </button>
              <button
                onClick={() => router.push("/track-order")}
                className="btn-brutalist-black"
              >
                track order
              </button>
              <button
                onClick={() => router.push("/")}
                className="btn-brutalist"
              >
                continue shopping
              </button>
            </div>

            {/* Support Note */}
            <p className="text-xs tracking-wide opacity-70 mt-8">
              need help? contact us with your order ID
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white">
          <NavigationWrapper />
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center py-16">
              <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
            </div>
          </div>
        </main>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
