"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "~/components/Navigation";
import { supabase, type Product, calculateDiscountedPrice, hasDiscount } from "~/lib/supabase";
import Image from "next/image";
import { AdminAuthProvider, useAdminAuth } from "~/context/AdminAuthContext";
import AdminLogin from "~/components/AdminLogin";
import { useToast } from "~/context/ToastContext";

function AdminPageContent() {
  const { isAuthenticated, isLoading, login } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("Failed to delete product. Please try again.", "error");
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
            <h1 className="text-3xl font-bold tracking-wide mb-2">admin panel - products</h1>
            <div className="h-[3px] w-20 bg-black mb-4"></div>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/coupons" className="btn-brutalist text-xs px-4 py-2">
              manage coupons
            </Link>
            <Link href="/admin/banner" className="btn-brutalist text-xs px-4 py-2">
              manage banner
            </Link>
            <Link href="/admin/orders" className="btn-brutalist text-xs px-4 py-2">
              view orders
            </Link>
            <button
              onClick={() => router.push("/admin/new")}
              className="btn-brutalist text-xs px-4 py-2"
            >
              + create new product
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-16 brutalist-border bg-white">
              <div className="text-4xl mb-4">[ ]</div>
              <p className="text-sm tracking-wide mb-6">no products yet. create one to get started.</p>
              <button
                onClick={() => router.push("/admin/new")}
                className="btn-brutalist-black px-6 py-3"
              >
                create first product
              </button>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="brutalist-border bg-white p-4 hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-24 h-24 brutalist-border flex-shrink-0 bg-gray-50">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                      unoptimized
                    />
                    {product.hidden && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">HIDDEN</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold tracking-wide mb-1">
                      <Link
                        href={`/admin/preview/${product.id}`}
                        className="hover:underline hover:text-blue-600 transition-colors"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <p className="text-xs tracking-wide mb-2 opacity-60">
                      {product.short_description ?? product.description.split('\n\n')[0]?.substring(0, 100)}
                      {(product.short_description ?? product.description.split('\n\n')[0] ?? "").length > 100 && "..."}
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      {hasDiscount(product) ? (
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold tracking-wide text-red-600">
                            ${calculateDiscountedPrice(product.price, product.discount).toFixed(2)}
                          </div>
                          <div className="text-xs tracking-wide line-through opacity-60">
                            ${product.price.toFixed(2)}
                          </div>
                          <div className="text-xs font-bold tracking-wide bg-red-600 text-white px-2 py-1">
                            {product.discount}% OFF
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-bold tracking-wide">${product.price.toFixed(2)}</div>
                      )}
                      <div className={`text-xs tracking-wide ${
                        product.stock === 0
                          ? 'text-red-600 font-bold'
                          : product.stock < 10
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {product.stock === 0 ? 'OUT OF STOCK' : `${product.stock} in stock`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/admin/preview/${product.id}`}
                      className="btn-brutalist text-xs px-4 py-2 text-center"
                    >
                      preview
                    </Link>
                    <button
                      onClick={() => router.push(`/admin/${product.id}`)}
                      className="btn-brutalist-black text-xs px-4 py-2"
                    >
                      edit
                    </button>
                    <Link
                      href={`/admin/lab-tests/${product.id}`}
                      className="btn-brutalist text-xs px-4 py-2 text-center"
                    >
                      lab tests
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
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

        {/* Product Count */}
        {products.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-xs tracking-wide opacity-60">
              {products.length} {products.length === 1 ? "product" : "products"} total
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminPageContent />
    </AdminAuthProvider>
  );
}
