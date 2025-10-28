'use client';

import Image from 'next/image';
import { useMemo } from 'react';

type Product = {
  product_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  highlights: string | null;
  in_box: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  product_type: string | null;
  price: number;
  special_price: number | null;
  cost?: number | null;
  currency: string;
  stock: number;
  reorder_level?: number | null;
  status: string;
  images: string[] | null;
  videos: string[] | null;
  promotion_image: string | null;
  attributes: { [key: string]: unknown } | null;
};

export default function ViewProductModal({ product, onClose }: { product: Product; onClose: () => void; }) {
  const galleryImages = useMemo(() => {
    const images: string[] = [];
    if (product.images && Array.isArray(product.images)) {
      images.push(...product.images.filter((u): u is string => typeof u === 'string'));
    }
    if (product.promotion_image && typeof product.promotion_image === 'string') {
      images.unshift(product.promotion_image);
    }
    return images.slice(0, 12);
  }, [product.images, product.promotion_image]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-xl font-bold font-title text-header">Product Details</h3>
          <button onClick={onClose} className="text-subheader hover:text-header">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6">
          {/* Top section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gallery */}
            <div className="md:col-span-1">
              <div className="aspect-square w-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {galleryImages[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={galleryImages[0]} alt={product.name} className="h-full w-full object-contain" />
                ) : (
                  <div className="text-gray-400">No image</div>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {galleryImages.slice(1, 11).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="thumb" className="h-16 w-full object-cover rounded border border-gray-200" />
                  ))}
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <div className="text-xs text-subheader">Name</div>
                <div className="text-sm font-medium text-header">{product.name}</div>
              </div>
              {product.sku && (
                <div>
                  <div className="text-xs text-subheader">SKU</div>
                  <div className="text-sm text-header">{product.sku}</div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Brand" value={product.brand} />
                <Field label="Status" value={product.status} />
                <Field label="Category" value={product.category} />
                <Field label="Subcategory" value={product.subcategory} />
                <Field label="Product Type" value={product.product_type} />
                <Field label="Stock" value={String(product.stock)} />
                <Field label="Price" value={`${product.currency} ${parseFloat(product.price.toString()).toFixed(2)}`} />
                {product.special_price != null && (
                  <Field label="Special Price" value={`${product.currency} ${parseFloat(String(product.special_price)).toFixed(2)}`} />
                )}
              </div>
            </div>
          </div>

          {/* Descriptions */}
          {product.description && (
            <div>
              <div className="text-xs text-subheader">Description</div>
              <div className="text-sm text-header whitespace-pre-line">{product.description}</div>
            </div>
          )}
          {product.highlights && (
            <div>
              <div className="text-xs text-subheader">Highlights</div>
              <div className="text-sm text-header whitespace-pre-line">{product.highlights}</div>
            </div>
          )}
          {product.in_box && (
            <div>
              <div className="text-xs text-subheader">In the box</div>
              <div className="text-sm text-header whitespace-pre-line">{product.in_box}</div>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div>
              <div className="text-xs text-subheader mb-2">Attributes</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <span className="text-subheader">{k}: </span>
                    <span className="text-header">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {product.videos && product.videos.length > 0 && (
            <div>
              <div className="text-xs text-subheader mb-2">Videos</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.videos.slice(0, 4).map((src) => (
                  <video key={src} src={src} controls className="w-full rounded-lg border border-gray-200" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-header hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null; }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-subheader">{label}</div>
      <div className="text-sm text-header">{value}</div>
    </div>
  );
}


