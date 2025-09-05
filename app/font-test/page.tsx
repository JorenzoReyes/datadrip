export default function FontTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-title text-header mb-4">Space Grotesk Font Test</h1>
      <p className="text-lg font-sans text-gray-600 mb-4">This is Manrope font for body text.</p>
      <div className="space-y-2">
        <p className="font-title text-xl">Space Grotesk - Title Font</p>
        <p className="font-sans text-lg">Manrope - Body Font</p>
        <p className="text-base">Default font (should be Manrope)</p>
      </div>
    </div>
  );
}
