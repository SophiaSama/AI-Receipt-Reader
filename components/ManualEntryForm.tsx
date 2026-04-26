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
    <form onSubmit={handleSubmit} className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="space-y-8">
        <div>
          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Provider Identifier</label>
          <input
            required
            type="text"
            name="merchantName"
            id="merchantName"
            className="w-full px-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl focus:ring-2 focus:ring-accent/30 focus:border-accent/30 text-foreground placeholder-slate-600 outline-none transition-all shadow-inner font-medium"
            placeholder="e.g. NVIDIA Corporation"
            value={formData.merchantName}
            onChange={e => setFormData({ ...formData, merchantName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Commit Date</label>
            <input
              required
              type="date"
              name="date"
              id="date"
              className="w-full px-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl focus:ring-2 focus:ring-accent/30 text-foreground outline-none transition-all font-mono uppercase"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Asset Currency</label>
            <div className="relative">
              <select
                name="currency"
                id="currency"
                className="w-full px-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl focus:ring-2 focus:ring-accent/30 text-foreground outline-none transition-all appearance-none cursor-pointer font-bold tracking-tight"
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="SGD">Singapore Dollar (SGD)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="GBP">British Pound (GBP)</option>
                <option value="JPY">Japanese Yen (JPY)</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Transaction Volume</label>
            <div className="relative group/total">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-accent font-mono font-black text-sm">$</span>
              <input
                required
                type="number"
                step="0.01"
                name="total"
                id="total"
                className="w-full pl-12 pr-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl focus:ring-2 focus:ring-accent/30 text-foreground font-mono font-black text-xl outline-none transition-all shadow-inner"
                value={formData.total}
                onChange={e => setFormData({ ...formData, total: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] mb-3 px-1">Evidence Payload</label>
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
                className="flex items-center gap-3 px-6 py-4 bg-secondary/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-accent hover:bg-accent/5 hover:border-accent/20 cursor-pointer transition-all truncate"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {selectedFile ? selectedFile.name : 'Ingest Image Evidence'}
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <div className="flex justify-between items-center mb-5 px-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">Sub-Node Definitions</label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[9px] font-black text-accent hover:text-blue-400 flex items-center gap-2 uppercase tracking-[0.15em] transition-all"
            >
              <div className="p-1 bg-accent/10 rounded-md border border-accent/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              </div>
              Initialize Sub-Node
            </button>
          </div>

          <div className="space-y-4 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center group/item animate-in fade-in slide-in-from-right-3 duration-500">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    placeholder="Node description"
                    className="w-full px-5 py-3 text-xs bg-secondary/10 border border-white/5 rounded-xl text-slate-500 placeholder-slate-600 focus:ring-2 focus:ring-accent/20 outline-none hover:border-accent/20 transition-all font-medium"
                    value={item.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Volume"
                    className="w-full px-5 py-3 text-xs bg-secondary/10 border border-white/5 rounded-xl text-accent font-mono font-black text-right focus:ring-2 focus:ring-accent/20 outline-none hover:border-accent/20 transition-all"
                    value={item.price}
                    onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em] italic">No sub-nodes initialized</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-6 pt-10 border-t border-white/5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-grow btn-primary text-[11px] font-black uppercase tracking-[0.2em] h-14"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Executing Transaction...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
              Finalize Commit
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-10 py-2 bg-white/[0.03] hover:bg-white/[0.08] text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/5 transition-all h-14"
        >
          Abort
        </button>
      </div>
    </form>
  );
};