"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import NavigationWrapper from "~/components/NavigationWrapper";
import { supabase, type Product, type LabTest, calculateDiscountedPrice, hasDiscount } from "~/lib/supabase";
import { useCart, type SelectedModifier } from "~/context/CartContext";
import { useToast } from "~/context/ToastContext";
import MarkdownPreview from "~/components/MarkdownPreview";
import ProductImageCarousel from "~/components/ProductImageCarousel";
import ProductModifierSelector from "~/components/ProductModifierSelector";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  const fetchProductAndTests = useCallback(async () => {
    try {
      const productId = params.id as string;

      // Fetch product
      const productResult = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productResult.error) throw productResult.error;
      setProduct(productResult.data as Product);

      // Fetch lab tests
      const labTestsResult = await supabase
        .from("lab_tests")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (labTestsResult.error) throw labTestsResult.error;
      setLabTests(labTestsResult.data ?? []);
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchProductAndTests();
  }, [fetchProductAndTests]);

  const handleAddToCart = () => {
    if (product) {
      // Check if all required modifiers are selected
      if (product.modifiers) {
        const requiredGroups = product.modifiers.filter(g => g.required);
        const selectedGroupIds = new Set(selectedModifiers.map(m => m.groupId));
        const missingRequired = requiredGroups.filter(g => !selectedGroupIds.has(g.id));

        if (missingRequired.length > 0) {
          showToast(`Please select: ${missingRequired.map(g => g.label).join(', ')}`, "warning");
          return;
        }
      }

      addToCart(product, selectedModifiers);
      showToast("product added to cart!", "success");
    }
  };

  const handleModifierChange = (selections: SelectedModifier[], price: number) => {
    setSelectedModifiers(selections);
    setTotalPrice(price);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-pulse">[ loading ]</div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white">
        <NavigationWrapper />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center py-16">
            <div className="text-6xl mb-6">[ ! ]</div>
            <h2 className="text-2xl font-bold tracking-wide mb-4">product not found</h2>
            <button
              onClick={() => router.push("/")}
              className="btn-brutalist-black"
            >
              back to products
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <NavigationWrapper />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="btn-brutalist text-xs mb-6"
        >
          ← back to products
        </button>

        {/* Product Details - Mobile: Flex Stack, Desktop: Grid */}
        <div className="flex flex-col md:grid md:grid-cols-2 gap-8 mb-12">
          {/* Image Carousel */}
          <div className="md:row-start-1 md:row-span-1">
            <ProductImageCarousel
              images={product.images && product.images.length > 0 ? product.images : [product.image]}
              productName={product.name}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6 md:row-start-1 md:row-span-2">
            <div>
              <h1 className="text-4xl font-bold tracking-wide mb-6">{product.name}</h1>
              <div className="mb-6">
                <MarkdownPreview content={product.description} />
              </div>
            </div>

            {/* Product Modifiers */}
            {product.modifiers && product.modifiers.length > 0 && (
              <ProductModifierSelector
                modifiers={product.modifiers}
                basePrice={calculateDiscountedPrice(product.price, product.discount)}
                onSelectionChange={handleModifierChange}
              />
            )}

            <div className="brutalist-border bg-white p-6">
              {hasDiscount(product) && (
                <div className="mb-3">
                  <div className="inline-block bg-red-600 text-white px-3 py-1 text-sm font-bold brutalist-border mb-2">
                    {product.discount}% OFF
                  </div>
                </div>
              )}
              <div className="mb-4">
                {hasDiscount(product) ? (
                  <div className="flex items-baseline gap-3">
                    <div className="text-3xl font-bold tracking-wide text-red-600">
                      ${(totalPrice || calculateDiscountedPrice(product.price, product.discount)).toFixed(2)}
                    </div>
                    <div className="text-xl line-through opacity-60">
                      ${(totalPrice ? totalPrice / (1 - (product.discount ?? 0) / 100) : product.price).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-bold tracking-wide">
                    ${(totalPrice || product.price).toFixed(2)}
                  </div>
                )}
                {totalPrice > calculateDiscountedPrice(product.price, product.discount) && (
                  <span className="text-sm mt-2 opacity-60 block">
                    (base: ${calculateDiscountedPrice(product.price, product.discount).toFixed(2)})
                  </span>
                )}
              </div>
              <div className="mb-6">
                <div className="text-xs tracking-wide opacity-60 mb-1">availability</div>
                <div className={`font-bold tracking-wide ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-yellow-600' : ''}`}>
                  {product.stock === 0 ? 'out of stock' : product.stock < 10 ? `only ${product.stock} left in stock` : `${product.stock} in stock`}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`w-full ${product.stock === 0 ? 'btn-brutalist opacity-50 cursor-not-allowed' : 'btn-brutalist-black'}`}
              >
                {product.stock === 0 ? 'out of stock' : 'add to cart'}
              </button>
            </div>
          </div>

          {/* Lab Tests Section - Mobile: Last item, Desktop: Below image carousel */}
          {labTests.length > 0 && (
            <div className="brutalist-border bg-white p-6 md:row-start-2 md:col-start-1">
              <h2 className="text-2xl font-bold tracking-wide mb-6">lab testing</h2>
              <div className="space-y-4">
                {labTests.map((test) => (
                  <div key={test.id} className="brutalist-border bg-white p-4">
                    <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-4 md:gap-4 md:items-center">
                      <div>
                        <div className="text-xs tracking-wide opacity-60 mb-1">batch</div>
                        <div className="font-bold tracking-wide">{test.batch}</div>
                      </div>
                      <div>
                        <div className="text-xs tracking-wide opacity-60 mb-1">purity</div>
                        <div className="font-bold tracking-wide">{test.purity}</div>
                      </div>
                      <div>
                        <div className="text-xs tracking-wide opacity-60 mb-1">tested</div>
                        <div className="font-bold tracking-wide text-xs">
                          {new Date(test.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="md:flex md:justify-end">
                        <a
                          href={test.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-brutalist-black text-xs px-4 py-2 w-full md:w-auto block text-center"
                        >
                          view results →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
