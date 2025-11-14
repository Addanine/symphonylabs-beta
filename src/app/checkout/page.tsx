"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavigationWrapper from "~/components/NavigationWrapper";
import { useCart } from "~/context/CartContext";
import { useToast } from "~/context/ToastContext";
import Image from "next/image";
import CustomBTCPayCheckout from "~/components/CustomBTCPayCheckout";
import ShippingAddressForm, { type ShippingAddress } from "~/components/ShippingAddressForm";
import { calculateDiscountedPrice, hasDiscount } from "~/lib/supabase";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const paymentProcessedRef = useRef(false);
  const [selectedCrypto, setSelectedCrypto] = useState<"bitcoin" | "monero">("bitcoin");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
  });

  // Shipping cost state
  const [shippingCost, setShippingCost] = useState(0);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const subtotal = getTotalPrice();

  // Recalculate coupon discount based on current subtotal
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? subtotal * (appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, subtotal) // Cap fixed discount at subtotal
    : 0;

  const totalPrice = Math.max(subtotal - couponDiscount + shippingCost, 0); // Ensure total never goes negative

  // Calculate shipping cost when country changes
  const calculateShipping = async (country: string) => {
    if (!country) {
      setShippingCost(0);
      return;
    }

    setLoadingShipping(true);
    try {
      const response = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ country }),
      });

      if (response.ok) {
        const data = await response.json() as { shippingCost: number };
        setShippingCost(data.shippingCost);
      }
    } catch (error) {
      console.error("Error calculating shipping:", error);
    } finally {
      setLoadingShipping(false);
    }
  };

  // Update shipping cost when country changes
  const handleShippingAddressChange = (newAddress: ShippingAddress) => {
    setShippingAddress(newAddress);
    if (newAddress.country !== shippingAddress.country) {
      void calculateShipping(newAddress.country);
    }
  };

  // Calculate initial shipping cost on mount
  useEffect(() => {
    void calculateShipping(shippingAddress.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode,
          orderTotal: subtotal,
          customerEmail: shippingAddress.email,
          cartProductIds: cart.map((item) => item.id),
        }),
      });

      const data = await response.json() as {
        success?: boolean;
        coupon?: {
          id: string;
          code: string;
          discount_type: string;
          discount_value: number;
          discount: number;
        };
        error?: string;
      };

      if (!response.ok || !data.success) {
        setCouponError(data.error ?? "Invalid coupon code");
        setAppliedCoupon(null);
      } else if (data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponError("");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError("Failed to apply coupon. Please try again.");
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handleCheckout = async () => {
    // Validate shipping address
    if (!shippingAddress.name || !shippingAddress.addressLine1 || !shippingAddress.city ||
        !shippingAddress.state || !shippingAddress.zip || !shippingAddress.country) {
      showToast("Please fill in all required shipping address fields", "warning");
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create order in database
      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: calculateDiscountedPrice(item.price, item.discount),
            originalPrice: item.price,
            discount: item.discount,
            quantity: item.quantity,
            selectedModifiers: item.selectedModifiers,
          })),
          totalAmount: totalPrice,
          subtotal: subtotal,
          shippingCost: shippingCost,
          couponCode: appliedCoupon?.code,
          couponDiscount: couponDiscount,
          shippingAddress,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json() as { error: string; insufficientStock?: boolean; productName?: string; availableStock?: number };
        if (errorData.insufficientStock) {
          showToast(`Sorry, ${errorData.productName} is out of stock or has insufficient quantity. Only ${errorData.availableStock} available. Please update your cart.`, "error");
          // Optionally refresh the page to update cart with current stock
          setTimeout(() => {
            window.location.reload();
          }, 3000);
          return;
        }
        // Check for rate limiting (429)
        if (orderResponse.status === 429) {
          showToast("Too many order requests. Please wait before trying again.", "warning");
          return;
        }
        throw new Error(errorData.error || "Failed to create order");
      }

      interface OrderResponse {
        orderId: string;
        orderNumber: string;
      }

      const orderData = await orderResponse.json() as OrderResponse;
      setOrderId(orderData.orderId);
      setOrderNumber(orderData.orderNumber);

      // Apply coupon usage if a coupon was used
      if (appliedCoupon && shippingAddress.email) {
        await fetch("/api/coupons/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            couponId: appliedCoupon.id,
            customerEmail: shippingAddress.email,
            orderId: orderData.orderId,
          }),
        });
      }

      // Step 2: Create BTCPay invoice
      const invoiceResponse = await fetch("/api/btcpay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalPrice,
          currency: "USD",
          orderId: orderData.orderId,
          preferredCrypto: selectedCrypto,
        }),
      });

      if (!invoiceResponse.ok) {
        throw new Error("Failed to create invoice");
      }

      interface InvoiceResponse {
        invoiceId: string;
      }

      const invoiceData = await invoiceResponse.json() as InvoiceResponse;

      // Step 3: Link invoice to order
      await fetch("/api/orders/update-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          invoiceId: invoiceData.invoiceId,
        }),
      });

      setInvoiceId(invoiceData.invoiceId);
      setShowPayment(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to process payment", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentComplete = async () => {
    // Prevent duplicate processing
    if (paymentProcessedRef.current) {
      return;
    }
    paymentProcessedRef.current = true;

    if (orderId) {
      // Mark order as paid
      await fetch("/api/orders/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      // Send order confirmation email if email was provided
      if (shippingAddress.email && orderNumber) {
        try {
          await fetch("/api/email/order-confirmation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: shippingAddress.email,
              orderId: orderId,
              orderNumber: orderNumber,
              totalAmount: totalPrice,
            }),
          });
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
          // Don't block completion if email fails
        }
      }
    }

    // Clear cart
    clearCart();

    // Redirect to order confirmation page with order ID (UUID)
    if (orderId) {
      router.push(`/order-confirmation?orderId=${encodeURIComponent(orderId)}`);
    } else {
      setPaymentComplete(true);
    }
  };

  const handleCancelPayment = () => {
    setShowPayment(false);
    setInvoiceId(null);
  };

  // This fallback is kept in case redirect fails, but should rarely be shown
  if (paymentComplete) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16 brutalist-border bg-white p-12">
            <div className="text-6xl mb-6">[ ✓ ]</div>
            <h2 className="text-3xl font-bold tracking-wide mb-4">
              payment complete!
            </h2>
            <p className="text-sm tracking-wide mb-8">
              thank you for your purchase.
            </p>
            <button
              onClick={() => router.push("/")}
              className="btn-brutalist-black"
            >
              continue shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (showPayment && invoiceId) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <CustomBTCPayCheckout
            invoiceId={invoiceId}
            amount={totalPrice}
            currency="USD"
            onComplete={handlePaymentComplete}
            onCancel={handleCancelPayment}
          />
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">[ ]</div>
            <h2 className="text-2xl font-bold tracking-wide mb-4">cart is empty</h2>
            <p className="text-sm tracking-wide mb-8">add some products to get started</p>
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

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-wide mb-8">checkout</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Cart Items and Shipping */}
          <div className="md:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-wide mb-4">cart items</h2>
              {cart.map((item) => {
                const basePrice = calculateDiscountedPrice(item.price, item.discount);
                const modifiersPrice = item.selectedModifiers?.reduce(
                  (sum, mod) => sum + mod.priceAdjustment,
                  0
                ) ?? 0;
                const itemTotalPrice = (basePrice + modifiersPrice) * item.quantity;

                return (
                  <div key={item.cartItemId} className="brutalist-border bg-white p-4">
                    <div className="flex gap-4">
                      <div className="relative w-24 h-24 brutalist-border flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-bold tracking-wide mb-1">{item.name}</h3>
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {item.selectedModifiers.map((modifier, idx) => (
                              <div key={idx} className="text-xs tracking-wide opacity-70">
                                <span className="font-bold">{modifier.groupLabel}:</span> {modifier.optionLabel}
                                {modifier.priceAdjustment !== 0 && (
                                  <span className="ml-1">
                                    ({modifier.priceAdjustment > 0 ? '+' : ''}${modifier.priceAdjustment.toFixed(2)})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs tracking-wide mb-3">{item.short_description ?? item.description.substring(0, 100)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            className="brutalist-border bg-white w-8 h-8 flex items-center justify-center hover:translate-x-1 hover:translate-y-1 transition-transform"
                          >
                            -
                          </button>
                          <span className="w-12 text-center font-bold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            className="brutalist-border bg-white w-8 h-8 flex items-center justify-center hover:translate-x-1 hover:translate-y-1 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        {hasDiscount(item) && (
                          <div className="text-xs font-bold tracking-wide bg-red-600 text-white px-2 py-1 mb-1 inline-block">
                            {item.discount}% OFF
                          </div>
                        )}
                        <div className="text-lg font-bold tracking-wide mb-2">
                          ${itemTotalPrice.toFixed(2)}
                        </div>
                        {hasDiscount(item) && (
                          <div className="text-xs line-through opacity-60 mb-2">
                            was ${((item.price + modifiersPrice) * item.quantity).toFixed(2)}
                          </div>
                        )}
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="text-xs tracking-wide hover:opacity-50 transition-opacity"
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shipping Address */}
            <div className="brutalist-border bg-white p-6">
              <ShippingAddressForm
                address={shippingAddress}
                onChange={handleShippingAddressChange}
              />
            </div>

            {/* Cryptocurrency Selection */}
            <div className="brutalist-border bg-white p-6">
              <h2 className="text-xl font-bold tracking-wide mb-4">payment method</h2>
              <p className="text-xs tracking-wide mb-4">choose your preferred cryptocurrency</p>

              <div className="grid grid-cols-2 gap-4">
                {/* Bitcoin Option */}
                <button
                  onClick={() => setSelectedCrypto("bitcoin")}
                  className={`brutalist-border p-6 text-left transition-all ${
                    selectedCrypto === "bitcoin"
                      ? "bg-black text-white"
                      : "bg-white hover:translate-x-1 hover:translate-y-1"
                  }`}
                >
                  <div className="text-2xl mb-2">₿</div>
                  <div className="text-lg font-bold tracking-wide mb-2">bitcoin</div>
                  <div className="text-xs tracking-wide opacity-80">
                    btc on-chain + lightning network
                  </div>
                  <div className="text-xs tracking-wide opacity-80 mt-2">
                    • instant to fast confirmations
                  </div>
                </button>

                {/* Monero Option */}
                <button
                  onClick={() => setSelectedCrypto("monero")}
                  className={`brutalist-border p-6 text-left transition-all ${
                    selectedCrypto === "monero"
                      ? "bg-black text-white"
                      : "bg-white hover:translate-x-1 hover:translate-y-1"
                  }`}
                >
                  <div className="text-2xl mb-2">ɱ</div>
                  <div className="text-lg font-bold tracking-wide mb-2">monero</div>
                  <div className="text-xs tracking-wide opacity-80">
                    xmr - privacy focused
                  </div>
                  <div className="text-xs tracking-wide opacity-80 mt-2">
                    • 20-30 min confirmation time
                  </div>
                </button>
              </div>

              {/* Monero Info Box */}
              {selectedCrypto === "monero" && (
                <div className="mt-4 brutalist-border bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">ℹ️</div>
                    <div className="text-xs tracking-wide leading-relaxed">
                      <strong>note:</strong> monero transactions require 10 network confirmations,
                      which typically takes 20-30 minutes. you can close the payment window after
                      sending and your order will be confirmed automatically.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="brutalist-border bg-white p-6 sticky top-6">
              <h2 className="text-xl font-bold tracking-wide mb-4">order summary</h2>
              <div className="h-[2px] w-full bg-black mb-4"></div>

              <div className="space-y-2 mb-4">
                {cart.map((item) => {
                  const basePrice = calculateDiscountedPrice(item.price, item.discount);
                  const modifiersPrice = item.selectedModifiers?.reduce(
                    (sum, mod) => sum + mod.priceAdjustment,
                    0
                  ) ?? 0;
                  const itemTotal = (basePrice + modifiersPrice) * item.quantity;

                  return (
                    <div key={item.cartItemId}>
                      <div className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>${itemTotal.toFixed(2)}</span>
                      </div>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className="ml-2 mt-1 space-y-0.5">
                          {item.selectedModifiers.map((modifier, idx) => (
                            <div key={idx} className="flex justify-between text-xs opacity-60">
                              <span>+ {modifier.optionLabel}</span>
                              {modifier.priceAdjustment !== 0 && (
                                <span>{modifier.priceAdjustment > 0 ? '+' : ''}${modifier.priceAdjustment.toFixed(2)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="h-[2px] w-full bg-black my-4"></div>

              {/* Coupon Code Section */}
              <div className="mb-4">
                <label className="block text-sm font-bold tracking-wide mb-2">
                  coupon code
                </label>
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleApplyCoupon();
                          }
                        }}
                        className="input-brutalist flex-1 min-w-0 text-sm uppercase"
                        placeholder="ENTER CODE"
                        disabled={applyingCoupon}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="btn-brutalist text-xs px-2 py-2 whitespace-nowrap flex-shrink-0"
                      >
                        {applyingCoupon ? "..." : "apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-600">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="brutalist-border bg-green-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold tracking-wide">{appliedCoupon.code}</span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-xs hover:opacity-50"
                      >
                        ✕ remove
                      </button>
                    </div>
                    <p className="text-xs tracking-wide opacity-60">
                      {appliedCoupon.discount_type === "percentage"
                        ? `${appliedCoupon.discount_value}% discount`
                        : `$${appliedCoupon.discount_value.toFixed(2)} discount`}
                    </p>
                  </div>
                )}
              </div>

              <div className="h-[2px] w-full bg-black my-4"></div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600 font-bold">
                    <span>coupon discount</span>
                    <span>-${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>shipping</span>
                  <span>
                    {loadingShipping ? (
                      <span className="text-xs opacity-60">calculating...</span>
                    ) : shippingCost === 0 ? (
                      <span className="text-green-600 font-bold">FREE</span>
                    ) : (
                      `$${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>

              <div className="h-[2px] w-full bg-black my-4"></div>

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="btn-brutalist-black w-full text-sm"
              >
                {isProcessing ? "processing..." : "proceed to payment"}
              </button>

              <button
                onClick={clearCart}
                className="btn-brutalist w-full text-xs mt-3"
              >
                clear cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
