"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

interface ProductImageCarouselProps {
  images: string[];
  productName: string;
}

export default function ProductImageCarousel({
  images,
  productName,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState<Set<number>>(new Set());

  // All hooks must be called before any conditional returns
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleImageError = useCallback((index: number) => {
    setImageError((prev) => new Set(prev).add(index));
  }, []);

  const currentImageHasError = imageError.has(currentIndex);

  // If no images provided, show placeholder
  if (!images?.length) {
    return (
      <div className="brutalist-border bg-white p-0 overflow-hidden max-w-full">
        <div className="relative w-full aspect-square bg-white overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-6xl mb-4">[ ]</div>
              <div className="text-sm tracking-wide">no image</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="brutalist-border bg-white p-0 overflow-hidden max-w-full">
      {/* Main Image */}
      <div className="relative w-full aspect-square bg-white overflow-hidden">
        {!currentImageHasError ? (
          <Image
            src={images[currentIndex] ?? ""}
            alt={`${productName} - Image ${currentIndex + 1}`}
            fill
            className="object-cover"
            onError={() => handleImageError(currentIndex)}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={currentIndex === 0}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="text-6xl mb-4">[ ! ]</div>
              <div className="text-sm tracking-wide">image not found</div>
              <div className="text-xs mt-2 opacity-60">{images[currentIndex]}</div>
            </div>
          </div>
        )}

        {/* Navigation Arrows (only show if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-all duration-150 active:scale-90 border border-gray-200"
              aria-label="Previous image"
            >
              <span className="text-sm">←</span>
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center hover:bg-white transition-all duration-150 active:scale-90 border border-gray-200"
              aria-label="Next image"
            >
              <span className="text-sm">→</span>
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip (only show if multiple images) */}
      {images.length > 1 && (
        <div className="border-t border-gray-200 p-3 bg-white">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                onClick={() => handleThumbnailClick(index)}
                className={`relative flex-shrink-0 w-16 h-16 overflow-hidden transition-all duration-150 rounded ${
                  currentIndex === index
                    ? "opacity-100 scale-105"
                    : "opacity-60 hover:opacity-100"
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={image}
                  alt={`${productName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
                {currentIndex === index && (
                  <div className="absolute inset-0 border-2 border-black rounded"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
