import React, { useState } from 'react';
import { ReceiptData, LineItem } from '../types';

interface ManualEntryFormProps {
  onSave: (data: Partial<ReceiptData>, file?: File) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onSave, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    merchantName: '',
    date: new Date().toISOString().split('T')[0],
    total: 0,
    currency: 'SGD',
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();

  const handleAddItem = () => {
    setItems([...items, { description: '', price: 0 }]);
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    // Auto-update total if prices change
    if (field === 'price') {
      const newTotal = newItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
      setFormData(prev => ({ ...prev, total: newTotal }));
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
    setFormData(prev => ({ ...prev, total: newTotal }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      items,
      total: Number(formData.total)
    }, selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Merchant Name</label>
          <input
            required
            type="text"
            name="merchantName"
            id="merchantName"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Starbucks"
            value={formData.merchantName}
            onChange={e => setFormData({ ...formData, merchantName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
            <input
              required
              type="date"
              name="date"
              id="date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Currency</label>
            <select
              name="currency"
              id="currency"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.currency}
              onChange={e => setFormData({ ...formData, currency: e.target.value })}
            >
              <option value="SGD">SGD (S$)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Amount</label>
          <input
            required
            type="number"
            step="0.01"
            name="total"
            id="total"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
            value={formData.total}
            onChange={e => setFormData({ ...formData, total: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Receipt Image (Optional)</label>
          <input
            type="file"
            accept="image/*"
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={e => setSelectedFile(e.target.files?.[0])}
          />
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Line Items</label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Add Item
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Item description"
                  className="flex-grow px-2 py-1 text-sm bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                  value={item.description}
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className="w-20 px-2 py-1 text-sm bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right"
                  value={item.price}
                  onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-2 border border-dashed border-slate-200 rounded">No specific items listed</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-grow py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : 'Save Receipt'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};