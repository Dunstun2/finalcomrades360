import React, { useState } from 'react';

const BulkOperations = ({ onBack }) => {
  const [selectedIds, setSelectedIds] = useState('');
  const [action, setAction] = useState('status');
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder submit. Wire to API later.
    alert('Bulk operation prepared. This is a placeholder UI.');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100" aria-label="Go back">
          ←
        </button>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Bulk Operations</h2>
          <p className="text-sm text-gray-500">Update multiple products at once</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product IDs (comma-separated)</label>
          <input
            type="text"
            value={selectedIds}
            onChange={(e) => setSelectedIds(e.target.value)}
            className="input input-bordered w-full"
            placeholder="e.g. 12, 34, 56"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="select select-bordered w-full"
          >
            <option value="status">Update Status</option>
            <option value="price">Update Prices</option>
            <option value="category">Update Category</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Depends on selected action"
          />
        </div>

        <button type="submit" className="btn btn-primary">Run</button>
      </form>
    </div>
  );
};

export default BulkOperations;
