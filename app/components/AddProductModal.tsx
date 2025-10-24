'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface AddProductModalProps {
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
		promotion_image?: string;
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

export default function AddProductModal({ onClose, onSave, userEmail }: AddProductModalProps) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [showExample, setShowExample] = useState(false);
  const hideExampleTimer = useRef<number | null>(null);
  const [productName, setProductName] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVideos, setProductVideos] = useState<string[]>([]);
  const [promoImage, setPromoImage] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [hasHadImages, setHasHadImages] = useState(false);
  const [showSpecialPrice, setShowSpecialPrice] = useState(false);
  const [specialPrice, setSpecialPrice] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sellerSKU, setSellerSKU] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const errorTimeouts = useRef<{ [key: string]: number }>({});
  
  // Additional form fields for backend integration
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [in_box, setIn_box] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [product_type, setProduct_type] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [packageWeightUnit, setPackageWeightUnit] = useState('kg');
  const [packageLength, setPackageLength] = useState('');
  const [packageWidth, setPackageWidth] = useState('');
  const [packageHeight, setPackageHeight] = useState('');
  const [hasDangerous, setHasDangerous] = useState(false);
  const [warrantyType, setWarrantyType] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState('');
  const [warrantyPolicy, setWarrantyPolicy] = useState('');
  const [attributes, setAttributes] = useState<{[key: string]: unknown}>({});
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

  const validateVideoFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        // Validate dimensions (minimum 480x480)
        if (video.videoWidth < 480 || video.videoHeight < 480) {
          const error = 'Video dimensions must be at least 480x480 pixels.';
          setErrorWithTimeout('video', error);
          reject(new Error(error));
          return;
        }
        
        // Validate duration (maximum 60 seconds)
        if (video.duration > 60) {
          const error = 'Video duration must be 60 seconds or less.';
          setErrorWithTimeout('video', error);
          reject(new Error(error));
          return;
        }
        
        resolve();
      };
      
      video.onerror = () => {
        const error = 'Unable to read video file. Please try a different file.';
        setErrorWithTimeout('video', error);
        reject(new Error(error));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Helper functions for number inputs
  const handleNumberChange = (value: string, setter: (value: string) => void) => {
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    setter(numericValue);
  };

  const incrementPrice = (currentValue: string, setter: (value: string) => void) => {
    const num = parseFloat(currentValue) || 0;
    const newValue = (num + 0.01).toFixed(2);
    setter(newValue);
  };

  const decrementPrice = (currentValue: string, setter: (value: string) => void) => {
    const num = parseFloat(currentValue) || 0;
    const newValue = Math.max(0, num - 0.01).toFixed(2);
    setter(newValue);
  };

  const incrementStock = (currentValue: string, setter: (value: string) => void) => {
    const num = parseInt(currentValue) || 0;
    const newValue = (num + 1).toString();
    setter(newValue);
  };

  const decrementStock = (currentValue: string, setter: (value: string) => void) => {
    const num = parseInt(currentValue) || 0;
    const newValue = Math.max(0, num - 1).toString();
    setter(newValue);
  };

  const handlePickFiles = async (accept: string, multiple: boolean): Promise<FileList | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      if (multiple) input.multiple = true;
      input.onchange = () => resolve(input.files);
      input.click();
    });
  };

  const validateImage = (file: File, type: 'product' | 'promo'): string | null => {
    // File size check
    const maxSize = type === 'product' ? 6 * 1024 * 1024 : 6 * 1024 * 1024; // 6MB
    if (file.size > maxSize) {
      return `File size must be less than ${type === 'product' ? '6MB' : '6MB'}`;
    }

    // File type check
    const allowedTypes = type === 'product' ? ['image/jpeg', 'image/jpg', 'image/png'] : ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return `Only ${type === 'product' ? 'JPG, JPEG, PNG' : 'JPG, JPEG, PNG'} files are allowed`;
    }

    return null;
  };

  const validateImageDimensions = (file: File, type: 'product' | 'promo'): Promise<string | null> => {
    return new Promise((resolve) => {
      console.log('Starting dimension validation for:', file.name);
      const img = new window.Image();
      img.onload = () => {
        const { width, height } = img;
        console.log('Image dimensions:', width, 'x', height);
        
        if (type === 'product') {
          if (width < 330 || height < 330 || width > 6500 || height > 6500) {
            console.log('Product image dimension validation failed');
            resolve('Image size must be between 330x330 and 6500x6500 pixels');
            return;
          }
        } else if (type === 'promo') {
          if (width < 330 || height < 330) {
            console.log('Promo image dimension validation failed - too small');
            resolve('Minimum resolution is 330 x 330 pixels');
            return;
          }
          if (width !== height) {
            console.log('Promo image dimension validation failed - not square');
            resolve('The aspect ratio (W x H) must be 1:1');
            return;
          }
        }
        console.log('Dimension validation passed');
        resolve(null);
      };
      img.onerror = () => {
        console.log('Image load error during dimension validation');
        resolve('Invalid image file');
      };
      img.src = URL.createObjectURL(file);
    });
  };


  const handleAddProductImage = async () => {
    console.log('handleAddProductImage called');
    if (productImages.length >= 8) return;
    const files = await handlePickFiles('image/*', false);
    console.log('Files picked:', files);
    if (!files || files.length === 0) return;
    const file = files[0];
    console.log('Selected file:', file.name, file.size, file.type);
    
    // Clear previous errors
    setErrors(prev => ({ ...prev, productImages: '' }));
    setValidationErrors(prev => ({ ...prev, productImages: '' }));
    
    // Validate file
    console.log('Validating file...');
    const fileError = validateImage(file, 'product');
    if (fileError) {
      console.log('File validation failed:', fileError);
      setErrorWithTimeout('productImages', fileError);
      return;
    }
    
    // Validate dimensions
    console.log('Validating dimensions...');
    const dimensionError = await validateImageDimensions(file, 'product');
    if (dimensionError) {
      console.log('Dimension validation failed:', dimensionError);
      setErrorWithTimeout('productImages', dimensionError);
      return;
    }
    
    console.log('All validations passed, starting upload...');
    
    // Upload file directly to server
    try {
      console.log('Starting upload for file:', file.name, file.size);
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('Calling /api/upload-image...');
      const response = await fetch(`/api/upload-image?email=${encodeURIComponent(userEmail || '')}`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Image uploaded successfully:', result);
      
      if (!result.url) {
        throw new Error('No URL returned from upload');
      }
      
      setProductImages((prev) => [...prev, result.url].slice(0, 8));
      setHasHadImages(true);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorWithTimeout('productImages', error instanceof Error ? error.message : 'Upload failed');
    }
  };


  const handleSetPromoImage = async () => {
    const files = await handlePickFiles('image/*', false);
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Clear previous errors
    setErrors(prev => ({ ...prev, promoImage: '' }));
    
    // Validate file
    const fileError = validateImage(file, 'promo');
    if (fileError) {
      setErrorWithTimeout('promoImage', fileError);
      return;
    }
    
    // Validate dimensions
    const dimensionError = await validateImageDimensions(file, 'promo');
    if (dimensionError) {
      setErrorWithTimeout('promoImage', dimensionError);
      return;
    }
    
    // Upload file directly to server
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/upload-image?email=${encodeURIComponent(userEmail || '')}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      console.log('Promo image uploaded successfully:', result.url);
      
      setPromoImage(result.url);
    } catch (error) {
      console.error('Promo image upload error:', error);
      setErrorWithTimeout('promoImage', error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleSetVideo = async () => {
    const files = await handlePickFiles('video/*', false);
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Clear previous errors
    setErrors(prev => ({ ...prev, video: '' }));
    
    // Validate file type - only MP4 allowed
    if (file.type !== 'video/mp4') {
      const error = 'Invalid file type. Only MP4 files are allowed.';
      setErrorWithTimeout('video', error);
      return;
    }
    
    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const error = 'File too large. Maximum size is 100MB.';
      setErrorWithTimeout('video', error);
      return;
    }
    
    // Validate video dimensions and duration
    try {
      await validateVideoFile(file);
    } catch {
      return; // Validation failed, error already shown
    }
    
    // Upload file directly to server
    try {
      console.log('Starting video upload for file:', file.name, file.size);
      const formData = new FormData();
      formData.append('video', file);
      
      console.log('Calling /api/upload-video...');
      const response = await fetch(`/api/upload-video?email=${encodeURIComponent(userEmail || '')}`, {
        method: 'POST',
        body: formData,
      });
      
      console.log('Video upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Video upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Video uploaded successfully:', result);
      
      if (!result.url) {
        throw new Error('No URL returned from video upload');
      }
      
      // Store the video URL in the videos array (single video)
      setProductVideos([result.url]);
      setVideoFileName(file.name);
    } catch (error) {
      console.error('Video upload error:', error);
      setErrorWithTimeout('video', error instanceof Error ? error.message : 'Video upload failed');
    }
  };

  const keepExample = () => {
    if (hideExampleTimer.current) {
      window.clearTimeout(hideExampleTimer.current);
      hideExampleTimer.current = null;
    }
    setShowExample(true);
  };

  const scheduleHideExample = () => {
    if (hideExampleTimer.current) {
      window.clearTimeout(hideExampleTimer.current);
    }
    hideExampleTimer.current = window.setTimeout(() => {
      setShowExample(false);
      hideExampleTimer.current = null;
    }, 200); // small grace period to allow moving from link to popup
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Product name validation
    if (!productName.trim()) {
      errors.productName = 'Product name is required';
    }
    
    // Product images validation
    if (productImages.length === 0) {
      errors.productImages = 'At least 1 product image is required';
    }
    
    // Brand validation
    if (!brand.trim()) {
      errors.brand = 'Brand is required';
    }
    
    // Category validation
    if (!category.trim()) {
      errors.category = 'Category is required';
    }
    
    // Subcategory validation
    if (!subcategory.trim()) {
      errors.subcategory = 'Subcategory is required';
    }
    
    // Product type validation
    if (!product_type.trim()) {
      errors.product_type = 'Product type is required';
    }
    
    // Price validation
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      errors.price = 'Valid price is required';
    }
    
    // Package weight validation
    if (!packageWeight.trim() || isNaN(parseFloat(packageWeight)) || parseFloat(packageWeight) <= 0) {
      errors.packageWeight = 'Package weight is required';
    }
    
    // Package dimensions validation
    if (!packageLength.trim() || isNaN(parseFloat(packageLength)) || parseFloat(packageLength) <= 0) {
      errors.packageLength = 'Package length is required';
    }
    
    if (!packageWidth.trim() || isNaN(parseFloat(packageWidth)) || parseFloat(packageWidth) <= 0) {
      errors.packageWidth = 'Package width is required';
    }
    
    if (!packageHeight.trim() || isNaN(parseFloat(packageHeight)) || parseFloat(packageHeight) <= 0) {
      errors.packageHeight = 'Package height is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }
    
    setSubmitError(null);
    setLoading(true);
    
    try {
      console.log('Submitting product with images:', productImages);
      console.log('First image type:', productImages[0]?.substring(0, 50));
      console.log('All images:', productImages.map(img => img.substring(0, 50)));
      
      // Validate that images are URLs, not base64
      const hasBase64Images = productImages.some(img => img.startsWith('data:'));
      if (hasBase64Images) {
        console.error('Base64 images detected, clearing them');
        console.error('Base64 images found:', productImages.filter(img => img.startsWith('data:')));
        setProductImages([]);
        setSubmitError('Please re-upload your images');
        setLoading(false);
        return;
      }
      
      await onSave({
        name: productName.trim(),
        sku: sellerSKU.trim() || undefined,
        description: description.trim() || undefined,
        highlights: highlights.trim() || undefined,
        in_box: in_box.trim() || undefined,
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        subcategory: subcategory.trim() || undefined,
        product_type: product_type.trim() || undefined,
        price: parseFloat(price),
        special_price: specialPrice && specialPrice.trim() && !isNaN(parseFloat(specialPrice)) ? parseFloat(specialPrice) : undefined,
        stock: parseInt(stock),
        images: productImages.length > 0 ? productImages : undefined,
        videos: productVideos.length > 0 ? productVideos : undefined,
        promotion_image: promoImage || undefined,
        status: isAvailable ? 'active' : 'inactive',
        weight_value: packageWeight && !isNaN(parseFloat(packageWeight)) ? parseFloat(packageWeight) : undefined,
        weight_unit: packageWeight && !isNaN(parseFloat(packageWeight)) ? packageWeightUnit : undefined,
        length_cm: packageLength && !isNaN(parseFloat(packageLength)) ? parseFloat(packageLength) : undefined,
        width_cm: packageWidth && !isNaN(parseFloat(packageWidth)) ? parseFloat(packageWidth) : undefined,
        height_cm: packageHeight && !isNaN(parseFloat(packageHeight)) ? parseFloat(packageHeight) : undefined,
        has_dangerous: hasDangerous,
        warranty_type: warrantyType.trim() || undefined,
        warranty_period: warrantyPeriod.trim() || undefined,
        warranty_policy: warrantyPolicy.trim() || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      });
      // onClose is called by the parent after successful save
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

	// Trap focus basic: focus the dialog on open
	useEffect(() => {
		const previousActive = document.activeElement as HTMLElement | null;
		scrollRef.current?.focus();
		return () => previousActive?.focus();
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<button
				aria-label="Close"
				onClick={onClose}
				className="absolute inset-0 bg-black/50"
			/>

			{/* Modal */}
			<div className="relative w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl">
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl">
					<h3 className="text-xl font-bold font-title text-header">Add Products</h3>
					<button onClick={onClose} className="text-subheader hover:text-header">
						<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Scrollable body mimicking the provided UI. Non-interactive placeholders. */}
				<div
					ref={scrollRef}
					tabIndex={-1}
					className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6"
				>
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
                                      // Clear error when user starts typing
                                      if (validationErrors.productName && e.target.value.trim()) {
                                        setValidationErrors(prev => ({ ...prev, productName: '' }));
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
							<div>
								<label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
									<span className="text-red-500">*</span> Category
								</label>
								<div className="relative">
									<select
										value={category}
										onChange={(e) => {
											setCategory(e.target.value);
											setSubcategory(''); // Reset subcategory when category changes
											setProduct_type(''); // Reset product type when category changes
											setAttributes({}); // Reset attributes when category changes
											if (validationErrors.category) {
												setValidationErrors(prev => ({ ...prev, category: '' }));
											}
										}}
										className={`w-full rounded-md border px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer ${
											validationErrors.category ? 'border-red-500' : 'border-gray-300'
										} bg-white`}
									>
										<option value="">Select option</option>
										<option value="Electronics">Electronics</option>
										<option value="Fashion & Clothing">Fashion & Clothing</option>
										<option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
										<option value="Home & Garden">Home & Garden</option>
										<option value="Sports & Outdoors">Sports & Outdoors</option>
										<option value="Health & Wellness">Health & Wellness</option>
										<option value="Toys & Games">Toys & Games</option>
										<option value="Books & Media">Books & Media</option>
										<option value="Automotive">Automotive</option>
										<option value="Food & Beverages">Food & Beverages</option>
										<option value="Baby & Kids">Baby & Kids</option>
										<option value="Pet Supplies">Pet Supplies</option>
										<option value="Office Supplies">Office Supplies</option>
										<option value="Jewelry & Accessories">Jewelry & Accessories</option>
										<option value="Art & Crafts">Art & Crafts</option>
										<option value="Travel & Luggage">Travel & Luggage</option>
										<option value="Industrial & Scientific">Industrial & Scientific</option>
									</select>
									<svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
										<path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
									</svg>
								</div>
								{validationErrors.category && (
									<p className="text-xs text-red-500 mt-1">{validationErrors.category}</p>
								)}
							</div>

							{/* Subcategory */}
							<div>
								<label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
									<span className="text-red-500">*</span> Subcategory
								</label>
								<div className="relative">
									<select
										value={subcategory}
										onChange={(e) => {
											setSubcategory(e.target.value);
											setProduct_type(''); // Reset product type when subcategory changes
											if (validationErrors.subcategory) {
												setValidationErrors(prev => ({ ...prev, subcategory: '' }));
											}
										}}
										disabled={!category}
										className={`w-full rounded-md border px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none cursor-pointer ${
											validationErrors.subcategory ? 'border-red-500' : 'border-gray-300'
										} bg-white`}
									>
										<option value="">Select option</option>
									{category === 'Electronics' && (
										<>
											<option value="TV & Video">TV & Video</option>
											<option value="Audio">Audio</option>
											<option value="Mobile">Mobile</option>
											<option value="Computers">Computers</option>
											<option value="Tablets">Tablets</option>
											<option value="Cameras">Cameras</option>
											<option value="Wearables">Wearables</option>
											<option value="Accessories">Accessories</option>
											<option value="Monitors">Monitors</option>
											<option value="Networking">Networking</option>
										</>
									)}
									{category === 'Cosmetics' && (
										<>
											<option value="Skincare">Skincare</option>
											<option value="Makeup">Makeup</option>
										</>
									)}
									{category === 'Food' && (
										<>
											<option value="Beverages">Beverages</option>
											<option value="Snacks">Snacks</option>
											<option value="Breakfast">Breakfast</option>
											<option value="Supplements">Supplements</option>
											<option value="Confectionery">Confectionery</option>
											<option value="Sweeteners">Sweeteners</option>
											<option value="Seasonings">Seasonings</option>
										</>
									)}
									{category === 'Fashion & Clothing' && (
										<>
											<option value="Men&apos;s Clothing">Men&apos;s Clothing</option>
											<option value="Women&apos;s Clothing">Women&apos;s Clothing</option>
											<option value="Kids&apos; Clothing">Kids&apos; Clothing</option>
											<option value="Shoes">Shoes</option>
											<option value="Accessories">Accessories</option>
											<option value="Underwear">Underwear</option>
											<option value="Swimwear">Swimwear</option>
											<option value="Activewear">Activewear</option>
										</>
									)}
									{category === 'Beauty & Cosmetics' && (
										<>
											<option value="Skincare">Skincare</option>
											<option value="Makeup">Makeup</option>
											<option value="Hair Care">Hair Care</option>
											<option value="Fragrance">Fragrance</option>
											<option value="Personal Care">Personal Care</option>
											<option value="Tools & Brushes">Tools & Brushes</option>
										</>
									)}
									{category === 'Home & Garden' && (
										<>
											<option value="Furniture">Furniture</option>
											<option value="Decor">Decor</option>
											<option value="Kitchen & Dining">Kitchen & Dining</option>
											<option value="Bedding">Bedding</option>
											<option value="Bath">Bath</option>
											<option value="Garden Tools">Garden Tools</option>
											<option value="Plants & Seeds">Plants & Seeds</option>
											<option value="Lighting">Lighting</option>
										</>
									)}
									{category === 'Sports & Outdoors' && (
										<>
											<option value="Fitness Equipment">Fitness Equipment</option>
											<option value="Outdoor Gear">Outdoor Gear</option>
											<option value="Team Sports">Team Sports</option>
											<option value="Water Sports">Water Sports</option>
											<option value="Winter Sports">Winter Sports</option>
											<option value="Cycling">Cycling</option>
											<option value="Running">Running</option>
											<option value="Yoga & Pilates">Yoga & Pilates</option>
										</>
									)}
									{category === 'Health & Wellness' && (
										<>
											<option value="Supplements">Supplements</option>
											<option value="Medical Supplies">Medical Supplies</option>
											<option value="Fitness Equipment">Fitness Equipment</option>
											<option value="Personal Care">Personal Care</option>
											<option value="Therapy & Recovery">Therapy & Recovery</option>
											<option value="Monitoring Devices">Monitoring Devices</option>
										</>
									)}
									{category === 'Toys & Games' && (
										<>
											<option value="Action Figures">Action Figures</option>
											<option value="Board Games">Board Games</option>
											<option value="Puzzles">Puzzles</option>
											<option value="Educational Toys">Educational Toys</option>
											<option value="Outdoor Toys">Outdoor Toys</option>
											<option value="Electronic Toys">Electronic Toys</option>
											<option value="Arts & Crafts">Arts & Crafts</option>
										</>
									)}
									{category === 'Books & Media' && (
										<>
											<option value="Books">Books</option>
											<option value="Magazines">Magazines</option>
											<option value="Digital Media">Digital Media</option>
											<option value="Music">Music</option>
											<option value="Movies & TV">Movies & TV</option>
											<option value="Video Games">Video Games</option>
										</>
									)}
									{category === 'Automotive' && (
										<>
											<option value="Car Parts">Car Parts</option>
											<option value="Accessories">Accessories</option>
											<option value="Tools">Tools</option>
											<option value="Maintenance">Maintenance</option>
											<option value="Interior">Interior</option>
											<option value="Exterior">Exterior</option>
										</>
									)}
									{category === 'Food & Beverages' && (
										<>
											<option value="Beverages">Beverages</option>
											<option value="Snacks">Snacks</option>
											<option value="Breakfast">Breakfast</option>
											<option value="Supplements">Supplements</option>
											<option value="Confectionery">Confectionery</option>
											<option value="Sweeteners">Sweeteners</option>
											<option value="Seasonings">Seasonings</option>
										</>
									)}
									{category === 'Baby & Kids' && (
										<>
											<option value="Baby Care">Baby Care</option>
											<option value="Feeding">Feeding</option>
											<option value="Nursery">Nursery</option>
											<option value="Safety">Safety</option>
											<option value="Toys">Toys</option>
											<option value="Clothing">Clothing</option>
										</>
									)}
									{category === 'Pet Supplies' && (
										<>
											<option value="Dog Supplies">Dog Supplies</option>
											<option value="Cat Supplies">Cat Supplies</option>
											<option value="Fish Supplies">Fish Supplies</option>
											<option value="Bird Supplies">Bird Supplies</option>
											<option value="Small Pet Supplies">Small Pet Supplies</option>
											<option value="Pet Food">Pet Food</option>
										</>
									)}
									{category === 'Office Supplies' && (
										<>
											<option value="Stationery">Stationery</option>
											<option value="Furniture">Furniture</option>
											<option value="Technology">Technology</option>
											<option value="Storage">Storage</option>
											<option value="Presentation">Presentation</option>
											<option value="Organization">Organization</option>
										</>
									)}
									{category === 'Jewelry & Accessories' && (
										<>
											<option value="Necklaces">Necklaces</option>
											<option value="Rings">Rings</option>
											<option value="Earrings">Earrings</option>
											<option value="Bracelets">Bracelets</option>
											<option value="Watches">Watches</option>
											<option value="Bags">Bags</option>
											<option value="Belts">Belts</option>
										</>
									)}
									{category === 'Art & Crafts' && (
										<>
											<option value="Drawing Supplies">Drawing Supplies</option>
											<option value="Painting">Painting</option>
											<option value="Sculpting">Sculpting</option>
											<option value="Crafting">Crafting</option>
											<option value="Paper Crafts">Paper Crafts</option>
											<option value="Fabric Crafts">Fabric Crafts</option>
										</>
									)}
									{category === 'Travel & Luggage' && (
										<>
											<option value="Luggage">Luggage</option>
											<option value="Travel Accessories">Travel Accessories</option>
											<option value="Backpacks">Backpacks</option>
											<option value="Travel Bags">Travel Bags</option>
											<option value="Travel Organizers">Travel Organizers</option>
										</>
									)}
									{category === 'Industrial & Scientific' && (
										<>
											<option value="Tools">Tools</option>
											<option value="Equipment">Equipment</option>
											<option value="Safety">Safety</option>
											<option value="Lab Supplies">Lab Supplies</option>
											<option value="Measurement">Measurement</option>
											<option value="Testing">Testing</option>
										</>
									)}
								</select>
								<svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
									<path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
								</svg>
							</div>
							{validationErrors.subcategory && (
								<p className="text-xs text-red-500 mt-1">{validationErrors.subcategory}</p>
							)}
							</div>

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
									{/* Electronics Product Types */}
									{subcategory === 'TV & Video' && (
										<>
											<option value="Smart TV">Smart TV</option>
											<option value="LED TV">LED TV</option>
											<option value="OLED TV">OLED TV</option>
											<option value="Projector">Projector</option>
										</>
									)}
									{subcategory === 'Audio' && (
										<>
											<option value="Headphones">Headphones</option>
											<option value="Speakers">Speakers</option>
											<option value="Earbuds">Earbuds</option>
											<option value="Soundbar">Soundbar</option>
											<option value="Microphone">Microphone</option>
										</>
									)}
									{subcategory === 'Mobile' && (
										<>
											<option value="Smartphone">Smartphone</option>
											<option value="Phone Case">Phone Case</option>
											<option value="Screen Protector">Screen Protector</option>
											<option value="Charger">Charger</option>
										</>
									)}
									{subcategory === 'Computers' && (
										<>
											<option value="Laptop">Laptop</option>
											<option value="Desktop">Desktop</option>
											<option value="Keyboard">Keyboard</option>
											<option value="Mouse">Mouse</option>
											<option value="Webcam">Webcam</option>
										</>
									)}
									{subcategory === 'Tablets' && (
										<>
											<option value="Tablet">Tablet</option>
											<option value="Tablet Case">Tablet Case</option>
											<option value="Stylus">Stylus</option>
										</>
									)}
									{subcategory === 'Cameras' && (
										<>
											<option value="Action Camera">Action Camera</option>
											<option value="DSLR">DSLR</option>
											<option value="Mirrorless">Mirrorless</option>
											<option value="Security Camera">Security Camera</option>
										</>
									)}
									{subcategory === 'Wearables' && (
										<>
											<option value="Smart Watch">Smart Watch</option>
											<option value="Fitness Tracker">Fitness Tracker</option>
											<option value="Smart Ring">Smart Ring</option>
										</>
									)}
									{subcategory === 'Accessories' && (
										<>
											<option value="Charger">Charger</option>
											<option value="Cable">Cable</option>
											<option value="Adapter">Adapter</option>
											<option value="Stand">Stand</option>
										</>
									)}
									{subcategory === 'Monitors' && (
										<>
											<option value="Gaming Monitor">Gaming Monitor</option>
											<option value="4K Monitor">4K Monitor</option>
											<option value="Ultrawide Monitor">Ultrawide Monitor</option>
										</>
									)}
									{subcategory === 'Networking' && (
										<>
											<option value="Router">Router</option>
											<option value="Modem">Modem</option>
											<option value="Switch">Switch</option>
											<option value="Access Point">Access Point</option>
										</>
									)}
									
									{/* Cosmetics Product Types */}
									{subcategory === 'Skincare' && (
										<>
											<option value="Serum">Serum</option>
											<option value="Cleanser">Cleanser</option>
											<option value="Moisturizer">Moisturizer</option>
											<option value="Sunscreen">Sunscreen</option>
											<option value="Toner">Toner</option>
											<option value="Face Mask">Face Mask</option>
											<option value="Exfoliator">Exfoliator</option>
											<option value="Eye Cream">Eye Cream</option>
										</>
									)}
									{subcategory === 'Makeup' && (
										<>
											<option value="Lipstick">Lipstick</option>
											<option value="Foundation">Foundation</option>
											<option value="Mascara">Mascara</option>
											<option value="Eyeshadow">Eyeshadow</option>
											<option value="Concealer">Concealer</option>
											<option value="Lip Gloss">Lip Gloss</option>
											<option value="Blush">Blush</option>
											<option value="Eyeliner">Eyeliner</option>
											<option value="Highlighter">Highlighter</option>
										</>
									)}
									
									{/* Food Product Types */}
									{subcategory === 'Beverages' && (
										<>
											<option value="Coffee">Coffee</option>
											<option value="Tea">Tea</option>
											<option value="Juice">Juice</option>
											<option value="Energy Drink">Energy Drink</option>
											<option value="Soda">Soda</option>
											<option value="Water">Water</option>
										</>
									)}
									{subcategory === 'Snacks' && (
										<>
											<option value="Protein Bar">Protein Bar</option>
											<option value="Nuts">Nuts</option>
											<option value="Crackers">Crackers</option>
											<option value="Dried Fruit">Dried Fruit</option>
											<option value="Chips">Chips</option>
											<option value="Trail Mix">Trail Mix</option>
										</>
									)}
									{subcategory === 'Breakfast' && (
										<>
											<option value="Granola">Granola</option>
											<option value="Cereal">Cereal</option>
											<option value="Oatmeal">Oatmeal</option>
											<option value="Pancake Mix">Pancake Mix</option>
										</>
									)}
									{subcategory === 'Supplements' && (
										<>
											<option value="Smoothie Mix">Smoothie Mix</option>
											<option value="Protein Powder">Protein Powder</option>
											<option value="Vitamins">Vitamins</option>
											<option value="Superfood Powder">Superfood Powder</option>
										</>
									)}
									{subcategory === 'Confectionery' && (
										<>
											<option value="Chocolate">Chocolate</option>
											<option value="Candy">Candy</option>
											<option value="Gummies">Gummies</option>
											<option value="Cookies">Cookies</option>
										</>
									)}
									{subcategory === 'Sweeteners' && (
										<>
											<option value="Honey">Honey</option>
											<option value="Sugar">Sugar</option>
											<option value="Stevia">Stevia</option>
											<option value="Maple Syrup">Maple Syrup</option>
										</>
									)}
									{subcategory === 'Seasonings' && (
										<>
											<option value="Spice Mix">Spice Mix</option>
											<option value="Salt">Salt</option>
											<option value="Pepper">Pepper</option>
											<option value="Herbs">Herbs</option>
										</>
									)}
									
									{/* Fashion & Clothing Product Types */}
									{subcategory === 'Men&apos;s Clothing' && (
										<>
											<option value="Shirts">Shirts</option>
											<option value="Pants">Pants</option>
											<option value="Jackets">Jackets</option>
											<option value="Shorts">Shorts</option>
											<option value="Suits">Suits</option>
										</>
									)}
									{subcategory === 'Women&apos;s Clothing' && (
										<>
											<option value="Dresses">Dresses</option>
											<option value="Tops">Tops</option>
											<option value="Bottoms">Bottoms</option>
											<option value="Outerwear">Outerwear</option>
											<option value="Lingerie">Lingerie</option>
										</>
									)}
									{subcategory === 'Shoes' && (
										<>
											<option value="Sneakers">Sneakers</option>
											<option value="Boots">Boots</option>
											<option value="Sandals">Sandals</option>
											<option value="Heels">Heels</option>
											<option value="Flats">Flats</option>
										</>
									)}
									
									{/* Beauty & Cosmetics Product Types */}
									{subcategory === 'Skincare' && (
										<>
											<option value="Cleanser">Cleanser</option>
											<option value="Moisturizer">Moisturizer</option>
											<option value="Serum">Serum</option>
											<option value="Sunscreen">Sunscreen</option>
											<option value="Mask">Mask</option>
										</>
									)}
									{subcategory === 'Makeup' && (
										<>
											<option value="Foundation">Foundation</option>
											<option value="Lipstick">Lipstick</option>
											<option value="Eyeshadow">Eyeshadow</option>
											<option value="Mascara">Mascara</option>
											<option value="Blush">Blush</option>
										</>
									)}
									
									{/* Home & Garden Product Types */}
									{subcategory === 'Furniture' && (
										<>
											<option value="Sofas">Sofas</option>
											<option value="Tables">Tables</option>
											<option value="Chairs">Chairs</option>
											<option value="Beds">Beds</option>
											<option value="Storage">Storage</option>
										</>
									)}
									{subcategory === 'Decor' && (
										<>
											<option value="Wall Art">Wall Art</option>
											<option value="Vases">Vases</option>
											<option value="Candles">Candles</option>
											<option value="Mirrors">Mirrors</option>
											<option value="Rugs">Rugs</option>
										</>
									)}
									
									{/* Sports & Outdoors Product Types */}
									{subcategory === 'Fitness Equipment' && (
										<>
											<option value="Weights">Weights</option>
											<option value="Mats">Mats</option>
											<option value="Resistance Bands">Resistance Bands</option>
											<option value="Cardio Equipment">Cardio Equipment</option>
											<option value="Yoga Props">Yoga Props</option>
										</>
									)}
									{subcategory === 'Outdoor Gear' && (
										<>
											<option value="Camping">Camping</option>
											<option value="Hiking">Hiking</option>
											<option value="Fishing">Fishing</option>
											<option value="Hunting">Hunting</option>
											<option value="Backpacks">Backpacks</option>
										</>
									)}
									
									{/* Health & Wellness Product Types */}
									{subcategory === 'Supplements' && (
										<>
											<option value="Vitamins">Vitamins</option>
											<option value="Protein">Protein</option>
											<option value="Omega-3">Omega-3</option>
											<option value="Probiotics">Probiotics</option>
											<option value="Herbal">Herbal</option>
										</>
									)}
									{subcategory === 'Medical Supplies' && (
										<>
											<option value="First Aid">First Aid</option>
											<option value="Bandages">Bandages</option>
											<option value="Thermometers">Thermometers</option>
											<option value="Blood Pressure">Blood Pressure</option>
											<option value="Glucose Monitors">Glucose Monitors</option>
										</>
									)}
									
									{/* Toys & Games Product Types */}
									{subcategory === 'Action Figures' && (
										<>
											<option value="Superheroes">Superheroes</option>
											<option value="Anime">Anime</option>
											<option value="Movie Characters">Movie Characters</option>
											<option value="Collectibles">Collectibles</option>
										</>
									)}
									{subcategory === 'Board Games' && (
										<>
											<option value="Strategy">Strategy</option>
											<option value="Family">Family</option>
											<option value="Party">Party</option>
											<option value="Educational">Educational</option>
											<option value="Classic">Classic</option>
										</>
									)}
									
									{/* Books & Media Product Types */}
									{subcategory === 'Books' && (
										<>
											<option value="Fiction">Fiction</option>
											<option value="Non-Fiction">Non-Fiction</option>
											<option value="Children&apos;s">Children&apos;s</option>
											<option value="Textbooks">Textbooks</option>
											<option value="Cookbooks">Cookbooks</option>
										</>
									)}
									{subcategory === 'Digital Media' && (
										<>
											<option value="E-books">E-books</option>
											<option value="Audiobooks">Audiobooks</option>
											<option value="Music">Music</option>
											<option value="Movies">Movies</option>
											<option value="Software">Software</option>
										</>
									)}
									
									{/* Automotive Product Types */}
									{subcategory === 'Car Parts' && (
										<>
											<option value="Engine">Engine</option>
											<option value="Brakes">Brakes</option>
											<option value="Filters">Filters</option>
											<option value="Lights">Lights</option>
											<option value="Tires">Tires</option>
										</>
									)}
									{subcategory === 'Accessories' && (
										<>
											<option value="Seat Covers">Seat Covers</option>
											<option value="Floor Mats">Floor Mats</option>
											<option value="Phone Mounts">Phone Mounts</option>
											<option value="Chargers">Chargers</option>
											<option value="Dash Cams">Dash Cams</option>
										</>
									)}
									
									{/* Baby & Kids Product Types */}
									{subcategory === 'Baby Care' && (
										<>
											<option value="Diapers">Diapers</option>
											<option value="Baby Food">Baby Food</option>
											<option value="Bottles">Bottles</option>
											<option value="Pacifiers">Pacifiers</option>
											<option value="Baby Bath">Baby Bath</option>
										</>
									)}
									{subcategory === 'Feeding' && (
										<>
											<option value="Bottles">Bottles</option>
											<option value="Sippy Cups">Sippy Cups</option>
											<option value="Bibs">Bibs</option>
											<option value="High Chairs">High Chairs</option>
											<option value="Baby Food">Baby Food</option>
										</>
									)}
									
									{/* Pet Supplies Product Types */}
									{subcategory === 'Dog Supplies' && (
										<>
											<option value="Food">Food</option>
											<option value="Toys">Toys</option>
											<option value="Leashes">Leashes</option>
											<option value="Collars">Collars</option>
											<option value="Beds">Beds</option>
										</>
									)}
									{subcategory === 'Cat Supplies' && (
										<>
											<option value="Food">Food</option>
											<option value="Litter">Litter</option>
											<option value="Toys">Toys</option>
											<option value="Scratchers">Scratchers</option>
											<option value="Beds">Beds</option>
										</>
									)}
									
									{/* Office Supplies Product Types */}
									{subcategory === 'Stationery' && (
										<>
											<option value="Pens">Pens</option>
											<option value="Paper">Paper</option>
											<option value="Notebooks">Notebooks</option>
											<option value="Folders">Folders</option>
											<option value="Staplers">Staplers</option>
										</>
									)}
									{subcategory === 'Technology' && (
										<>
											<option value="Computers">Computers</option>
											<option value="Printers">Printers</option>
											<option value="Monitors">Monitors</option>
											<option value="Keyboards">Keyboards</option>
											<option value="Mice">Mice</option>
										</>
									)}
									
									{/* Jewelry & Accessories Product Types */}
									{subcategory === 'Necklaces' && (
										<>
											<option value="Chains">Chains</option>
											<option value="Pendants">Pendants</option>
											<option value="Pearls">Pearls</option>
											<option value="Gold">Gold</option>
											<option value="Silver">Silver</option>
										</>
									)}
									{subcategory === 'Watches' && (
										<>
											<option value="Digital">Digital</option>
											<option value="Analog">Analog</option>
											<option value="Smart">Smart</option>
											<option value="Luxury">Luxury</option>
											<option value="Sports">Sports</option>
										</>
									)}
									
									{/* Art & Crafts Product Types */}
									{subcategory === 'Drawing Supplies' && (
										<>
											<option value="Pencils">Pencils</option>
											<option value="Markers">Markers</option>
											<option value="Paper">Paper</option>
											<option value="Erasers">Erasers</option>
											<option value="Sharpeners">Sharpeners</option>
										</>
									)}
									{subcategory === 'Painting' && (
										<>
											<option value="Acrylic">Acrylic</option>
											<option value="Watercolor">Watercolor</option>
											<option value="Oil">Oil</option>
											<option value="Brushes">Brushes</option>
											<option value="Canvas">Canvas</option>
										</>
									)}
									
									{/* Travel & Luggage Product Types */}
									{subcategory === 'Luggage' && (
										<>
											<option value="Suitcases">Suitcases</option>
											<option value="Carry-On">Carry-On</option>
											<option value="Duffel Bags">Duffel Bags</option>
											<option value="Backpacks">Backpacks</option>
											<option value="Travel Organizers">Travel Organizers</option>
										</>
									)}
									{subcategory === 'Travel Accessories' && (
										<>
											<option value="Packing Cubes">Packing Cubes</option>
											<option value="Travel Pillows">Travel Pillows</option>
											<option value="Luggage Tags">Luggage Tags</option>
											<option value="Travel Adapters">Travel Adapters</option>
											<option value="Security">Security</option>
										</>
									)}
									
									{/* Industrial & Scientific Product Types */}
									{subcategory === 'Tools' && (
										<>
											<option value="Hand Tools">Hand Tools</option>
											<option value="Power Tools">Power Tools</option>
											<option value="Measuring">Measuring</option>
											<option value="Cutting">Cutting</option>
											<option value="Fastening">Fastening</option>
										</>
									)}
									{subcategory === 'Lab Supplies' && (
										<>
											<option value="Glassware">Glassware</option>
											<option value="Chemicals">Chemicals</option>
											<option value="Safety Equipment">Safety Equipment</option>
											<option value="Measuring">Measuring</option>
											<option value="Testing">Testing</option>
										</>
									)}
									
									{/* Additional Fashion & Clothing Product Types */}
									{subcategory === 'Kids&apos; Clothing' && (
										<>
											<option value="T-Shirts">T-Shirts</option>
											<option value="Jeans">Jeans</option>
											<option value="Dresses">Dresses</option>
											<option value="Pajamas">Pajamas</option>
											<option value="School Uniforms">School Uniforms</option>
										</>
									)}
									{subcategory === 'Shoes' && (
										<>
											<option value="Sneakers">Sneakers</option>
											<option value="Boots">Boots</option>
											<option value="Sandals">Sandals</option>
											<option value="Heels">Heels</option>
											<option value="Flats">Flats</option>
										</>
									)}
									{subcategory === 'Accessories' && (
										<>
											<option value="Bags">Bags</option>
											<option value="Belts">Belts</option>
											<option value="Hats">Hats</option>
											<option value="Scarves">Scarves</option>
											<option value="Gloves">Gloves</option>
										</>
									)}
									{subcategory === 'Underwear' && (
										<>
											<option value="Bras">Bras</option>
											<option value="Panties">Panties</option>
											<option value="Boxers">Boxers</option>
											<option value="Briefs">Briefs</option>
											<option value="Socks">Socks</option>
										</>
									)}
									{subcategory === 'Swimwear' && (
										<>
											<option value="Bikinis">Bikinis</option>
											<option value="One-Piece">One-Piece</option>
											<option value="Swim Trunks">Swim Trunks</option>
											<option value="Cover-ups">Cover-ups</option>
											<option value="Swim Accessories">Swim Accessories</option>
										</>
									)}
									{subcategory === 'Activewear' && (
										<>
											<option value="Leggings">Leggings</option>
											<option value="Sports Bras">Sports Bras</option>
											<option value="Tank Tops">Tank Tops</option>
											<option value="Shorts">Shorts</option>
											<option value="Hoodies">Hoodies</option>
										</>
									)}
									
									{/* Additional Beauty & Cosmetics Product Types */}
									{subcategory === 'Hair Care' && (
										<>
											<option value="Shampoo">Shampoo</option>
											<option value="Conditioner">Conditioner</option>
											<option value="Hair Oil">Hair Oil</option>
											<option value="Hair Mask">Hair Mask</option>
											<option value="Styling Products">Styling Products</option>
										</>
									)}
									{subcategory === 'Fragrance' && (
										<>
											<option value="Perfume">Perfume</option>
											<option value="Cologne">Cologne</option>
											<option value="Body Spray">Body Spray</option>
											<option value="Essential Oils">Essential Oils</option>
											<option value="Candles">Candles</option>
										</>
									)}
									{subcategory === 'Personal Care' && (
										<>
											<option value="Body Wash">Body Wash</option>
											<option value="Lotion">Lotion</option>
											<option value="Deodorant">Deodorant</option>
											<option value="Toothpaste">Toothpaste</option>
											<option value="Shaving">Shaving</option>
										</>
									)}
									{subcategory === 'Tools & Brushes' && (
										<>
											<option value="Makeup Brushes">Makeup Brushes</option>
											<option value="Sponges">Sponges</option>
											<option value="Tweezers">Tweezers</option>
											<option value="Mirrors">Mirrors</option>
											<option value="Cases">Cases</option>
										</>
									)}
									
									{/* Additional Home & Garden Product Types */}
									{subcategory === 'Kitchen & Dining' && (
										<>
											<option value="Cookware">Cookware</option>
											<option value="Dinnerware">Dinnerware</option>
											<option value="Appliances">Appliances</option>
											<option value="Utensils">Utensils</option>
											<option value="Storage">Storage</option>
										</>
									)}
									{subcategory === 'Bedding' && (
										<>
											<option value="Sheets">Sheets</option>
											<option value="Pillows">Pillows</option>
											<option value="Comforters">Comforters</option>
											<option value="Blankets">Blankets</option>
											<option value="Mattress Toppers">Mattress Toppers</option>
										</>
									)}
									{subcategory === 'Bath' && (
										<>
											<option value="Towels">Towels</option>
											<option value="Bath Mats">Bath Mats</option>
											<option value="Shower Curtains">Shower Curtains</option>
											<option value="Bath Accessories">Bath Accessories</option>
											<option value="Soap Dispensers">Soap Dispensers</option>
										</>
									)}
									{subcategory === 'Garden Tools' && (
										<>
											<option value="Shovels">Shovels</option>
											<option value="Rakes">Rakes</option>
											<option value="Pruners">Pruners</option>
											<option value="Hoses">Hoses</option>
											<option value="Pots">Pots</option>
										</>
									)}
									{subcategory === 'Plants & Seeds' && (
										<>
											<option value="Flower Seeds">Flower Seeds</option>
											<option value="Vegetable Seeds">Vegetable Seeds</option>
											<option value="Indoor Plants">Indoor Plants</option>
											<option value="Outdoor Plants">Outdoor Plants</option>
											<option value="Plant Food">Plant Food</option>
										</>
									)}
									{subcategory === 'Lighting' && (
										<>
											<option value="Table Lamps">Table Lamps</option>
											<option value="Floor Lamps">Floor Lamps</option>
											<option value="Ceiling Lights">Ceiling Lights</option>
											<option value="String Lights">String Lights</option>
											<option value="Candles">Candles</option>
										</>
									)}
									
									{/* Additional Sports & Outdoors Product Types */}
									{subcategory === 'Team Sports' && (
										<>
											<option value="Basketball">Basketball</option>
											<option value="Soccer">Soccer</option>
											<option value="Baseball">Baseball</option>
											<option value="Football">Football</option>
											<option value="Volleyball">Volleyball</option>
										</>
									)}
									{subcategory === 'Water Sports' && (
										<>
											<option value="Swimming">Swimming</option>
											<option value="Surfing">Surfing</option>
											<option value="Diving">Diving</option>
											<option value="Kayaking">Kayaking</option>
											<option value="Water Polo">Water Polo</option>
										</>
									)}
									{subcategory === 'Winter Sports' && (
										<>
											<option value="Skiing">Skiing</option>
											<option value="Snowboarding">Snowboarding</option>
											<option value="Ice Skating">Ice Skating</option>
											<option value="Hockey">Hockey</option>
											<option value="Sledding">Sledding</option>
										</>
									)}
									{subcategory === 'Cycling' && (
										<>
											<option value="Bikes">Bikes</option>
											<option value="Helmets">Helmets</option>
											<option value="Accessories">Accessories</option>
											<option value="Clothing">Clothing</option>
											<option value="Repair">Repair</option>
										</>
									)}
									{subcategory === 'Running' && (
										<>
											<option value="Running Shoes">Running Shoes</option>
											<option value="Clothing">Clothing</option>
											<option value="Accessories">Accessories</option>
											<option value="Hydration">Hydration</option>
											<option value="Timing">Timing</option>
										</>
									)}
									{subcategory === 'Yoga & Pilates' && (
										<>
											<option value="Mats">Mats</option>
											<option value="Blocks">Blocks</option>
											<option value="Straps">Straps</option>
											<option value="Clothing">Clothing</option>
											<option value="Props">Props</option>
										</>
									)}
									
									{/* Additional Health & Wellness Product Types */}
									{subcategory === 'Fitness Equipment' && (
										<>
											<option value="Weights">Weights</option>
											<option value="Mats">Mats</option>
											<option value="Resistance Bands">Resistance Bands</option>
											<option value="Cardio Equipment">Cardio Equipment</option>
											<option value="Yoga Props">Yoga Props</option>
										</>
									)}
									{subcategory === 'Personal Care' && (
										<>
											<option value="Body Wash">Body Wash</option>
											<option value="Lotion">Lotion</option>
											<option value="Deodorant">Deodorant</option>
											<option value="Toothpaste">Toothpaste</option>
											<option value="Shaving">Shaving</option>
										</>
									)}
									{subcategory === 'Therapy & Recovery' && (
										<>
											<option value="Massage Tools">Massage Tools</option>
											<option value="Foam Rollers">Foam Rollers</option>
											<option value="Stretching">Stretching</option>
											<option value="Heat Therapy">Heat Therapy</option>
											<option value="Cold Therapy">Cold Therapy</option>
										</>
									)}
									{subcategory === 'Monitoring Devices' && (
										<>
											<option value="Fitness Trackers">Fitness Trackers</option>
											<option value="Heart Rate Monitors">Heart Rate Monitors</option>
											<option value="Blood Pressure">Blood Pressure</option>
											<option value="Glucose Monitors">Glucose Monitors</option>
											<option value="Sleep Trackers">Sleep Trackers</option>
										</>
									)}
									
									{/* Additional Toys & Games Product Types */}
									{subcategory === 'Puzzles' && (
										<>
											<option value="Jigsaw Puzzles">Jigsaw Puzzles</option>
											<option value="Brain Teasers">Brain Teasers</option>
											<option value="3D Puzzles">3D Puzzles</option>
											<option value="Word Puzzles">Word Puzzles</option>
											<option value="Logic Puzzles">Logic Puzzles</option>
										</>
									)}
									{subcategory === 'Educational Toys' && (
										<>
											<option value="STEM Toys">STEM Toys</option>
											<option value="Building Sets">Building Sets</option>
											<option value="Science Kits">Science Kits</option>
											<option value="Learning Games">Learning Games</option>
											<option value="Art Supplies">Art Supplies</option>
										</>
									)}
									{subcategory === 'Outdoor Toys' && (
										<>
											<option value="Bikes">Bikes</option>
											<option value="Scooters">Scooters</option>
											<option value="Trampolines">Trampolines</option>
											<option value="Playground">Playground</option>
											<option value="Water Toys">Water Toys</option>
										</>
									)}
									{subcategory === 'Electronic Toys' && (
										<>
											<option value="Robots">Robots</option>
											<option value="Drones">Drones</option>
											<option value="RC Cars">RC Cars</option>
											<option value="Interactive Toys">Interactive Toys</option>
											<option value="Learning Tablets">Learning Tablets</option>
										</>
									)}
									{subcategory === 'Arts & Crafts' && (
										<>
											<option value="Drawing">Drawing</option>
											<option value="Painting">Painting</option>
											<option value="Sculpting">Sculpting</option>
											<option value="Beading">Beading</option>
											<option value="Origami">Origami</option>
										</>
									)}
									
									{/* Additional Books & Media Product Types */}
									{subcategory === 'Magazines' && (
										<>
											<option value="Fashion">Fashion</option>
											<option value="Sports">Sports</option>
											<option value="Technology">Technology</option>
											<option value="Health">Health</option>
											<option value="News">News</option>
										</>
									)}
									{subcategory === 'Music' && (
										<>
											<option value="CDs">CDs</option>
											<option value="Vinyl">Vinyl</option>
											<option value="Digital">Digital</option>
											<option value="Instruments">Instruments</option>
											<option value="Accessories">Accessories</option>
										</>
									)}
									{subcategory === 'Movies & TV' && (
										<>
											<option value="DVDs">DVDs</option>
											<option value="Blu-ray">Blu-ray</option>
											<option value="Digital">Digital</option>
											<option value="Streaming">Streaming</option>
											<option value="Box Sets">Box Sets</option>
										</>
									)}
									{subcategory === 'Video Games' && (
										<>
											<option value="Console Games">Console Games</option>
											<option value="PC Games">PC Games</option>
											<option value="Mobile Games">Mobile Games</option>
											<option value="Accessories">Accessories</option>
											<option value="Consoles">Consoles</option>
										</>
									)}
									
									{/* Additional Automotive Product Types */}
									{subcategory === 'Tools' && (
										<>
											<option value="Hand Tools">Hand Tools</option>
											<option value="Power Tools">Power Tools</option>
											<option value="Measuring">Measuring</option>
											<option value="Cutting">Cutting</option>
											<option value="Fastening">Fastening</option>
										</>
									)}
									{subcategory === 'Maintenance' && (
										<>
											<option value="Oil">Oil</option>
											<option value="Filters">Filters</option>
											<option value="Fluids">Fluids</option>
											<option value="Belts">Belts</option>
											<option value="Batteries">Batteries</option>
										</>
									)}
									{subcategory === 'Interior' && (
										<>
											<option value="Seat Covers">Seat Covers</option>
											<option value="Floor Mats">Floor Mats</option>
											<option value="Dash Covers">Dash Covers</option>
											<option value="Steering Wheels">Steering Wheels</option>
											<option value="Shift Knobs">Shift Knobs</option>
										</>
									)}
									{subcategory === 'Exterior' && (
										<>
											<option value="Bumpers">Bumpers</option>
											<option value="Grilles">Grilles</option>
											<option value="Spoilers">Spoilers</option>
											<option value="Mirrors">Mirrors</option>
											<option value="Trim">Trim</option>
										</>
									)}
									
									{/* Additional Baby & Kids Product Types */}
									{subcategory === 'Nursery' && (
										<>
											<option value="Cribs">Cribs</option>
											<option value="Changing Tables">Changing Tables</option>
											<option value="Rockers">Rockers</option>
											<option value="Mobiles">Mobiles</option>
											<option value="Night Lights">Night Lights</option>
										</>
									)}
									{subcategory === 'Safety' && (
										<>
											<option value="Gates">Gates</option>
											<option value="Locks">Locks</option>
											<option value="Monitors">Monitors</option>
											<option value="Alarms">Alarms</option>
											<option value="Protectors">Protectors</option>
										</>
									)}
									{subcategory === 'Toys' && (
										<>
											<option value="Rattles">Rattles</option>
											<option value="Teethers">Teethers</option>
											<option value="Soft Toys">Soft Toys</option>
											<option value="Activity Centers">Activity Centers</option>
											<option value="Musical Toys">Musical Toys</option>
										</>
									)}
									{subcategory === 'Clothing' && (
										<>
											<option value="Onesies">Onesies</option>
											<option value="Sleepwear">Sleepwear</option>
											<option value="Outerwear">Outerwear</option>
											<option value="Accessories">Accessories</option>
											<option value="Special Occasion">Special Occasion</option>
										</>
									)}
									
									{/* Additional Pet Supplies Product Types */}
									{subcategory === 'Fish Supplies' && (
										<>
											<option value="Tanks">Tanks</option>
											<option value="Filters">Filters</option>
											<option value="Food">Food</option>
											<option value="Decorations">Decorations</option>
											<option value="Heaters">Heaters</option>
										</>
									)}
									{subcategory === 'Bird Supplies' && (
										<>
											<option value="Cages">Cages</option>
											<option value="Perches">Perches</option>
											<option value="Food">Food</option>
											<option value="Toys">Toys</option>
											<option value="Accessories">Accessories</option>
										</>
									)}
									{subcategory === 'Small Pet Supplies' && (
										<>
											<option value="Habitats">Habitats</option>
											<option value="Bedding">Bedding</option>
											<option value="Food">Food</option>
											<option value="Toys">Toys</option>
											<option value="Exercise">Exercise</option>
										</>
									)}
									{subcategory === 'Pet Food' && (
										<>
											<option value="Dry Food">Dry Food</option>
											<option value="Wet Food">Wet Food</option>
											<option value="Treats">Treats</option>
											<option value="Supplements">Supplements</option>
											<option value="Special Diet">Special Diet</option>
										</>
									)}
									
									{/* Additional Office Supplies Product Types */}
									{subcategory === 'Furniture' && (
										<>
											<option value="Desks">Desks</option>
											<option value="Chairs">Chairs</option>
											<option value="Filing Cabinets">Filing Cabinets</option>
											<option value="Bookcases">Bookcases</option>
											<option value="Storage">Storage</option>
										</>
									)}
									{subcategory === 'Storage' && (
										<>
											<option value="File Folders">File Folders</option>
											<option value="Binders">Binders</option>
											<option value="Boxes">Boxes</option>
											<option value="Drawers">Drawers</option>
											<option value="Shelving">Shelving</option>
										</>
									)}
									{subcategory === 'Presentation' && (
										<>
											<option value="Whiteboards">Whiteboards</option>
											<option value="Flip Charts">Flip Charts</option>
											<option value="Projectors">Projectors</option>
											<option value="Screens">Screens</option>
											<option value="Pointers">Pointers</option>
										</>
									)}
									{subcategory === 'Organization' && (
										<>
											<option value="Planners">Planners</option>
											<option value="Calendars">Calendars</option>
											<option value="Labels">Labels</option>
											<option value="Dividers">Dividers</option>
											<option value="Trays">Trays</option>
										</>
									)}
									
									{/* Additional Jewelry & Accessories Product Types */}
									{subcategory === 'Rings' && (
										<>
											<option value="Engagement">Engagement</option>
											<option value="Wedding">Wedding</option>
											<option value="Fashion">Fashion</option>
											<option value="Signet">Signet</option>
											<option value="Cocktail">Cocktail</option>
										</>
									)}
									{subcategory === 'Earrings' && (
										<>
											<option value="Studs">Studs</option>
											<option value="Hoop">Hoop</option>
											<option value="Drop">Drop</option>
											<option value="Chandelier">Chandelier</option>
											<option value="Clip-on">Clip-on</option>
										</>
									)}
									{subcategory === 'Bracelets' && (
										<>
											<option value="Chain">Chain</option>
											<option value="Bangle">Bangle</option>
											<option value="Cuff">Cuff</option>
											<option value="Charm">Charm</option>
											<option value="Tennis">Tennis</option>
										</>
									)}
									{subcategory === 'Bags' && (
										<>
											<option value="Handbags">Handbags</option>
											<option value="Clutches">Clutches</option>
											<option value="Totes">Totes</option>
											<option value="Crossbody">Crossbody</option>
											<option value="Evening">Evening</option>
										</>
									)}
									{subcategory === 'Belts' && (
										<>
											<option value="Leather">Leather</option>
											<option value="Fabric">Fabric</option>
											<option value="Chain">Chain</option>
											<option value="Studded">Studded</option>
											<option value="Designer">Designer</option>
										</>
									)}
									
									{/* Additional Art & Crafts Product Types */}
									{subcategory === 'Sculpting' && (
										<>
											<option value="Clay">Clay</option>
											<option value="Tools">Tools</option>
											<option value="Wire">Wire</option>
											<option value="Wood">Wood</option>
											<option value="Stone">Stone</option>
										</>
									)}
									{subcategory === 'Crafting' && (
										<>
											<option value="Scrapbooking">Scrapbooking</option>
											<option value="Card Making">Card Making</option>
											<option value="Jewelry Making">Jewelry Making</option>
											<option value="Sewing">Sewing</option>
											<option value="Knitting">Knitting</option>
										</>
									)}
									{subcategory === 'Paper Crafts' && (
										<>
											<option value="Origami">Origami</option>
											<option value="Quilling">Quilling</option>
											<option value="Decoupage">Decoupage</option>
											<option value="Paper Mache">Paper Mache</option>
											<option value="Bookbinding">Bookbinding</option>
										</>
									)}
									{subcategory === 'Fabric Crafts' && (
										<>
											<option value="Sewing">Sewing</option>
											<option value="Embroidery">Embroidery</option>
											<option value="Quilting">Quilting</option>
											<option value="Cross Stitch">Cross Stitch</option>
											<option value="Applique">Applique</option>
										</>
									)}
									
									{/* Additional Travel & Luggage Product Types */}
									{subcategory === 'Backpacks' && (
										<>
											<option value="Hiking">Hiking</option>
											<option value="Travel">Travel</option>
											<option value="School">School</option>
											<option value="Laptop">Laptop</option>
											<option value="Camera">Camera</option>
										</>
									)}
									{subcategory === 'Travel Bags' && (
										<>
											<option value="Duffel">Duffel</option>
											<option value="Weekender">Weekender</option>
											<option value="Gym">Gym</option>
											<option value="Messenger">Messenger</option>
											<option value="Tote">Tote</option>
										</>
									)}
									{subcategory === 'Travel Organizers' && (
										<>
											<option value="Packing Cubes">Packing Cubes</option>
											<option value="Toiletry Bags">Toiletry Bags</option>
											<option value="Cable Organizers">Cable Organizers</option>
											<option value="Jewelry Cases">Jewelry Cases</option>
											<option value="Shoe Bags">Shoe Bags</option>
										</>
									)}
									
									{/* Additional Industrial & Scientific Product Types */}
									{subcategory === 'Equipment' && (
										<>
											<option value="Heavy Machinery">Heavy Machinery</option>
											<option value="Testing Equipment">Testing Equipment</option>
											<option value="Measurement Devices">Measurement Devices</option>
											<option value="Safety Equipment">Safety Equipment</option>
											<option value="Maintenance Tools">Maintenance Tools</option>
										</>
									)}
									{subcategory === 'Safety' && (
										<>
											<option value="Protective Clothing">Protective Clothing</option>
											<option value="Helmets">Helmets</option>
											<option value="Gloves">Gloves</option>
											<option value="Safety Glasses">Safety Glasses</option>
											<option value="Respirators">Respirators</option>
										</>
									)}
									{subcategory === 'Measurement' && (
										<>
											<option value="Rulers">Rulers</option>
											<option value="Calipers">Calipers</option>
											<option value="Meters">Meters</option>
											<option value="Gauges">Gauges</option>
											<option value="Scales">Scales</option>
										</>
									)}
									{subcategory === 'Testing' && (
										<>
											<option value="Quality Control">Quality Control</option>
											<option value="Material Testing">Material Testing</option>
											<option value="Environmental">Environmental</option>
											<option value="Performance">Performance</option>
											<option value="Compliance">Compliance</option>
										</>
									)}
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
                                    <span className="relative inline-flex group">
                                        <svg className="h-3.5 w-3.5 text-gray-400 cursor-help" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">i</text></svg>
                                        <div className="invisible absolute left-0 top-full z-20 mt-2 w-[360px] rounded-lg border border-gray-200 bg-white p-3 text-[12px] text-header shadow-lg group-hover:visible">
                                            <ol className="list-decimal pl-4 space-y-1">
                                                <li>This is the main image of your product page. Maximum 8 images can be uploaded.</li>
                                                <li>Image size between 330x330 and 6500x6500 px. Max file size: 6 MB.</li>
                                                <li>Obscene image is strictly prohibited.</li>
                                            </ol>
                                        </div>
                                    </span>
                                </label>
                                <div className={`rounded-md border p-3 ${validationErrors.productImages ? 'border-red-500 border-dashed bg-red-50' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {productImages.map((src, idx) => (
                                            <div key={idx} className="group relative h-[60px] w-[60px] overflow-hidden rounded-md bg-gray-200 hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer">
                                                <Image src={src} alt={`Product ${idx+1}`} width={60} height={60} className="h-full w-full object-cover" />
                                                <button
                                                    title="Remove"
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        const newImages = productImages.filter((_, i) => i !== idx);
                                                        setProductImages(newImages);
                                                        // Clear validation error when images are removed (if there are still images)
                                                        if (newImages.length > 0 && validationErrors.productImages) {
                                                            setValidationErrors(prev => ({ ...prev, productImages: '' }));
                                                        }
                                                        if (newImages.length === 0 && hasHadImages) {
                                                            setErrorWithTimeout('productImages', 'Image is missing. Please upload at least 1 image.');
                                                        }
                                                    }}
                                                    className="invisible absolute inset-0 flex items-center justify-center bg-black/60 text-white group-hover:visible"
                                                >
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {productImages.length < 8 && (
                                            <button type="button" onClick={() => {
                                              console.log('Upload button clicked!');
                                              handleAddProductImage();
                                            }} className="flex h-[60px] w-[60px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-white hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer group">
                                                <svg className="h-5 w-5 text-gray-500 group-hover:text-blue-400 group-hover:drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                            </button>
                                        )}
                                    </div>
                                    {validationErrors.productImages && (
                                        <div className="mt-2 text-xs text-red-600">{validationErrors.productImages}</div>
                                    )}
                                </div>
							</div>


							{/* Buyer Promotion Image */}
							<div>
                                <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                                    Buyer Promotion Image
                                    <span className="relative inline-flex group">
                                        <svg className="h-3.5 w-3.5 text-gray-400 cursor-help" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">i</text></svg>
                                        <div className="invisible absolute left-0 top-full z-20 mt-2 w-[360px] rounded-lg border border-gray-200 bg-white p-3 text-[12px] text-header shadow-lg group-hover:visible">
                                            <ol className="list-decimal pl-4 space-y-1">
                                                <li>A buyer promotion image represents your product in various places, such as search result page, product recommendation page, etc.</li>
                                                <li>Having a buyer promotion image will inspire buyers to click on your product.</li>
                                            </ol>
                                        </div>
                                    </span>
                                </label>
                    <div className="relative rounded-md border border-gray-200 bg-white p-3" onMouseLeave={() => setShowExample(false)}>
                        <div className="flex items-start gap-3">
                                        {promoImage ? (
                                            <div className="group relative h-[60px] w-[60px] overflow-hidden rounded-md hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer">
                                                <Image src={promoImage} alt="Promo" width={60} height={60} className="h-full w-full object-cover" />
                                                <button
                                                    title="Remove"
                                                    onClick={(e)=>{e.stopPropagation(); setPromoImage(null);}}
                                                    className="invisible absolute inset-0 flex items-center justify-center bg-black/60 text-white group-hover:visible"
                                                >
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSetPromoImage} className="flex h-[60px] w-[60px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-white hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer group">
                                                <svg className="h-5 w-5 text-gray-500 group-hover:text-blue-400 group-hover:drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                            </button>
                                        )}
							<div>
								<div className="text-[11px] text-subheader">White Background Image</div>
								<span
									className="relative inline-block"
									onMouseEnter={keepExample}
									onMouseLeave={scheduleHideExample}
								>
									<button className="text-[10px] text-blue-600 hover:underline">See Example</button>

									{showExample && (
                                        <div className="absolute left-full top-0 z-20 ml-2 w-[460px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg" onMouseEnter={keepExample} onMouseLeave={scheduleHideExample}>
                                            <div className="mb-2 text-[12px] font-semibold text-header">See Example</div>
											<div className="flex gap-3">
												<Image 
													src="/examplepic.png" 
													alt="Sample white background" 
													width={140} 
													height={110} 
													className="h-[110px] w-[140px] rounded-md border border-gray-200 object-cover" 
												/>
												<ol className="list-decimal pl-4 text-[12px] text-header space-y-1">
													<li>Size: Less than 6MB.</li>
													<li>Supported formats: JPG, JEPG or PNG.</li>
													<li>The aspect ratio (W x H) must be 1:1.</li>
													<li>The minimum resolution is 330 x 330 pixels. (Recommended: 1000 x 1000 pixels).</li>
													<li>The background should be plain white (preferred) or show the real environment.</li>
													<li>Do not include watermarks, any forms of borders, or marketing copy in the picture.</li>
												</ol>
											</div>
										</div>
									)}
								</span>
							</div>
                            {errors.promoImage && (
                                <div className="mt-2 text-xs text-red-600">{errors.promoImage}</div>
                            )}
						</div>
								</div>
							</div>

							{/* Video */}
							<div>
                                <label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
                                    Video
                                    <span className="relative inline-flex group">
                                        <svg className="h-3.5 w-3.5 text-gray-400 cursor-help" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">i</text></svg>
                                        <div className="invisible absolute left-0 top-full z-20 mt-2 w-[360px] rounded-lg border border-gray-200 bg-white p-3 text-[12px] text-header shadow-lg group-hover:visible">
                                            <div className="mb-1 font-medium">Boost Conversion Rate by Uploading Video.</div>
                                            <ol className="list-decimal pl-4 space-y-1">
                                                <li>Video represents your product in various places, such as product recommendation page and product detail page, etc.</li>
                                                <li>Having a Video will inspire buyers to click on your product (compared with only image).</li>
                                            </ol>
                                        </div>
                                    </span>
                                </label>
                                <div className="rounded-md border border-gray-300 bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        {videoFileName ? (
                                            <div className="group relative flex h-[60px] w-[60px] items-center justify-center rounded-md bg-gray-700 text-white hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer">
                                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                <button
                                                    title="Remove"
                                                    onClick={(e)=>{e.stopPropagation(); setVideoFileName(null); setProductVideos([]);}}
                                                    className="invisible absolute inset-0 flex items-center justify-center bg-black/60 text-white group-hover:visible"
                                                >
                                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleSetVideo} className="flex h-[60px] w-[60px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-white hover:ring-2 hover:ring-blue-300 hover:ring-opacity-60 cursor-pointer group">
                                                <svg className="h-5 w-5 text-gray-500 group-hover:text-blue-400 group-hover:drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                            </button>
                                        )}
                                        <div className="space-y-0.5 text-[11px] text-subheader">
                                            <div>Minimum size: 480x480 px, max video length: 60 seconds, max file size: 100MB.</div>
                                            <div>Supported format: mp4</div>
                                            <div>New Video might take up to 36 hours to be approved by Lazada</div>
                                        </div>
                                    </div>
                                    {errors.video && (
                                        <div className="mt-2 text-xs text-red-600">{errors.video}</div>
                                    )}
                                </div>
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
										// Clear error when user starts typing
										if (validationErrors.brand && e.target.value.trim()) {
											setValidationErrors(prev => ({ ...prev, brand: '' }));
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

					{/* Price, Stock & Variants */}
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
                 handleNumberChange(e.target.value, setPrice);
                 // Clear error when user starts typing
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
                 onClick={() => incrementPrice(price, setPrice)}
                 className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
               >
                 <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                   <path d="M18 15l-6-6-6 6"/>
                 </svg>
               </button>
               <button
                 type="button"
                 onClick={() => decrementPrice(price, setPrice)}
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
                onChange={(e) => handleNumberChange(e.target.value, setSpecialPrice)}
                className="flex-1 border-none bg-transparent text-center text-sm text-header focus:outline-none min-w-0"
                style={{ width: 'calc(100% - 20px)' }}
                placeholder="0.00"
              />
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => incrementPrice(specialPrice, setSpecialPrice)}
                  className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => decrementPrice(specialPrice, setSpecialPrice)}
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
              onChange={(e) => handleNumberChange(e.target.value, setStock)}
              className="flex-1 border-none bg-transparent text-center text-sm text-header focus:outline-none min-w-0"
              style={{ width: 'calc(100% - 20px)' }}
              placeholder="0"
            />
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => incrementStock(stock, setStock)}
                className="h-3 w-3 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => decrementStock(stock, setStock)}
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

					{/* Product Description */}
					<section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
						<h4 className="mb-4 text-[18px] font-semibold text-header">Product Description</h4>
						<div className="space-y-4">
							{/* Main Description */}
							<div>
								<label className="mb-1 block text-[12px] text-subheader">Main Description</label>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Enter product description..."
									rows={6}
									className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>

							{/* Product Highlights */}
							<div>
								<div className="mb-1 flex items-center gap-1">
									<label className="text-[12px] text-subheader">Product Highlights</label>
									<div className="group relative">
										<svg className="h-3.5 w-3.5 text-gray-400 cursor-help" viewBox="0 0 24 24" fill="currentColor">
											<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
											<text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">i</text>
										</svg>
										<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
											<div className="text-xs text-gray-700">
												Enter short major highlights of the product, to make the purchase decision for the customer easier.
											</div>
											<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
										</div>
									</div>
								</div>
								<textarea
									value={highlights}
									onChange={(e) => setHighlights(e.target.value)}
									placeholder="Enter product highlights..."
									rows={6}
									className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>

							{/* What's in the box */}
							<div>
								<div className="mb-1 flex items-center gap-1">
									<label className="text-[12px] text-subheader">What&apos;s in the box</label>
									<div className="group relative">
										<svg className="h-3.5 w-3.5 text-gray-400 cursor-help" viewBox="0 0 24 24" fill="currentColor">
											<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
											<text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">i</text>
										</svg>
										<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
											<div className="text-xs text-gray-700">
												Indicates the items that customer will get when they receive this product. For example, for a smartphone, a customer may get: 1 x Phone, 1 x Cable, 1 x Headset
											</div>
											<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
										</div>
									</div>
								</div>
								<textarea
									value={in_box}
									onChange={(e) => setIn_box(e.target.value)}
									placeholder="Enter what's included in the box..."
									rows={4}
									className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
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
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 rounded-b-xl">
					{submitError && (
						<div className="flex-1 rounded-md bg-red-50 border border-red-200 p-3">
							<p className="text-sm text-red-600">{submitError}</p>
						</div>
					)}
					<button 
						onClick={onClose} 
						className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-subheader hover:bg-gray-50"
						disabled={loading}
					>
						Cancel
					</button>
					<button 
						onClick={handleSubmit}
						className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={loading}
					>
						{loading ? 'Adding...' : 'Add Product'}
					</button>
				</div>
			</div>
		</div>
	);
}





