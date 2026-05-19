'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { tracker } from '@/lib/tracker';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  weight?: string;
  isOrganic?: boolean;
  isNewArrival?: boolean;
}

interface ProductCardProps {
  product: Product;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? 'fill-accent text-accent' : 'text-gray-200 fill-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">({count})</span>
    </div>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      price: product.price,
      quantity: 1,
      weight: product.weight,
    });
    tracker.trackAddToCart(product, 1);
    // toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      price: product.price,
      quantity: 1,
      weight: product.weight,
    });
    tracker.trackAddToCart(product, 1);
    router.push('/checkout');
  };

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <Link href={`/products/${product.slug}`} className="product-card group block">
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-50">
        <Image
          src={product.images[0] || '/placeholder.jpg'}
          alt={product.name}
          width={300}
          height={300}
          className="product-card-img"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isOrganic && (
            <span className="badge-organic">🌿 Organic</span>
          )}
          {product.isNewArrival && (
            <span className="badge-new">New</span>
          )}
          {discount && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1.5 leading-snug">
          {product.name}
        </h3>
        {product.weight && (
          <p className="text-xs text-gray-400 mb-1">{product.weight}</p>
        )}
        <StarRating rating={product.rating} count={product.reviewCount} />

        <div className="flex flex-col gap-2 mt-2.5">
          <div>
            <span className="text-base font-bold text-primary">৳{product.price.toFixed(2)}</span>
            {product.comparePrice && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">
                ৳{product.comparePrice.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-primary text-white text-xs font-semibold
                         rounded-lg hover:bg-primary-hover active:scale-95 transition-all duration-150"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-accent text-white text-xs font-semibold
                         rounded-lg hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              <Zap className="w-3.5 h-3.5" />
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
