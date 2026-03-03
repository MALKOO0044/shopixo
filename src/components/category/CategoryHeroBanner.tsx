"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";

interface BannerSlide {
  id: number;
  image: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface CategoryHeroBannerProps {
  categorySlug: string;
  categoryName: string;
  slides?: BannerSlide[];
}

const DEFAULT_BANNERS: Record<string, BannerSlide[]> = {
  "womens-clothing": [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=400&fit=crop",
      title: "New Season Arrivals",
      subtitle: "Discover the latest trends",
      href: "/category/womens-clothing?sort=newest"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1200&h=400&fit=crop",
      title: "Elegant Dresses",
      subtitle: "For every occasion",
      href: "/category/womens-clothing"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=400&fit=crop",
      title: "Style & Comfort",
      subtitle: "Premium quality fashion",
      href: "/category/womens-clothing"
    }
  ],
  "mens-clothing": [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=1200&h=400&fit=crop",
      title: "Men's Collection",
      subtitle: "Elevate your style",
      href: "/category/mens-clothing"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1200&h=400&fit=crop",
      title: "Casual Essentials",
      subtitle: "Everyday comfort",
      href: "/category/mens-clothing"
    }
  ],
  "default": [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      title: "Shop Now",
      subtitle: "Discover amazing deals",
      href: "#"
    }
  ]
};

export default function CategoryHeroBanner({ categorySlug, categoryName, slides }: CategoryHeroBannerProps) {
  const bannerSlides = slides || DEFAULT_BANNERS[categorySlug] || DEFAULT_BANNERS["default"];
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  };

  if (bannerSlides.length === 0) return null;

  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-xl overflow-hidden mb-8 group">
      {bannerSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-8">
            <h2 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{slide.title}</h2>
            {slide.subtitle && (
              <p className="text-lg md:text-xl mb-6 drop-shadow-md">{slide.subtitle}</p>
            )}
            <Link
              href={slide.href as Route}
              className="px-8 py-3 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 transition-colors"
            >
              SHOP NOW
            </Link>
          </div>
        </div>
      ))}

      {bannerSlides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {bannerSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
