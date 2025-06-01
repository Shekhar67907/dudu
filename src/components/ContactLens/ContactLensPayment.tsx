import React from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { ContactLensFormData } from './ContactLensTypes';

interface ContactLensPaymentProps {
  formData: ContactLensFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  discountPercentage: string;
  setDiscountPercentage: (value: string) => void;
  handleApplyDiscount: () => void;
}

const ContactLensPayment: React.FC<ContactLensPaymentProps> = ({
  formData,
  handleChange,
  handleNumericInputChange,
  discountPercentage,
  setDiscountPercentage,
  handleApplyDiscount,
}) => {
  const paymentMethods = [
    { label: 'Select Payment Method', value: '' },
    { label: 'Cash', value: 'Cash' },
    { label: 'Credit Card', value: 'CreditCard' },
    { label: 'Debit Card', value: 'DebitCard' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Cheque', value: 'Cheque' },
  ];

  return (
    <div className="border rounded p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Payment</span>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-700">Apply discount:</span>
            <Input
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(e.target.value)}
              className="w-16 h-7 text-xs text-center"
              placeholder="0"
              min="0"
              max="100"
            />
            <span className="text-sm">%</span>
            <button 
              onClick={handleApplyDiscount}
              className="bg-green-500 text-white text-xs px-2 py-1 rounded"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Payment Details */}
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-700">Total</label>
              <Input
                name="payment"
                value={formData.payment}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-blue-50 h-8"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Estimate</label>
              <Input
                name="estimate"
                value={formData.estimate}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-blue-50 h-8"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-700 text-red-600">Sch Amt</label>
              <Input
                name="schAmt"
                value={formData.schAmt}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-blue-50 h-8"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Advance</label>
              <Input
                name="advance"
                value={formData.advance}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-blue-50 h-8"
              />
            </div>
          </div>
          
          <div className="mb-2">
            <label className="block text-xs text-gray-700 text-red-600">Balance</label>
            <Input
              name="balance"
              value={formData.balance}
              placeholder="0.00"
              onChange={handleNumericInputChange}
              className="bg-blue-50 h-8"
            />
          </div>
        </div>
        
        {/* Right Column - Payment Methods */}
        <div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-700">Cash Adv:</label>
              <Input
                name="cashAdv"
                value={formData.cashAdv}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-gray-50 h-8"
              />
            </div>
            <div className="flex justify-end items-end">
              <Input
                name="cashAdv2"
                value={formData.cashAdv2}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-gray-50 h-8"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-700">CC / UPI Adv:</label>
              <Input
                name="ccUpiAdv"
                value={formData.ccUpiAdv}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-gray-50 h-8"
              />
            </div>
            <div>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                options={paymentMethods}
                className="mt-auto"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-700">Cheque Adv:</label>
              <Input
                name="chequeAdv"
                value={formData.chequeAdv}
                placeholder="0.00"
                onChange={handleNumericInputChange}
                className="bg-gray-50 h-8"
              />
            </div>
            <div>
              <Input
                type="date"
                name="advDate"
                value={formData.advDate}
                onChange={handleChange}
                className="h-8 mt-auto"
              />
            </div>
          </div>
          
          <div className="text-right text-xs text-red-600 font-medium mt-1">
            SCHEME DISCOUNT (IF ANY)
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactLensPayment;
