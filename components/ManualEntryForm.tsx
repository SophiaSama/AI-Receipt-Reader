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
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Identity of Source</label>
          <input
            required
            type="text"
            name="merchantName"
            id="merchantName"
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-slate-600 outline-none transition-all shadow-inner"
            placeholder="e.g. Whole Foods Market"
            value={formData.merchantName}
            onChange={e => setFormData({ ...formData, merchantName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Log Date</label>
            <input
              required
              type="date"
              name="date"
              id="date"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 text-white outline-none transition-all color-scheme-dark"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Currency Code</label>
            <select
              name="currency"
              id="currency"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 text-white outline-none transition-all appearance-none cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Gross Transaction Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm">$</span>
              <input
                required
                type="number"
                step="0.01"
                name="total"
                id="total"
                className="w-full pl-8 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-primary/50 text-white font-mono font-bold outline-none transition-all"
                value={formData.total}
                onChange={e => setFormData({ ...formData, total: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Evidence Capture</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                id="manual-file"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0])}
              />
              <label
                htmlFor="manual-file"
                className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer transition-all truncate"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {selectedFile ? selectedFile.name : 'Attach Image Evidence'}
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex justify-between items-center mb-4 px-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Itemized Breakdown</label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[10px] font-black text-primary hover:text-secondary flex items-center gap-1.5 uppercase tracking-widest transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              Add Definition
            </button>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-center group/item animate-in fade-in slide-in-from-right-2 duration-300">
                <input
                  type="text"
                  placeholder="Classification description"
                  className="flex-grow px-4 py-2 text-xs bg-white/[0.02] border border-white/5 rounded-lg text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-primary/30 outline-none hover:border-white/10 transition-all"
                  value={item.description}
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className="w-24 px-4 py-2 text-xs bg-white/[0.02] border border-white/5 rounded-lg text-primary font-mono text-right focus:ring-1 focus:ring-primary/30 outline-none hover:border-white/10 transition-all"
                  value={item.price}
                  onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Zero line items defined</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t border-white/5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-grow btn-primary text-sm tracking-wide h-12"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Committing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
              Finalize Record
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl border border-white/5 transition-all text-sm"
        >
          Abort
        </button>
      </div>
    </form>
  );
};