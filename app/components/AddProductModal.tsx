'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface AddProductModalProps {
	onClose: () => void;
	onSave: (productData: {
		name: string;
		sku?: string;
		description?: string;
		brand?: string;
		category?: string;
		subcategory?: string;
		product_type?: string;
		price: number;
		special_price?: number;
		stock: number;
		images?: string[];
		promotion_image?: string;
	}) => Promise<void>;
}

export default function AddProductModal({ onClose, onSave }: AddProductModalProps) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [showExample, setShowExample] = useState(false);
  const hideExampleTimer = useRef<number | null>(null);
  const [productName, setProductName] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
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
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [product_type, setProduct_type] = useState('');
  const [loading, setLoading] = useState(false);
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

  const validateVideo = (file: File): string | null => {
    // File size check
    if (file.size > 100 * 1024 * 1024) { // 100MB
      return 'File size must be less than 100MB';
    }

    // File type check
    if (file.type !== 'video/mp4') {
      return 'Only MP4 files are allowed';
    }

    return null;
  };

  const validateVideoDimensions = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        const { videoWidth, videoHeight, duration } = video;
        
        if (videoWidth < 480 || videoHeight < 480) {
          resolve('Minimum size: 480x480 px');
          return;
        }
        
        if (duration > 60) {
          resolve('Max video length: 60 seconds');
          return;
        }
        
        resolve(null);
      };
      video.onerror = () => resolve('Invalid video file');
      video.src = URL.createObjectURL(file);
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
      const response = await fetch('/api/upload-image', {
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
      
      const response = await fetch('/api/upload-image', {
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
    
    // Validate file
    const fileError = validateVideo(file);
    if (fileError) {
      setErrorWithTimeout('video', fileError);
      return;
    }
    
    // Validate dimensions and duration
    const dimensionError = await validateVideoDimensions(file);
    if (dimensionError) {
      setErrorWithTimeout('video', dimensionError);
      return;
    }
    
    setVideoFileName(file.name);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);

    // Validate required fields
    if (!productName.trim()) {
      setSubmitError('Product name is required');
      setLoading(false);
      return;
    }
    
    if (!category.trim()) {
      setSubmitError('Category is required');
      setLoading(false);
      return;
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setSubmitError('Valid price is required');
      setLoading(false);
      return;
    }
    
    if (!stock || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      setSubmitError('Valid stock is required');
      setLoading(false);
      return;
    }
    
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
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        subcategory: subcategory.trim() || undefined,
        product_type: product_type.trim() || undefined,
        price: parseFloat(price),
        special_price: specialPrice && specialPrice.trim() && !isNaN(parseFloat(specialPrice)) ? parseFloat(specialPrice) : undefined,
        stock: parseInt(stock),
        images: productImages.length > 0 ? productImages : undefined,
        promotion_image: promoImage || undefined,
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
							<div>
								<label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
									<span className="text-red-500">*</span> Product Name
								</label>
								<div className="relative">
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value.slice(0, 255))}
                                    maxLength={255}
                                    placeholder="Ex. Nikon Coolpix A300 Digital Camera"
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-header placeholder-subheader focus:outline-none"
                                />
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{productName.length}/255</span>
                            </div>
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
										}}
										className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
									>
										<option value="">Select option</option>
										<option value="Electronics">Electronics</option>
										<option value="Cosmetics">Cosmetics</option>
										<option value="Food">Food</option>
									</select>
									<svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
										<path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
									</svg>
								</div>
							</div>

							{/* Subcategory */}
							<div>
								<label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
									Subcategory
								</label>
								<div className="relative">
									<select
										value={subcategory}
										onChange={(e) => {
											setSubcategory(e.target.value);
											setProduct_type(''); // Reset product type when subcategory changes
										}}
										disabled={!category}
										className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
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
								</select>
								<svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
									<path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
								</svg>
							</div>
							</div>

							{/* Product Type */}
							<div>
								<label className="mb-1 flex items-center gap-1 text-[12px] text-subheader">
									Product Type
								</label>
								<div className="relative">
									<select
										value={product_type}
										onChange={(e) => setProduct_type(e.target.value)}
										disabled={!subcategory}
										className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
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
								</select>
								<svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
									<path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
								</svg>
							</div>
							</div>

							{/* Product Images */}
							<div>
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
                                <div className={`rounded-md border p-3 ${errors.productImages ? 'border-red-500 border-dashed bg-red-50' : 'border-gray-200 bg-white'}`}>
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
                                    {errors.productImages && (
                                        <div className="mt-2 text-xs text-red-600">{errors.productImages}</div>
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
                                                    onClick={(e)=>{e.stopPropagation(); setVideoFileName(null);}}
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
							<div>
								<label className="mb-1 block text-xs text-subheader"><span className="text-red-500">*</span> Brand</label>
								<input
									type="text"
									value={brand}
									onChange={(e) => setBrand(e.target.value)}
									placeholder="Enter brand name"
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-header placeholder-subheader focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs text-subheader">Type</label>
								<div className="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-subheader">
									<span>Please select or search option</span>
									<svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
								</div>
							</div>
							<div>
								<label className="mb-1 block text-xs text-subheader"><span className="text-red-500">*</span> Model</label>
								<div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-subheader">Input here</div>
							</div>
							<div>
								<label className="mb-1 block text-xs text-subheader">Ingredients</label>
								<div className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-subheader">Please input or select option</div>
							</div>
						</div>
					</section>

					{/* Price, Stock & Variants */}
					<section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
						<h4 className="mb-4 text-[18px] font-semibold text-header">Price, Stock, & Variants</h4>
						<div className="space-y-4">
							<div className="text-xs text-subheader">You can add variants to a product that has more than one option, such as size or color.</div>
							
							{/* Add Variation Button */}
							<button className="flex h-[34px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-subheader hover:bg-gray-50">
								<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
								Add Variation (0/2)
							</button>

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
         <div className="border-r border-gray-200 p-3 flex justify-center">
           <div className="flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 w-full max-w-[120px]">
             <span className="text-sm text-subheader">₱</span>
             <input
               type="text"
               value={price}
               onChange={(e) => handleNumberChange(e.target.value, setPrice)}
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
              className="text-sm text-blue-600 hover:underline"
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
            className={`relative h-5 w-9 rounded-full transition-colors ${
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
								<label className="mb-1 block text-[12px] text-subheader">Description</label>
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
								<label className="mb-1 block text-[12px] text-subheader">Product Highlights</label>
								<div className="rounded-md border border-gray-300 bg-white">
									<div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 text-[12px] text-subheader">
										<svg className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
									</div>
									<div className="min-h-[140px] px-3 py-2 text-[12px] text-subheader">Please input…</div>
								</div>
							</div>

							{/* What's in the box */}
							<div>
								<label className="mb-1 block text-[12px] text-subheader">What&apos;s in the box</label>
								<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">Indicates the items that customer will get when they receive this product. For example, for a smartphone, a customer may get: 1 x Phone, 1 x Cable, 1 x Headset</div>
							</div>
						</div>
					</section>

					{/* Shipping & Warranty */}
					<section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
						<h4 className="mb-2 text-[18px] font-semibold text-header">Shipping & Warranty</h4>
						<p className="mb-3 text-[12px] text-subheader">Switch to enter different package dimensions & weight for variations</p>
						<div className="mb-4 flex items-center gap-2 text-[12px] text-subheader">
							{/* Toggle mimic */}
							<div className="relative h-5 w-9 rounded-full bg-gray-200">
								<div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
							</div>
							<span>Switch on if you need different dimension & weight for different product variants</span>
						</div>

						<div className="space-y-4">
							{/* Package Weight */}
							<div className="grid grid-cols-[1fr_auto] items-center gap-2 md:max-w-md">
								<label className="col-span-2 mb-1 block text-[12px] text-subheader"><span className="text-red-500">*</span> Package Weight</label>
								<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">0.01~300</div>
								<div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-2 text-[12px] text-subheader">
									<span>kg</span>
									<svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
								</div>
							</div>

							{/* Dimensions */}
							<div className="grid grid-cols-3 gap-3 md:max-w-3xl">
								<label className="col-span-3 -mb-1 block text-[12px] text-subheader"><span className="text-red-500">*</span> Package Length(cm) * Width(cm) * Height(cm)</label>
								<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">0.01~300</div>
								<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">0.01~300</div>
								<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">0.01~300</div>
							</div>

							{/* Dangerous Goods */}
							<div className="space-y-2">
								<div className="h-px w-full bg-gray-200" />
								<div className="text-[12px] text-subheader">Dangerous Goods</div>
								<div className="flex items-center gap-6 text-[12px] text-subheader">
									<label className="inline-flex items-center gap-2">
										<span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-400" />
										<span>None</span>
									</label>
									<label className="inline-flex items-center gap-2">
										<span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-400" />
										<span>Contains battery / flammables / liquid</span>
									</label>
								</div>
								<div className="h-px w-full bg-gray-200" />
							</div>

							{/* Warranty */}
							<div className="grid grid-cols-1 gap-3 md:max-w-xl">
								<label className="mb-1 block text-[12px] text-subheader"><span className="text-red-500">*</span> Warranty Type</label>
								<div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">
									<span>Select option</span>
									<svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
								</div>
								<div>
									<label className="mb-1 block text-[12px] text-subheader">Warranty</label>
									<div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader">
										<span>Please input or select option</span>
										<svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
									</div>
								</div>
								<div>
									<label className="mb-1 block text-[12px] text-subheader">Warranty Policy</label>
									<div className="rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-subheader" />
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





