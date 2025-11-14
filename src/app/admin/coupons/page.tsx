"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "~/components/Navigation";
import { supabase, type Coupon } from "~/lib/supabase";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";

interface ProductListItem {
  id: string;
  name: string;
}

function CouponsPageContent() {
  const { isAuthenticated, isLoading, login } = useAdminAuth();
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    minimum_order_amount: "",
    max_uses: "",
    one_per_customer: false,
    valid_from: new Date().toISOString().split('T')[0] ?? "",
    valid_until: "",
    active: true,
    applicable_to: "all" as "all" | "specific",
    product_ids: [] as string[],
  });

  useEffect(() => {
    void fetchCoupons();
    void fetchProducts();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data ?? []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingCoupon(null);
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      minimum_order_amount: "",
      max_uses: "",
      one_per_customer: false,
      valid_from: new Date().toISOString().split('T')[0] ?? "",
      valid_until: "",
      active: true,
      applicable_to: "all",
      product_ids: [],
    });
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsCreating(false);
    setFormData({
      code: coupon.code,
      description: coupon.description ?? "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      minimum_order_amount: coupon.minimum_order_amount?.toString() ?? "",
      max_uses: coupon.max_uses?.toString() ?? "",
      one_per_customer: coupon.one_per_customer,
      valid_from: coupon.valid_from.split('T')[0] ?? "",
      valid_until: coupon.valid_until?.split('T')[0] ?? "",
      active: coupon.active,
      applicable_to: coupon.applicable_to,
      product_ids: coupon.product_ids ?? [],
    });
  };

  const handleCancel = () => {
    setEditingCoupon(null);
    setIsCreating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const couponData = {
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      one_per_customer: formData.one_per_customer,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until || null,
      active: formData.active,
      applicable_to: formData.applicable_to,
      product_ids: formData.applicable_to === "specific" && formData.product_ids.length > 0 ? formData.product_ids : null,
    };

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert([{ ...couponData, current_uses: 0 }]);

        if (error) throw error;
      }

      await fetchCoupons();
      handleCancel();
    } catch (error) {
      console.error("Error saving coupon:", error);
      showToast("Failed to save coupon. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      showToast("Failed to delete coupon. Please try again.", "error");
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ active: !coupon.active })
        .eq("id", coupon.id);

      if (error) throw error;
      await fetchCoupons();
    } catch (error) {
      console.error("Error toggling coupon status:", error);
      showToast("Failed to update coupon status. Please try again.", "error");
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

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-wide mb-2">admin panel - coupons</h1>
            <div className="h-[3px] w-20 bg-black mb-4"></div>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="btn-brutalist text-xs px-4 py-2">
              back to products
            </Link>
            <Link href="/admin/banner" className="btn-brutalist text-xs px-4 py-2">
              manage banner
            </Link>
            <Link href="/admin/orders" className="btn-brutalist text-xs px-4 py-2">
              view orders
            </Link>
            {!isCreating && !editingCoupon && (
              <button onClick={handleCreate} className="btn-brutalist-black text-xs px-4 py-2">
                + create new coupon
              </button>
            )}
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingCoupon) && (
          <div className="brutalist-border bg-white p-6 mb-8">
            <h2 className="text-xl font-bold tracking-wide mb-4">
              {editingCoupon ? "edit coupon" : "create coupon"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Coupon Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-bold tracking-wide mb-2">
                  coupon code *
                </label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="input-brutalist w-full uppercase"
                  required
                  placeholder="SAVE20"
                />
                <p className="text-xs tracking-wide mt-1 opacity-60">
                  customers will enter this code at checkout
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-bold tracking-wide mb-2">
                  description
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-brutalist w-full"
                  placeholder="Internal note about this coupon"
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="discount_type" className="block text-sm font-bold tracking-wide mb-2">
                    discount type *
                  </label>
                  <select
                    id="discount_type"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" })}
                    className="input-brutalist w-full"
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="discount_value" className="block text-sm font-bold tracking-wide mb-2">
                    discount value *
                  </label>
                  <input
                    type="number"
                    id="discount_value"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === "percentage" ? "100" : undefined}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="input-brutalist w-full"
                    required
                    placeholder={formData.discount_type === "percentage" ? "10" : "20.00"}
                  />
                  <p className="text-xs tracking-wide mt-1 opacity-60">
                    {formData.discount_type === "percentage" ? "1-100%" : "dollar amount"}
                  </p>
                </div>
              </div>

              {/* Minimum Order Amount and Max Uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="minimum_order_amount" className="block text-sm font-bold tracking-wide mb-2">
                    minimum order amount
                  </label>
                  <input
                    type="number"
                    id="minimum_order_amount"
                    step="0.01"
                    min="0"
                    value={formData.minimum_order_amount}
                    onChange={(e) => setFormData({ ...formData, minimum_order_amount: e.target.value })}
                    className="input-brutalist w-full"
                    placeholder="0.00 (optional)"
                  />
                  <p className="text-xs tracking-wide mt-1 opacity-60">
                    leave empty for no minimum
                  </p>
                </div>

                <div>
                  <label htmlFor="max_uses" className="block text-sm font-bold tracking-wide mb-2">
                    max uses
                  </label>
                  <input
                    type="number"
                    id="max_uses"
                    min="1"
                    step="1"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    className="input-brutalist w-full"
                    placeholder="unlimited"
                  />
                  <p className="text-xs tracking-wide mt-1 opacity-60">
                    leave empty for unlimited uses
                  </p>
                </div>
              </div>

              {/* Valid From and Valid Until */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="valid_from" className="block text-sm font-bold tracking-wide mb-2">
                    valid from *
                  </label>
                  <input
                    type="date"
                    id="valid_from"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="input-brutalist w-full"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="valid_until" className="block text-sm font-bold tracking-wide mb-2">
                    valid until
                  </label>
                  <input
                    type="date"
                    id="valid_until"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="input-brutalist w-full"
                  />
                  <p className="text-xs tracking-wide mt-1 opacity-60">
                    leave empty for no expiration
                  </p>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.one_per_customer}
                    onChange={(e) => setFormData({ ...formData, one_per_customer: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-bold tracking-wide">
                    one per customer (each customer can only use once)
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-bold tracking-wide">
                    active (coupon is enabled)
                  </span>
                </label>
              </div>

              {/* Product Applicability */}
              <div>
                <label className="block text-sm font-bold tracking-wide mb-2">
                  applicable to
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="applicable_to"
                      value="all"
                      checked={formData.applicable_to === "all"}
                      onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as "all" })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm tracking-wide">all products</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="applicable_to"
                      value="specific"
                      checked={formData.applicable_to === "specific"}
                      onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as "specific" })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm tracking-wide">specific products</span>
                  </label>
                </div>

                {formData.applicable_to === "specific" && (
                  <div className="mt-3 brutalist-border bg-gray-50 p-4">
                    <p className="text-xs tracking-wide mb-3 font-bold">select products:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {products.map((product) => (
                        <label key={product.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.product_ids.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  product_ids: [...formData.product_ids, product.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  product_ids: formData.product_ids.filter((id) => id !== product.id),
                                });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-xs tracking-wide">{product.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-brutalist-black" disabled={saving}>
                  {saving ? "saving..." : (editingCoupon ? "update coupon" : "create coupon")}
                </button>
                <button type="button" onClick={handleCancel} className="btn-brutalist" disabled={saving}>
                  cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coupons List */}
        <div className="space-y-4">
          {coupons.length === 0 ? (
            <div className="text-center py-16 brutalist-border bg-white">
              <div className="text-4xl mb-4">[ ]</div>
              <p className="text-sm tracking-wide mb-6">no coupons yet. create one to get started.</p>
              <button onClick={handleCreate} className="btn-brutalist-black px-6 py-3">
                create first coupon
              </button>
            </div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="brutalist-border bg-white p-4">
                <div className="flex gap-4 items-start">
                  {/* Coupon Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold tracking-wide">{coupon.code}</h3>
                      {!coupon.active && (
                        <span className="text-xs font-bold tracking-wide bg-gray-300 px-2 py-1">
                          INACTIVE
                        </span>
                      )}
                      {coupon.active && (
                        <span className="text-xs font-bold tracking-wide bg-green-600 text-white px-2 py-1">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {coupon.description && (
                      <p className="text-xs tracking-wide mb-2 opacity-60">{coupon.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs tracking-wide">
                      <div>
                        <div className="opacity-60">Discount:</div>
                        <div className="font-bold">
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : `$${coupon.discount_value.toFixed(2)}`}
                        </div>
                      </div>

                      <div>
                        <div className="opacity-60">Uses:</div>
                        <div className="font-bold">
                          {coupon.current_uses} / {coupon.max_uses ?? "∞"}
                        </div>
                      </div>

                      <div>
                        <div className="opacity-60">Valid:</div>
                        <div className="font-bold">
                          {new Date(coupon.valid_from).toLocaleDateString()} -{" "}
                          {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : "∞"}
                        </div>
                      </div>

                      <div>
                        <div className="opacity-60">Min Order:</div>
                        <div className="font-bold">
                          {coupon.minimum_order_amount ? `$${coupon.minimum_order_amount.toFixed(2)}` : "None"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleActive(coupon)}
                      className="btn-brutalist text-xs px-4 py-2"
                    >
                      {coupon.active ? "deactivate" : "activate"}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="btn-brutalist text-xs px-4 py-2"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="btn-brutalist text-xs px-4 py-2 hover:bg-red-50"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

export default function CouponsPage() {
  return (
    <AdminAuthProvider>
      <CouponsPageContent />
    </AdminAuthProvider>
  );
}
