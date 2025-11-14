"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "~/lib/supabase";
import { calculateDiscountedPrice, hasDiscount } from "~/lib/supabase";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="card-brutalist bg-white max-w-full">
      {/* Product Image */}
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
        {!imageError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-2">[ ]</div>
              <div className="text-xs">no image</div>
            </div>
          </div>
        )}
        {hasDiscount(product) && (
          <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 text-xs font-bold brutalist-border">
            {product.discount}% OFF
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">
            {product.name}
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {product.short_description ?? product.description.split('\n\n')[0]}
          </p>
        </div>

        {/* Price and Actions */}
        <div className="space-y-3 mt-5 pt-5 border-t border-gray-100">
          <div className="flex items-baseline justify-between">
            <div>
              {hasDiscount(product) ? (
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-semibold text-red-600">
                    ${calculateDiscountedPrice(product.price, product.discount).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 line-through">
                    ${product.price.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-semibold text-gray-900">
                  ${product.price.toFixed(2)}
                </div>
              )}
            </div>
            <div className={`text-xs tracking-wide ${product.stock === 0 ? 'text-red-600 font-bold' : product.stock < 10 ? 'text-yellow-600' : 'text-gray-500'}`}>
              {product.stock === 0 ? 'out of stock' : product.stock < 10 ? `${product.stock} left` : 'in stock'}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/products/${product.id}`}
              className="btn-brutalist text-sm px-4 py-2 flex-1 text-center"
            >
              view details
            </Link>
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className={`text-sm px-4 py-2 flex-1 ${product.stock === 0 ? 'btn-brutalist opacity-50 cursor-not-allowed' : 'btn-brutalist-black'}`}
            >
              {product.stock === 0 ? 'out of stock' : 'add to cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
