export default function ColorTestPage() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-title text-header">Color and Font Test</h1>
      
      {/* Color Tests */}
      <div className="space-y-4">
        <div className="bg-header text-white p-4 rounded-lg">
          <h2 className="text-2xl font-title">Header Color Test (bg-header)</h2>
          <p className="font-sans">This should be green background with white text</p>
        </div>
        
        <div className="bg-primary-500 text-white p-4 rounded-lg">
          <h2 className="text-2xl font-title">Primary Color Test (bg-primary-500)</h2>
          <p className="font-sans">This should be green background with white text</p>
        </div>
        
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <h2 className="text-2xl font-title text-header">Header Text Color Test</h2>
          <p className="font-sans text-subheader">Subheader text color test</p>
        </div>
      </div>
      
      {/* Font Tests */}
      <div className="space-y-2">
        <p className="text-lg font-title text-header">Space Grotesk Font - Header</p>
        <p className="text-lg font-sans text-subheader">Manrope Font - Body Text</p>
        <p className="text-lg text-gray-600">Default Font (should be Manrope)</p>
      </div>
      
      {/* Button Tests */}
      <div className="space-x-4">
        <button className="bg-header text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition">
          Header Button
        </button>
        <button className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition">
          Primary Button
        </button>
      </div>
    </div>
  );
}
