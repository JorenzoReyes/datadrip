'use client';

import React from 'react';
import Image from 'next/image';

interface RedirectToShopModalProps {
  onClose: () => void;
  onConfirm: () => void;
  platform: string;
}

export default function RedirectToShopModal({ onClose, onConfirm, platform }: RedirectToShopModalProps) {
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'shopee':
        return '/shopee.png';
      case 'lazada':
        return '/lazada.png';
      case 'tiktok':
        return '/tiktok.svg';
      default:
        return '🔗';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'shopee':
        return '#ee4d2d';
      case 'lazada':
        return '#0f146d';
      case 'tiktok':
        return '#000000';
      default:
        return '#6b7280';
    }
  };

  const getPlatformUrl = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'shopee':
        return 'https://partner.shopeemobile.com';
      case 'lazada':
        return 'https://sellercenter.lazada.com.ph';
      case 'tiktok':
        return 'https://seller.tiktokshop.com';
      default:
        return '#';
    }
  };

  const handleRedirect = () => {
    const url = getPlatformUrl(platform);
    window.open(url, '_blank');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4">
        <div className="text-center">
          {/* Platform Icon */}
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${getPlatformColor(platform)}15` }}
          >
            {getPlatformIcon(platform).startsWith('/') ? (
              <Image 
                src={getPlatformIcon(platform)} 
                alt={`${platform} icon`}
                width={48}
                height={48}
                className="object-contain"
              />
            ) : (
              <span className="text-4xl">{getPlatformIcon(platform)}</span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Redirect to {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </h2>
          
          <p className="text-gray-600 mb-6">
            You will be redirected to {platform.charAt(0).toUpperCase() + platform.slice(1)} to log in and authorize the connection.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You&apos;ll be redirected to {platform.charAt(0).toUpperCase() + platform.slice(1)}</li>
                  <li>• Log in with your shop credentials</li>
                  <li>• Authorize the connection</li>
                  <li>• You&apos;ll be redirected back here</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRedirect}
              className="flex-1 px-4 py-2 text-white rounded-lg transition font-medium"
              style={{ backgroundColor: getPlatformColor(platform) }}
            >
              Continue to {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
