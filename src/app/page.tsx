"use client";

import { useEffect, useState } from "react";
import ProductCard from "~/components/ProductCard";
import NavigationWrapper from "~/components/NavigationWrapper";
import { useCart } from "~/context/CartContext";
import { useToast } from "~/context/ToastContext";
import { supabase, type Product } from "~/lib/supabase";

export default function HomePage() {
  const { addToCart } = useCart();
  const { showToast } = useToast();
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
        .eq("hidden", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setProducts(data ?? []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    showToast("product added to cart!", "success");
  };

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight mb-5 text-gray-900">
              us-based and 3rd party tested hormones
            </h2>
            <p className="text-base leading-relaxed text-gray-600">
              Welcome! Our mission is to bring you safe, reliable, and quality products. We use premium ingredients and employ state of the art sterilization. In addition, we are one of the few labs with transparent per-batch testing & certificates. All products ship internationally from our network of warehouses.
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-gray-900">
              available products
            </h2>
            <p className="text-sm text-gray-600">
              browse our current product selection
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="text-3xl mb-3 animate-pulse text-gray-400">loading</div>
              <p className="text-sm text-gray-500">fetching products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-3xl mb-3 text-gray-300">—</div>
              <p className="text-sm text-gray-500">no products available yet</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
              {products.map((product) => (
                <div key={product.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1.333rem)] xl:w-[calc(25%-1.5rem)]">
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>© 2025 symphony labs. all rights reserved.</div>
            <div>powered by btcpay server</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
