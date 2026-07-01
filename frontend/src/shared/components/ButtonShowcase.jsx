import React from 'react';

const ButtonShowcase = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">
        🎨 Comrades360 Button Design System
      </h1>

      {/* Primary Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Primary Blue Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn">Default Button</button>
          <button className="btn-primary">Primary Button</button>
          <button className="btn-gradient">Gradient Button</button>
          <button className="btn-comrades">Comrades360 Special</button>
        </div>
      </section>

      {/* Button Variants */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn-secondary">Secondary</button>
          <button className="btn-outline">Outline</button>
          <button className="btn-ghost">Ghost</button>
          <button className="btn-light">Light</button>
        </div>
      </section>

      {/* Status Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Status Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn-success">Success</button>
          <button className="btn-warning">Warning</button>
          <button className="btn-danger">Danger</button>
        </div>
      </section>

      {/* Button Sizes */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <button className="btn btn-xs">Extra Small</button>
          <button className="btn btn-sm">Small</button>
          <button className="btn btn-md">Medium (Default)</button>
          <button className="btn btn-lg">Large</button>
          <button className="btn btn-xl">Extra Large</button>
        </div>
      </section>

      {/* Special Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Special Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn btn-rounded">Rounded</button>
          <button className="btn btn-square">Square</button>
          <button className="btn btn-icon">🏠</button>
          <button className="btn btn-full">Full Width Button</button>
        </div>
      </section>

      {/* Button States */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Button States</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn">Normal</button>
          <button className="btn btn-loading">Loading...</button>
          <button className="btn" disabled>Disabled</button>
        </div>
      </section>

      {/* Button Groups */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Button Groups</h2>
        <div className="btn-group">
          <button className="btn">Left</button>
          <button className="btn">Center</button>
          <button className="btn">Right</button>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Real-World Examples</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button className="btn-comrades">🛒 Add to Cart</button>
            <button className="btn-outline">❤️ Add to Wishlist</button>
          </div>
          
          <div className="flex gap-4">
            <button className="btn-success">✅ Approve Product</button>
            <button className="btn-warning">⏳ Request Changes</button>
            <button className="btn-danger">❌ Reject</button>
          </div>

          <div className="flex gap-4">
            <button className="btn btn-sm">📝 Edit</button>
            <button className="btn-ghost btn-sm">👁️ View</button>
            <button className="btn-danger btn-sm">🗑️ Delete</button>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Usage Code</h2>
        <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono">
          <div className="space-y-2">
            <div><span className="text-gray-600">// Primary button</span></div>
            <div>&lt;button className="btn"&gt;Click Me&lt;/button&gt;</div>
            
            <div className="mt-4"><span className="text-gray-600">// Special Comrades360 button</span></div>
            <div>&lt;button className="btn-comrades"&gt;Special Action&lt;/button&gt;</div>
            
            <div className="mt-4"><span className="text-gray-600">// Small outline button</span></div>
            <div>&lt;button className="btn-outline btn-sm"&gt;Small Outline&lt;/button&gt;</div>
            
            <div className="mt-4"><span className="text-gray-600">// Full width primary button</span></div>
            <div>&lt;button className="btn btn-full"&gt;Full Width&lt;/button&gt;</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ButtonShowcase;
