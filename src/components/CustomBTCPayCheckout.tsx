"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

interface PaymentMethod {
  paymentMethod: string;
  cryptoCode: string;
  destination: string;
  paymentLink: string;
  rate: string;
  due: string;
  amount: string;
}

interface CustomBTCPayCheckoutProps {
  invoiceId: string;
  amount: number;
  currency: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function CustomBTCPayCheckout({
  invoiceId,
  amount,
  currency,
  onComplete,
  onCancel,
}: CustomBTCPayCheckoutProps) {
  const [status, setStatus] = useState<string>("new");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes default
  const [completionTriggered, setCompletionTriggered] = useState(false);

  const fetchInvoiceStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/btcpay/invoice/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice status");

      const data = await response.json() as {
        status: string;
        expirationTime: number;
      };

      setStatus(data.status);

      // Calculate time left
      const now = Date.now() / 1000;
      const timeRemaining = Math.max(0, Math.floor(data.expirationTime - now));
      setTimeLeft(timeRemaining);

      // Only trigger completion once to prevent duplicate emails
      if ((data.status === "Settled" || data.status === "Processing") && !completionTriggered) {
        setCompletionTriggered(true);
        onComplete();
      }
    } catch (err) {
      console.error("Error fetching invoice status:", err);
    }
  }, [invoiceId, onComplete, completionTriggered]);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await fetch(`/api/btcpay/payment-methods/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch payment methods");

      const methods = await response.json() as PaymentMethod[];
      setPaymentMethods(methods);
      if (methods.length > 0 && methods[0]) {
        setSelectedMethod(methods[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void fetchPaymentMethods();
    void fetchInvoiceStatus();

    // Poll for status updates every 5 seconds
    const interval = setInterval(() => {
      void fetchInvoiceStatus();
    }, 5000);

    // Update timer every second
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
    };
  }, [fetchPaymentMethods, fetchInvoiceStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          <p className="text-sm tracking-wide">preparing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="brutalist-border bg-white p-8 text-center">
        <div className="text-4xl mb-4">[ error ]</div>
        <p className="text-sm tracking-wide mb-4">{error}</p>
        <button onClick={onCancel} className="btn-brutalist text-sm">
          go back
        </button>
      </div>
    );
  }

  if (status === "Expired") {
    return (
      <div className="brutalist-border bg-white p-8 text-center">
        <div className="text-4xl mb-4">[ expired ]</div>
        <p className="text-sm tracking-wide mb-4">
          this invoice has expired. please create a new order.
        </p>
        <button onClick={onCancel} className="btn-brutalist text-sm">
          go back
        </button>
      </div>
    );
  }

  return (
    <div className="brutalist-border bg-white">
      {/* Header */}
      <div className="border-b-[3px] border-black p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-wide mb-2">payment</h2>
            <p className="text-sm tracking-wide">
              {status === "New" && "awaiting payment"}
              {status === "Processing" && "processing payment"}
              {status === "Settled" && "payment complete"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-wide">
              ${amount.toFixed(2)}
            </div>
            <div className="text-xs tracking-wide">{currency}</div>
          </div>
        </div>

        {/* Timer */}
        <div className="brutalist-border px-4 py-2 inline-block">
          <span className="text-sm font-bold tracking-wide">
            time remaining: {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Payment Method Selector */}
      {paymentMethods.length > 1 && (
        <div className="border-b-[3px] border-black p-6">
          <div className="text-sm font-bold tracking-wide mb-3">
            select payment method
          </div>
          <div className="flex gap-2 flex-wrap">
            {paymentMethods.map((method) => (
              <button
                key={method.paymentMethod}
                onClick={() => setSelectedMethod(method)}
                className={`brutalist-border px-4 py-2 text-sm font-bold tracking-wide transition-all ${
                  selectedMethod?.paymentMethod === method.paymentMethod
                    ? "bg-black text-white"
                    : "bg-white"
                }`}
              >
                {method.cryptoCode}
                {method.cryptoCode === "XMR" && " (monero)"}
              </button>
            ))}
          </div>

          {/* Monero Warning */}
          {selectedMethod?.cryptoCode === "XMR" && (
            <div className="mt-4 brutalist-border bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <div className="text-sm font-bold tracking-wide mb-2">
                    monero payment notice
                  </div>
                  <div className="text-xs tracking-wide leading-relaxed space-y-1">
                    <p>• monero transactions require <strong>10 confirmations</strong> on the network</p>
                    <p>• this typically takes <strong>20-30 minutes</strong> to complete</p>
                    <p>• your order will be confirmed after the blockchain confirms the payment</p>
                    <p>• you can safely close this window after sending payment</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Details */}
      {selectedMethod && (
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="text-sm font-bold tracking-wide mb-4">
                scan qr code
              </div>
              <div className="brutalist-border p-4 bg-white">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(selectedMethod.paymentLink)}`}
                  alt="Payment QR Code"
                  width={256}
                  height={256}
                  className="block"
                />
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-4">
              <div>
                <div className="text-sm font-bold tracking-wide mb-2">
                  amount to pay
                </div>
                <div className="brutalist-border p-3 bg-white">
                  <div className="text-lg font-bold tracking-wide">
                    {selectedMethod.amount} {selectedMethod.cryptoCode}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold tracking-wide mb-2">
                  {selectedMethod.cryptoCode} address
                </div>
                <div className="brutalist-border p-3 bg-white flex items-center justify-between gap-2">
                  <div className="text-xs font-mono break-all flex-1">
                    {selectedMethod.destination}
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedMethod.destination)}
                    className="brutalist-border px-3 py-1 text-xs font-bold bg-white hover:translate-x-1 hover:translate-y-1 transition-transform flex-shrink-0"
                  >
                    copy
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold tracking-wide mb-2">
                  payment link
                </div>
                <button
                  onClick={() => {
                    window.open(selectedMethod.paymentLink, "_blank");
                  }}
                  className="btn-brutalist-black text-xs w-full"
                >
                  open in wallet
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 brutalist-border p-4 bg-white">
            <div className="text-xs tracking-wide leading-relaxed space-y-2">
              <p>
                • send exactly <strong>{selectedMethod.amount} {selectedMethod.cryptoCode}</strong> to the address above
              </p>
              <p>
                • payment will be confirmed automatically
              </p>
              {selectedMethod.cryptoCode === "XMR" ? (
                <p>
                  • monero confirmations take 20-30 minutes - you can close this window after sending
                </p>
              ) : (
                <p>
                  • do not close this window until payment is complete
                </p>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-6 text-center">
            {status === "New" && (
              <div className="animate-pulse text-sm tracking-wide">
                waiting for payment...
              </div>
            )}
            {status === "Processing" && (
              <div className="text-sm tracking-wide font-bold">
                processing payment...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer - Only show when payment is not confirmed */}
      {status !== "Settled" && status !== "Processing" && (
        <div className="border-t-[3px] border-black p-4 flex justify-between items-center">
          <p className="text-xs tracking-wide">
            powered by btcpay server
            {selectedMethod?.cryptoCode === "XMR" && " + monero"}
          </p>
          <button onClick={onCancel} className="btn-brutalist text-xs">
            cancel
          </button>
        </div>
      )}
    </div>
  );
}
