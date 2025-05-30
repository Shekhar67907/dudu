import React from 'react';
import { ContactLensItem } from './ContactLensTypes';

interface ContactLensItemTableProps {
  items: ContactLensItem[];
  setItems: (items: ContactLensItem[]) => void;
}

const ContactLensItemTable: React.FC<ContactLensItemTableProps> = ({
  items,
  setItems
}) => {
  const handleDelete = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    
    // Reassign SI numbers
    const updatedItems = newItems.map((item, idx) => ({
      ...item,
      si: idx + 1
    }));
    
    setItems(updatedItems);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-xs text-gray-700">S.I.</th>
            <th className="border px-2 py-1 text-xs text-gray-700">B/C</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Power</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Material</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Dispose</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Brand</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Qty</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Diameter</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Rate</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Amt</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Lens Code</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Side</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Sph</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Cyl</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Ax</th>
            <th className="border px-2 py-1 text-xs text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border px-2 py-1 text-xs">{item.si}</td>
                <td className="border px-2 py-1 text-xs">{item.bc}</td>
                <td className="border px-2 py-1 text-xs">{item.power}</td>
                <td className="border px-2 py-1 text-xs">{item.material}</td>
                <td className="border px-2 py-1 text-xs">{item.dispose}</td>
                <td className="border px-2 py-1 text-xs">{item.brand}</td>
                <td className="border px-2 py-1 text-xs">{item.qty}</td>
                <td className="border px-2 py-1 text-xs">{item.diameter}</td>
                <td className="border px-2 py-1 text-xs">{item.rate.toFixed(2)}</td>
                <td className="border px-2 py-1 text-xs">{item.amount.toFixed(2)}</td>
                <td className="border px-2 py-1 text-xs">{item.lensCode}</td>
                <td className="border px-2 py-1 text-xs">{item.side}</td>
                <td className="border px-2 py-1 text-xs">{item.sph}</td>
                <td className="border px-2 py-1 text-xs">{item.cyl}</td>
                <td className="border px-2 py-1 text-xs">{item.ax}</td>
                <td className="border px-2 py-1 text-xs">
                  <button 
                    onClick={() => handleDelete(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={16} className="border px-2 py-4 text-center text-gray-500">
                No contact lens items added yet
              </td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot className="bg-gray-100">
            <tr>
              <td colSpan={9} className="border px-2 py-1 text-right font-medium text-xs">Total:</td>
              <td className="border px-2 py-1 text-xs font-bold">
                {items.reduce((total, item) => total + item.amount, 0).toFixed(2)}
              </td>
              <td colSpan={6} className="border"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default ContactLensItemTable;
