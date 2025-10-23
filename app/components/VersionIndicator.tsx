'use client';

import { useEffect, useState } from 'react';

export default function VersionIndicator() {
  const [version, setVersion] = useState('Loading...');

  useEffect(() => {
    // Fetch version from package.json
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => setVersion('v0.1.0')); // Fallback version
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-70 hover:opacity-100 transition-opacity">
        v{version}
      </div>
    </div>
  );
}
