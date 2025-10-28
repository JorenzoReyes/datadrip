'use client';

import Image from 'next/image';
import { useMemo, useState, useEffect, useRef } from 'react';

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

  const hasVideo = Array.isArray(product.videos) && product.videos.length > 0;
  const [mediaTab, setMediaTab] = useState<'images' | 'video'>(hasVideo ? 'images' : 'images');
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);
  const [imageAspect, setImageAspect] = useState<number>(4 / 3);

  useEffect(() => {
    setActiveIndex(0);
    setMediaTab(hasVideo ? 'images' : 'images');
  }, [product.product_id]);

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
            <div className="md:col-span-2">
              {/* Media Tabs */}
              {hasVideo && (
                <div className="mb-2 inline-flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    className={`px-3 py-1 text-xs ${mediaTab === 'images' ? 'bg-gray-100 text-header' : 'bg-white text-subheader hover:bg-gray-50'}`}
                    onClick={() => setMediaTab('images')}
                  >
                    Images
                  </button>
                  <button
                    className={`px-3 py-1 text-xs border-l border-gray-200 ${mediaTab === 'video' ? 'bg-gray-100 text-header' : 'bg-white text-subheader hover:bg-gray-50'}`}
                    onClick={() => setMediaTab('video')}
                  >
                    Video
                  </button>
                </div>
              )}

              <div
                className={"relative w-full rounded-lg border border-gray-200 bg-gray-50 overflow-hidden " + (mediaTab === 'video' && hasVideo ? 'h-80 w-full' : 'h-80 w-full')}
                style={mediaTab === 'video' && hasVideo ? { aspectRatio: String(videoAspect) } : { aspectRatio: String(imageAspect) }}
              >
                {mediaTab === 'video' && hasVideo ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <video
                      src={product.videos![0]}
                      controls
                      className="h-full w-full object-contain"
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        if (v.videoWidth && v.videoHeight) {
                          setVideoAspect(v.videoWidth / v.videoHeight);
                        }
                      }}
                    />
                  </div>
                ) : galleryImages.length > 0 ? (
                  <div
                    ref={scrollerRef}
                    className="h-full w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
                    onScroll={() => {
                      const el = scrollerRef.current;
                      if (!el) return;
                      const idx = Math.round(el.scrollLeft / el.clientWidth);
                      if (idx !== activeIndex) setActiveIndex(Math.max(0, Math.min(idx, galleryImages.length - 1)));
                    }}
                    onWheel={(e) => {
                      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                        const el = scrollerRef.current;
                        if (!el) return;
                        el.scrollLeft += e.deltaY;
                        e.preventDefault();
                      }
                    }}
                  >
                    {galleryImages.map((src, idx) => (
                      <div key={src} className="min-w-full h-full flex items-center justify-center snap-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={product.name}
                          className="h-full w-full object-contain"
                          onLoad={(e) => {
                            if (idx === activeIndex) {
                              const img = e.currentTarget as HTMLImageElement;
                              if (img.naturalWidth && img.naturalHeight) {
                                setImageAspect(img.naturalWidth / img.naturalHeight);
                              }
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">No image</div>
                )}

                {mediaTab === 'images' && galleryImages.length > 1 && (
                  <>
                    <button
                      aria-label="Previous"
                      onClick={() => {
                        const next = activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1;
                        setActiveIndex(next);
                        scrollerRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white p-1 shadow border"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      aria-label="Next"
                      onClick={() => {
                        const next = activeIndex === galleryImages.length - 1 ? 0 : activeIndex + 1;
                        setActiveIndex(next);
                        scrollerRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white p-1 shadow border"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {mediaTab === 'images' && galleryImages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((src, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt="thumb"
                      onClick={() => {
                        setActiveIndex(idx);
                        scrollerRef.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                      className={`h-16 w-16 object-cover rounded border cursor-pointer ${
                        idx === activeIndex ? 'border-primary-500 ring-2 ring-primary-300' : 'border-gray-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="md:col-span-1 space-y-3">
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

          {/* Removed bottom video list; handled via mediaTab viewer above */}
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


