'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import AutocompleteSelect from './AutocompleteSelect';

interface EditProductModalProps {
  product: {
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
  stock: number;
    weight_value: number | null;
    weight_unit: string | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    has_dangerous: boolean;
    warranty_type: string | null;
    warranty_period: string | null;
    warranty_policy: string | null;
    status: string;
    images: string[] | null;
    videos: string[] | null;
    promotion_image: string | null;
    attributes: {[key: string]: unknown} | null;
  };
  onClose: () => void;
  onSave: (productData: {
    name: string;
    sku?: string;
    description?: string;
    highlights?: string;
    in_box?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    product_type?: string;
    price: number;
    special_price?: number;
    stock: number;
    images?: string[];
    videos?: string[];
    promotion_image?: string | null;
    status?: string;
    weight_value?: number;
    weight_unit?: string;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    has_dangerous?: boolean;
    warranty_type?: string;
    warranty_period?: string;
    warranty_policy?: string;
    attributes?: {[key: string]: unknown};
  }) => Promise<void>;
  userEmail?: string;
}

export default function EditProductModal({ product, onClose, onSave, userEmail }: EditProductModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showExample, setShowExample] = useState(false);
  const hideExampleTimer = useRef<number | null>(null);
  const [productName, setProductName] = useState(product.name);
  const [productImages, setProductImages] = useState<string[]>(product.images || []);
  const [productVideos, setProductVideos] = useState<string[]>(product.videos || []);
  const [promoImage, setPromoImage] = useState<string | null>(product.promotion_image);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [hasHadImages, setHasHadImages] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSpecialPrice, setShowSpecialPrice] = useState(!!product.special_price);
  const [specialPrice, setSpecialPrice] = useState(product.special_price?.toString() || '');
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [sellerSKU, setSellerSKU] = useState(product.sku || '');
  const [isAvailable, setIsAvailable] = useState(product.status === 'active');
  const errorTimeouts = useRef<{ [key: string]: number }>({});
  
  // Additional form fields for backend integration
  const [description, setDescription] = useState(product.description || '');
  const [highlights, setHighlights] = useState(product.highlights || '');
  const [in_box, setIn_box] = useState(product.in_box || '');
  const [brand, setBrand] = useState(product.brand || '');
  const [category, setCategory] = useState(product.category || '');
  const [subcategory, setSubcategory] = useState(product.subcategory || '');
  const [product_type, setProduct_type] = useState(product.product_type || '');
  const [packageWeight, setPackageWeight] = useState(product.weight_value?.toString() || '');
  const [packageWeightUnit, setPackageWeightUnit] = useState(product.weight_unit || 'kg');
  const [packageLength, setPackageLength] = useState(product.length_cm?.toString() || '');
  const [packageWidth, setPackageWidth] = useState(product.width_cm?.toString() || '');
  const [packageHeight, setPackageHeight] = useState(product.height_cm?.toString() || '');
  const [hasDangerous, setHasDangerous] = useState(product.has_dangerous);
  const [warrantyType, setWarrantyType] = useState(product.warranty_type || '');
  const [warrantyPeriod, setWarrantyPeriod] = useState(product.warranty_period || '');
  const [warrantyPolicy, setWarrantyPolicy] = useState(product.warranty_policy || '');
  const [attributes, setAttributes] = useState<{[key: string]: unknown}>(product.attributes || {});
  
  // API data states
  const [categories, setCategories] = useState<Array<{id: number, name: string, icon: string | null}>>([]);
  const [subcategories, setSubcategories] = useState<Array<{id: number, name: string}>>([]);
  const [productTypes, setProductTypes] = useState<Array<{id: number, name: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (category) {
      const fetchSubcategories = async () => {
        try {
          const response = await fetch(`/api/subcategories?categoryName=${encodeURIComponent(category)}`);
          const data = await response.json();
          setSubcategories(data.subcategories || []);
        } catch (error) {
          console.error('Error fetching subcategories:', error);
        }
      };
      fetchSubcategories();
    } else {
      setSubcategories([]);
    }
  }, [category]);

  // Fetch product types when subcategory changes
  useEffect(() => {
    if (category && subcategory) {
      const fetchProductTypes = async () => {
        try {
          const response = await fetch(`/api/product-types?subcategoryName=${encodeURIComponent(subcategory)}&categoryName=${encodeURIComponent(category)}`);
          const data = await response.json();
          setProductTypes(data.productTypes || []);
        } catch (error) {
          console.error('Error fetching product types:', error);
        }
      };
      fetchProductTypes();
    } else {
      setProductTypes([]);
    }
  }, [category, subcategory]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [submitError, setSubmitError] = useState<string | null>(null);


  const setErrorWithTimeout = (key: string, message: string) => {
    // Clear existing timeout for this key
    if (errorTimeouts.current[key]) {
      clearTimeout(errorTimeouts.current[key]);
    }
    
    // Set the error message
    setErrors(prev => ({ ...prev, [key]: message }));
    
    // Set timeout to clear error after 3 seconds
    errorTimeouts.current[key] = window.setTimeout(() => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
      delete errorTimeouts.current[key];
    }, 3000);
  };

  const updateAttribute = (key: string, value: unknown) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Initialize hasHadImages based on existing images
  useEffect(() => {
    if (productImages.length > 0) {
      setHasHadImages(true);
    }
  }, [productImages.length]);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!productName.trim()) {
      errors.productName = 'Product name is required';
    }
    
    if (productImages.length === 0) {
      errors.productImages = 'At least one product image is required';
    }
    
    if (!brand.trim()) {
      errors.brand = 'Brand is required';
    }
    
    if (!price || parseFloat(price) <= 0) {
      errors.price = 'Price is required and must be greater than 0';
    }
    
    if (!packageWeight || parseFloat(packageWeight) <= 0) {
      errors.packageWeight = 'Package weight is required and must be greater than 0';
    }
    
    if (!packageLength || parseFloat(packageLength) <= 0) {
      errors.packageLength = 'Package length is required and must be greater than 0';
    }
    
    if (!packageWidth || parseFloat(packageWidth) <= 0) {
      errors.packageWidth = 'Package width is required and must be greater than 0';
    }
    
    if (!packageHeight || parseFloat(packageHeight) <= 0) {
      errors.packageHeight = 'Package height is required and must be greater than 0';
    }
    
    if (!category) {
      errors.category = 'Category is required';
    }
    
    if (!subcategory) {
      errors.subcategory = 'Subcategory is required';
    }
    
    if (!product_type) {
      errors.product_type = 'Product type is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    const productData = {
        name: productName.trim(),
        sku: sellerSKU.trim() || undefined,
        description: description.trim() || undefined,
        highlights: highlights.trim() || undefined,
        in_box: in_box.trim() || undefined,
        brand: brand.trim() || undefined,
        category: category || undefined,
        subcategory: subcategory || undefined,
        product_type: product_type || undefined,
        price: parseFloat(price),
        special_price: showSpecialPrice && specialPrice ? parseFloat(specialPrice) : undefined,
        stock: parseInt(stock) || 0,
        images: productImages,
        videos: productVideos,
        promotion_image: promoImage,
        status: isAvailable ? 'active' : 'inactive',
        weight_value: packageWeight ? parseFloat(packageWeight) : undefined,
        weight_unit: packageWeightUnit,
        length_cm: packageLength ? parseFloat(packageLength) : undefined,
        width_cm: packageWidth ? parseFloat(packageWidth) : undefined,
        height_cm: packageHeight ? parseFloat(packageHeight) : undefined,
        has_dangerous: hasDangerous,
        warranty_type: warrantyType || undefined,
        warranty_period: warrantyPeriod || undefined,
        warranty_policy: warrantyPolicy.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      };
      
      console.log('Saving product data:', productData);
      
      try {
        await onSave(productData);
        
        onClose();
      } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    const maxImages = 8;
    const remainingSlots = maxImages - productImages.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        setErrorWithTimeout('imageSize', 'Image size must be less than 5MB');
        continue;
      }

      if (!file.type.startsWith('image/')) {
        setErrorWithTimeout('imageType', 'Please select valid image files');
        continue;
      }

      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`/api/upload-image?email=${encodeURIComponent(userEmail || '')}`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Image upload successful:', data);
          newImages.push(data.url);
        } else {
          const errorData = await response.json();
          setErrorWithTimeout('upload', errorData.error || 'Failed to upload image');
        }
      } catch {
        setErrorWithTimeout('upload', 'Failed to upload image');
      }
    }

    if (newImages.length > 0) {
      setProductImages(prev => [...prev, ...newImages]);
      setHasHadImages(true);
      // Clear validation error for product images
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.productImages;
        return newErrors;
      });
    }
    
    // Reset the file input
    e.target.value = '';
  };

  const handleRemoveProductImage = (index: number) => {
    setProductImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      // Clear validation error if we still have images
      if (newImages.length > 0) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.productImages;
          return newErrors;
        });
      }
      return newImages;
    });
  };

  const handleSetVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'video/mp4') {
      setErrorWithTimeout('videoType', 'Only MP4 files are allowed');
        return;
      }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      setErrorWithTimeout('videoSize', 'Video size must be less than 100MB');
        return;
      }

    // Validate video dimensions and duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async () => {
      // Check dimensions (minimum 480x480)
      if (video.videoWidth < 480 || video.videoHeight < 480) {
        setErrorWithTimeout('videoDimensions', 'Video must be at least 480x480 pixels');
        return;
      }

      // Check duration (maximum 60 seconds)
      if (video.duration > 60) {
        setErrorWithTimeout('videoDuration', 'Video must be 60 seconds or less');
        return;
      }

      // Upload video
      const formData = new FormData();
      formData.append('video', file);

      try {
        const response = await fetch(`/api/upload-video?email=${encodeURIComponent(userEmail || '')}`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Video upload successful:', data);
          setProductVideos([data.url]);
          setVideoFileName(file.name);
        } else {
          const errorData = await response.json();
          setErrorWithTimeout('videoUpload', errorData.error || 'Failed to upload video');
        }
      } catch {
        setErrorWithTimeout('videoUpload', 'Failed to upload video');
      }
      
      // Reset the file input
      e.target.value = '';
    };

    video.src = URL.createObjectURL(file);
  };

  const handleRemoveVideo = () => {
    setProductVideos([]);
    setVideoFileName(null);
  };

  const handleSetPromoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorWithTimeout('promoSize', 'Image size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorWithTimeout('promoType', 'Please select a valid image file');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`/api/upload-image?email=${encodeURIComponent(userEmail || '')}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Promo image upload successful:', data);
        setPromoImage(data.url);
      } else {
        const errorData = await response.json();
        setErrorWithTimeout('promoUpload', errorData.error || 'Failed to upload image');
      }
    } catch {
      setErrorWithTimeout('promoUpload', 'Failed to upload image');
    }
    
    // Reset the file input
    e.target.value = '';
  };

  const handleRemovePromoImage = () => {
    setPromoImage(null);
  };

  const handleShowExample = () => {
    setShowExample(true);
    if (hideExampleTimer.current) {
      clearTimeout(hideExampleTimer.current);
    }
    hideExampleTimer.current = window.setTimeout(() => {
      setShowExample(false);
    }, 3000);
  };

  const handleHideExample = () => {
    setShowExample(false);
    if (hideExampleTimer.current) {
      clearTimeout(hideExampleTimer.current);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="overflow-y-auto max-h-[calc(90vh-140px)]">
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
            {submitError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {submitError}
            </div>
          )}

            {/* Basic Information */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-4 text-[18px] font-semibold text-header">Basic Information</h4>
          <div className="space-y-4">
            {/* Product Name */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    <span className="text-red-500">*</span> Product Name
              </label>
                  <div className="relative">
              <input
                type="text"
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value.slice(0, 255));
                        if (validationErrors.productName) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.productName;
                            return newErrors;
                          });
                        }
                      }}
                      maxLength={255}
                      placeholder="Ex. Nikon Coolpix A300 Digital Camera"
                      className={`w-full rounded-md border px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        validationErrors.productName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{productName.length}/255</span>
                  </div>
                  {validationErrors.productName && (
                    <p className="text-xs text-red-500">{validationErrors.productName}</p>
                  )}
            </div>

                {/* Category */}
                <AutocompleteSelect
                  options={loadingCategories ? [] : categories.map(c => `${c.icon ? c.icon + ' ' : ''}${c.name}`)}
                  value={category}
                  onChange={(value) => {
                    // Extract category name (remove emoji prefix if present)
                    const categoryName = value.replace(/^[^\s]*\s/, '');
                    setCategory(categoryName);
                    setSubcategory(''); // Reset subcategory when category changes
                    setProduct_type(''); // Reset product type when category changes
                    setAttributes({}); // Reset attributes when category changes
                    if (validationErrors.category) {
                      setValidationErrors(prev => ({ ...prev, category: '' }));
                    }
                  }}
                  placeholder="Select category"
                  label="Category"
                  required={true}
                  error={validationErrors.category}
                />

                {/* Subcategory */}
                <AutocompleteSelect
                  options={subcategories.map(s => s.name)}
                  value={subcategory}
                  onChange={(value) => {
                    setSubcategory(value);
                    setProduct_type(''); // Reset product type when subcategory changes
                    if (validationErrors.subcategory) {
                      setValidationErrors(prev => ({ ...prev, subcategory: '' }));
                    }
                  }}
                  placeholder="Select subcategory"
                  label="Subcategory"
                  required={true}
                  disabled={!category}
                  error={validationErrors.subcategory}
                />

                {/* Product Type */}
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    <span className="text-red-500">*</span> Product Type
                  </label>
                  <div className="relative">
                    <select
                      value={product_type}
                      onChange={(e) => {
                        setProduct_type(e.target.value);
                        if (validationErrors.product_type) {
                          setValidationErrors(prev => ({ ...prev, product_type: '' }));
                        }
                      }}
                      disabled={!subcategory}
                      className={`w-full rounded-md border px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none cursor-pointer ${
                        validationErrors.product_type ? 'border-red-500' : 'border-gray-300'
                      } bg-white`}
                    >
                      <option value="">Select option</option>
                      {productTypes.map((pt) => (
                        <option key={pt.id} value={pt.name}>{pt.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
                    </svg>
                  </div>
                  {validationErrors.product_type && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.product_type}</p>
                  )}
                </div>

                {/* Product Images */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    <span className="text-red-500">*</span> Product Images
                    <button
                      type="button"
                      onClick={handleShowExample}
                      onMouseLeave={handleHideExample}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      i
                    </button>
                    {showExample && (
                      <div className="absolute z-10 mt-1 w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                        Upload up to 8 high-quality product images. First image will be the main product image.
                      </div>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {productImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={image}
                          alt={`Product ${index + 1}`}
                          width={100}
                          height={100}
                          className="h-20 w-20 rounded-lg object-cover border-2 border-blue-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(index)}
                            className="text-white hover:text-red-300 transition-colors"
                          >
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {productImages.length < 8 && (
                      <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAddProductImage}
                          className="hidden"
                        />
                        <span className="text-2xl text-gray-400">+</span>
                      </label>
                    )}
                  </div>
                  {validationErrors.productImages && (
                    <p className="text-xs text-red-500">{validationErrors.productImages}</p>
                  )}
                </div>

                {/* Buyer Promotion Image */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    Buyer Promotion Image
                    <button
                      type="button"
                      onClick={handleShowExample}
                      onMouseLeave={handleHideExample}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      i
                    </button>
                    {showExample && (
                      <div className="absolute z-10 mt-1 w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                        White Background Image
                        <br />
                        <a href="#" className="text-blue-300 underline">See Example</a>
                      </div>
                    )}
                  </label>
                  {promoImage ? (
                    <div className="relative group inline-block">
                      <Image
                        src={promoImage}
                        alt="Promotion"
                        width={100}
                        height={100}
                        className="h-20 w-20 rounded-lg object-cover border-2 border-blue-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.svg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleRemovePromoImage}
                          className="text-white hover:text-red-300 transition-colors"
                        >
                          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSetPromoImage}
                        className="hidden"
                      />
                      <span className="text-2xl text-gray-400">+</span>
                    </label>
                  )}
                </div>

                {/* Video */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    Video
                    <button
                      type="button"
                      onClick={handleShowExample}
                      onMouseLeave={handleHideExample}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      i
                    </button>
                    {showExample && (
                      <div className="absolute z-10 mt-1 w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                        Minimum size: 480x480 px, max video length: 60 seconds, max file size: 100MB.
                        <br />
                        Supported format: mp4
                        <br />
                        New Video might take up to 36 hours to be approved by Lazada
                      </div>
                    )}
                  </label>
                  {productVideos.length > 0 ? (
                    <div className="relative group inline-block">
                      <div className="h-20 w-20 rounded-lg border-2 border-blue-300 bg-gray-100 flex items-center justify-center">
                        <svg className="h-8 w-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="text-white hover:text-red-300 transition-colors"
                        >
                          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400">
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={handleSetVideo}
                        className="hidden"
                      />
                      <span className="text-2xl text-gray-400">+</span>
                    </label>
                  )}
                </div>
              </div>
            </section>

            {/* Product Description */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-4 text-[18px] font-semibold text-header">Product Description</h4>
              <div className="space-y-4">
                {/* Main Description */}
                <div className="space-y-1">
                  <label className="mb-1 block text-xs text-subheader">Main Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Product Highlights */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    Product Highlights
                    <button
                      type="button"
                      onClick={handleShowExample}
                      onMouseLeave={handleHideExample}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      i
                    </button>
                    {showExample && (
                      <div className="absolute z-10 mt-1 w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                        Enter short major highlights of the product, to make the purchase decision for the customer easier.
                      </div>
                    )}
                  </label>
                  <textarea
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    placeholder="Enter product highlights..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* What's in the box */}
                <div className="space-y-1">
                  <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                    What&apos;s in the box
                    <button
                      type="button"
                      onClick={handleShowExample}
                      onMouseLeave={handleHideExample}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-gray-200"
                    >
                      i
                    </button>
                    {showExample && (
                      <div className="absolute z-10 mt-1 w-64 rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                        Indicates the items that customer will get when they receive this product. For example, for a smartphone, a customer may get: 1 x Phone, 1 x Cable, 1 x Headset
                      </div>
                    )}
                  </label>
                  <textarea
                    value={in_box}
                    onChange={(e) => setIn_box(e.target.value)}
                    placeholder="Enter what's included in the box..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </section>

            {/* Product Specification */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-4 text-[18px] font-semibold text-header">Product Specification</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="mb-1 block text-xs text-subheader"><span className="text-red-500">*</span> Brand</label>
              <input
                type="text"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      if (validationErrors.brand) {
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.brand;
                          return newErrors;
                        });
                      }
                    }}
                placeholder="Enter brand name"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      validationErrors.brand ? 'border-red-500' : 'border-gray-300'
                    }`}
              />
                  {validationErrors.brand && (
                    <p className="text-xs text-red-500">{validationErrors.brand}</p>
                  )}
            </div>

                {/* Dynamic Attributes based on Category */}
                {category === 'Cosmetics' && (
                  <>
                    <div className="space-y-1">
                      <label className="mb-1 block text-xs text-subheader">Skin Type</label>
                      <select
                        value={String(attributes.skin_type || '')}
                        onChange={(e) => updateAttribute('skin_type', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select skin type</option>
                        <option value="all">All</option>
                        <option value="dry">Dry</option>
                        <option value="oily">Oily</option>
                        <option value="combination">Combination</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="mb-1 block text-xs text-subheader">Cruelty Free</label>
                      <select
                        value={attributes.cruelty_free === true ? 'true' : attributes.cruelty_free === false ? 'false' : ''}
                        onChange={(e) => updateAttribute('cruelty_free', e.target.value === 'true')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </>
                )}

                {category === 'Food' && (
                  <>
                    <div className="space-y-1">
                      <label className="mb-1 block text-xs text-subheader">Organic</label>
                      <select
                        value={attributes.organic === true ? 'true' : attributes.organic === false ? 'false' : ''}
                        onChange={(e) => updateAttribute('organic', e.target.value === 'true')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="mb-1 block text-xs text-subheader">Gluten Free</label>
                      <select
                        value={attributes.gluten_free === true ? 'true' : attributes.gluten_free === false ? 'false' : ''}
                        onChange={(e) => updateAttribute('gluten_free', e.target.value === 'true')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </>
                )}

                {category === 'Electronics' && (
                  <div className="space-y-1">
                    <label className="mb-1 block text-xs text-subheader">Color</label>
              <input
                type="text"
                      value={String(attributes.color || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                        updateAttribute('color', capitalizedValue);
                      }}
                      placeholder="Enter color"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
                )}
              </div>
            </section>

            

            {/* Price & Stock */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-4 text-[18px] font-semibold text-header">Price & Stock</h4>
              <div className="space-y-4">

                {/* Price & Stock Table */}
                <div>
                  <h5 className="mb-2 text-sm font-semibold text-header">
                    <span className="text-red-500">*</span> Price & Stock
                  </h5>

                  <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                    <div className="min-w-[600px] grid">
                      {/* Header Row */}
                      <div className="grid grid-cols-[1fr_1fr_1.1fr_1.8fr_0.6fr] bg-gray-50 text-xs font-medium text-subheader">
                        <div className="border-r border-gray-200 p-3 text-center">
                          <span className="text-red-500">*</span> Price
                        </div>
                        <div className="border-r border-gray-200 p-3 text-center">Special Price</div>
                        <div className="border-r border-gray-200 p-3 text-center">Stock</div>
                        <div className="border-r border-gray-200 p-3 text-center">SellerSKU</div>
                        <div className="p-3 text-center">Availability</div>
                      </div>

                      {/* Data Row */}
                      <div className="grid grid-cols-[1fr_1fr_1.1fr_1.8fr_0.6fr] border-t border-gray-200">
                        {/* Price */}
                        <div className="border-r border-gray-200 p-3 flex justify-center relative">
                          <div className={`flex items-center rounded-md border px-2 py-1 w-full max-w-[120px] ${
                            validationErrors.price ? 'border-red-500' : 'border-gray-300 bg-white'
                          }`}>
                            <span className="text-sm text-subheader">₱</span>
              <input
                type="text"
                              value={price}
                              onChange={(e) => {
                                setPrice(e.target.value);
                                if (validationErrors.price && e.target.value.trim() && !isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 0) {
                                  setValidationErrors(prev => ({ ...prev, price: '' }));
                                }
                              }}
                              className="flex-1 border-none bg-transparent text-center text-sm text-header focus:outline-none min-w-0"
                              style={{ width: 'calc(100% - 20px)' }}
                              placeholder="0.00"
                            />
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => {
                                  const currentPrice = parseFloat(price) || 0;
                                  setPrice((currentPrice + 0.01).toFixed(2));
                                }}
                                className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                              >
                                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 15l-6-6-6 6"/>
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentPrice = parseFloat(price) || 0;
                                  setPrice(Math.max(0, currentPrice - 0.01).toFixed(2));
                                }}
                                className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                              >
                                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 9l6 6 6-6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          {validationErrors.price && (
                            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-red-500 whitespace-nowrap">
                              {validationErrors.price}
                            </div>
                          )}
            </div>

                        {/* Special Price */}
                        <div className="border-r border-gray-200 p-3 flex justify-center items-center">
                          {showSpecialPrice ? (
                            <div className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 w-full max-w-[120px]">
                              <span className="text-sm text-subheader">₱</span>
                <input
                                type="text"
                                value={specialPrice}
                                onChange={(e) => setSpecialPrice(e.target.value)}
                                className="flex-1 border-none bg-transparent text-center text-sm text-header focus:outline-none min-w-0"
                                style={{ width: 'calc(100% - 20px)' }}
                  placeholder="0.00"
                              />
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentPrice = parseFloat(specialPrice) || 0;
                                    setSpecialPrice((currentPrice + 0.01).toFixed(2));
                                  }}
                                  className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 15l-6-6-6 6"/>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentPrice = parseFloat(specialPrice) || 0;
                                    setSpecialPrice(Math.max(0, currentPrice - 0.01).toFixed(2));
                                  }}
                                  className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 9l6 6 6-6"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setShowSpecialPrice(true)}
                              className="text-sm text-blue-600 hover:underline cursor-pointer"
                            >
                              Add
                            </button>
                          )}
              </div>

              {/* Stock */}
                        <div className="border-r border-gray-200 p-3 flex justify-center">
                          <div className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 w-full max-w-[120px]">
                            <input
                              type="text"
                              value={stock}
                              onChange={(e) => setStock(e.target.value)}
                              className="flex-1 border-none bg-transparent text-center text-sm text-header focus:outline-none min-w-0"
                              style={{ width: 'calc(100% - 20px)' }}
                              placeholder="0"
                            />
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => {
                                  const currentStock = parseInt(stock) || 0;
                                  setStock((currentStock + 1).toString());
                                }}
                                className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                              >
                                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 15l-6-6-6 6"/>
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentStock = parseInt(stock) || 0;
                                  setStock(Math.max(0, currentStock - 1).toString());
                                }}
                                className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                              >
                                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M6 9l6 6 6-6"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Seller SKU */}
                        <div className="border-r border-gray-200 p-3">
                          <div className="relative w-full max-w-[200px] mx-auto">
                            <input
                              type="text"
                              value={sellerSKU}
                              onChange={(e) => setSellerSKU(e.target.value.slice(0, 200))}
                              maxLength={200}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 pr-12 text-left text-[12px] text-header focus:outline-none"
                              placeholder="Seller SKU"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {sellerSKU.length}/200
                            </span>
                          </div>
                        </div>

                        {/* Availability */}
                        <div className="flex items-center justify-center p-3">
                          <button
                            type="button"
                            onClick={() => setIsAvailable(!isAvailable)}
                            className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer ${
                              isAvailable ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          >
                            <div 
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                isAvailable ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            ></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Shipping & Warranty */}
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h4 className="mb-2 text-[18px] font-semibold text-header">Shipping & Warranty</h4>
              <div className="space-y-4">
                
                {/* Package Weight */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 md:max-w-md space-y-1">
                  <label className="col-span-2 mb-1 block text-[12px] text-subheader"><span className="text-red-500">*</span> Package Weight</label>
                  <input
                    type="number"
                    value={packageWeight}
                    onChange={(e) => {
                      setPackageWeight(e.target.value);
                      // Clear error when user starts typing
                      if (validationErrors.packageWeight && e.target.value.trim() && !isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 0) {
                        setValidationErrors(prev => ({ ...prev, packageWeight: '' }));
                      }
                    }}
                    placeholder={packageWeightUnit === 'kg' ? "0.001~300" : "1~300000"}
                    min={packageWeightUnit === 'kg' ? "0.001" : "1"}
                    max={packageWeightUnit === 'kg' ? "300" : "300000"}
                    step={packageWeightUnit === 'kg' ? "0.001" : "1"}
                    className={`rounded-md border px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      validationErrors.packageWeight ? 'border-red-500' : 'border-gray-300 bg-white'
                    }`}
                  />
                  <div className="relative">
                    <select
                      value={packageWeightUnit}
                      onChange={(e) => {
                        setPackageWeightUnit(e.target.value);
                        setPackageWeight(''); // Reset weight when unit changes
                      }}
                      className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 pr-8 text-[12px] text-header focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                    <svg className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
                    </svg>
                  </div>
                  {validationErrors.packageWeight && (
                    <p className="text-xs text-red-500">{validationErrors.packageWeight}</p>
                  )}
                </div>

                {/* Dimensions */}
                <div className="md:max-w-3xl space-y-1">
                  <label className="mb-1 block text-[12px] text-subheader"><span className="text-red-500">*</span> Package Length(cm) × Width(cm) × Height(cm)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={packageLength}
                      onChange={(e) => {
                        setPackageLength(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.packageLength && e.target.value.trim() && !isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => ({ ...prev, packageLength: '' }));
                        }
                      }}
                      placeholder="0.01~300"
                      min="0.01"
                      step="0.01"
                      className={`flex-1 rounded-md border px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        validationErrors.packageLength ? 'border-red-500' : 'border-gray-300 bg-white'
                      }`}
                    />
                    <span className="text-[12px] text-subheader">×</span>
                    <input
                      type="number"
                      value={packageWidth}
                      onChange={(e) => {
                        setPackageWidth(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.packageWidth && e.target.value.trim() && !isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => ({ ...prev, packageWidth: '' }));
                        }
                      }}
                      placeholder="0.01~300"
                      min="0.01"
                      step="0.01"
                      className={`flex-1 rounded-md border px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        validationErrors.packageWidth ? 'border-red-500' : 'border-gray-300 bg-white'
                      }`}
                    />
                    <span className="text-[12px] text-subheader">×</span>
                    <input
                      type="number"
                      value={packageHeight}
                      onChange={(e) => {
                        setPackageHeight(e.target.value);
                        // Clear error when user starts typing
                        if (validationErrors.packageHeight && e.target.value.trim() && !isNaN(parseFloat(e.target.value)) && parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => ({ ...prev, packageHeight: '' }));
                        }
                      }}
                      placeholder="0.01~300"
                      min="0.01"
                      step="0.01"
                      className={`flex-1 rounded-md border px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        validationErrors.packageHeight ? 'border-red-500' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </div>
                  {validationErrors.packageLength && (
                    <p className="text-xs text-red-500">{validationErrors.packageLength}</p>
                  )}
                  {validationErrors.packageWidth && (
                    <p className="text-xs text-red-500">{validationErrors.packageWidth}</p>
                  )}
                  {validationErrors.packageHeight && (
                    <p className="text-xs text-red-500">{validationErrors.packageHeight}</p>
                  )}
                </div>

                {/* Dangerous Goods */}
                <div className="space-y-2">
                  <div className="h-px w-full bg-gray-200" />
                  <div className="text-[12px] text-subheader">Dangerous Goods</div>
                  <div className="flex items-center gap-6 text-[12px] text-subheader">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dangerous"
                        checked={!hasDangerous}
                        onChange={() => setHasDangerous(false)}
                        className="h-3.5 w-3.5 text-primary-500 focus:ring-primary-500 cursor-pointer"
                      />
                      <span>None</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dangerous"
                        checked={hasDangerous}
                        onChange={() => setHasDangerous(true)}
                        className="h-3.5 w-3.5 text-primary-500 focus:ring-primary-500 cursor-pointer"
                      />
                      <span>Contains battery / flammables / liquid</span>
                    </label>
                  </div>
                  <div className="h-px w-full bg-gray-200" />
                </div>

                {/* Warranty */}
                <div className="grid grid-cols-1 gap-3 md:max-w-xl">
                  <label className="mb-1 block text-[12px] text-subheader">Warranty Type</label>
                  <div className="relative group">
                    <select
                      value={warrantyType}
                      onChange={(e) => setWarrantyType(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                    >
                      <option value="">Select option</option>
                      <option value="Local Manufacturer Warranty">Local Manufacturer Warranty</option>
                      <option value="International Manufacturer Warranty">International Manufacturer Warranty</option>
                      <option value="Local Supplier Warranty">Local Supplier Warranty</option>
                      <option value="Local Supplier Refund Warranty">Local Supplier Refund Warranty</option>
                      <option value="No Warranty">No Warranty</option>
                      <option value="International Seller Warranty">International Seller Warranty</option>
                    </select>
                    {warrantyType ? (
                      <button
                        type="button"
                        onClick={() => setWarrantyType('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
                      </svg>
                    )}
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-[12px] text-subheader">Warranty</label>
                    <div className="relative group">
                      <select
                        value={warrantyPeriod}
                        onChange={(e) => setWarrantyPeriod(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
                      >
                        <option value="">Please input or select option</option>
                        <option value="1 week">1 week</option>
                        <option value="2 weeks">2 weeks</option>
                        <option value="1 month">1 month</option>
                        <option value="2 months">2 months</option>
                        <option value="3 months">3 months</option>
                        <option value="4 months">4 months</option>
                        <option value="5 months">5 months</option>
                        <option value="6 months">6 months</option>
                        <option value="7 months">7 months</option>
                        <option value="8 months">8 months</option>
                        <option value="9 months">9 months</option>
                        <option value="10 months">10 months</option>
                        <option value="11 months">11 months</option>
                        <option value="1 year">1 year</option>
                        <option value="15 months">15 months</option>
                        <option value="18 months">18 months</option>
                        <option value="2 years">2 years</option>
                        <option value="3 years">3 years</option>
                        <option value="4 years">4 years</option>
                        <option value="5 years">5 years</option>
                        <option value="6 years">6 years</option>
                        <option value="7 years">7 years</option>
                        <option value="10 years">10 years</option>
                        <option value="25 years">25 years</option>
                        <option value="30 years">30 years</option>
                        <option value="Life Time Warranty">Life Time Warranty</option>
                      </select>
                      {warrantyPeriod ? (
                        <button
                          type="button"
                          onClick={() => setWarrantyPeriod('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-1 block text-[12px] text-subheader">Warranty Policy</label>
                    <textarea
                      value={warrantyPolicy}
                      onChange={(e) => setWarrantyPolicy(e.target.value)}
                      placeholder="Enter warranty policy details..."
                      rows={3}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </section>


           

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
                disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
                disabled={loading}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
                {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}