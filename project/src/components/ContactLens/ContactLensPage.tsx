import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import RadioGroup from '../ui/RadioGroup';
import Button from '../ui/Button';
import { getTodayDate } from '../../utils/helpers';
import ContactLensPersonalInfo from './ContactLensPersonalInfo';
import ContactLensPrescriptionSection from './ContactLensPrescriptionSection';
import ContactLensManualForm from './ContactLensManualForm';
import ContactLensItemTable from './ContactLensItemTable';
import ContactLensOrderStatus from './ContactLensOrderStatus';
import ContactLensPayment from './ContactLensPayment';
import { ContactLensFormData, ContactLensItem } from './ContactLensTypes';
import ToastNotification from '../ui/ToastNotification';



const initialContactLensForm: ContactLensFormData = {
  clNo: '',
  refNo: '',
  date: getTodayDate(),
  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  dvDate: getTodayDate(),
  dvTime: '18:30:00',
  class: '',
  bookingBy: '',
  title: 'Mr.',
  name: '',
  gender: 'Male',
  age: '',
  address: '',
  city: '',
  state: '',
  pin: '',
  phoneLandline: '',
  mobile: '',
  email: '',
  customerCode: '',
  birthDay: '',
  marriageAnniversary: '',
  prescBy: '',
  billed: false,
  billNumber: '',
  rightEye: {
    dv: {
      sph: '',
      cyl: '',
      ax: '',
      add: '',
      vn: '6/'
    },
    nv: {
      sph: '',
      cyl: '',
      ax: '',
      add: '',
      vn: '6/'
    }
  },
  leftEye: {
    dv: {
      sph: '',
      cyl: '',
      ax: '',
      add: '',
      vn: '6/'
    },
    nv: {
      sph: '',
      cyl: '',
      ax: '',
      add: '',
      vn: '6/'
    }
  },
  ipd: '',
  balanceLens: false,
  contactLensItems: [],
  remarks: '',
  orderStatus: 'Processing',
  orderStatusDate: getTodayDate(),
  retestAfter: getTodayDate(),
  expiryDate: getTodayDate(),
  payment: '0.00',
  estimate: '0.00',
  schAmt: '0.00',
  advance: '0.00',
  balance: '0.00',
  cashAdv: '0.00',
  ccUpiAdv: '0.00',
  chequeAdv: '0.00',
  cashAdv2: '0.00',
  advDate: getTodayDate(),
  paymentMethod: 'Cash',
};

const ContactLensPage: React.FC = () => {
  const [formData, setFormData] = useState<ContactLensFormData>(initialContactLensForm);
  const [showManualForm, setShowManualForm] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    // Extract name and value, but don't destructure to avoid issues with undefined
    const name = e.target?.name;
    const value = e.target?.value;
    
    // Log issues but continue processing to avoid UI breaks
    if (!name) {
      console.error('Event target name is undefined:', e);
    }
    
    setFormData((prevState) => {
      // Return unchanged state if name is undefined
      if (!name) return prevState;
      
      // Handle nested properties using dot notation (e.g., "rightEye.dv.sph")
      if (name.includes('.')) {
        try {
          const keys = name.split('.');
          const obj = { ...prevState };
          
          let current: any = obj;
          for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
              // Initialize missing objects in the path
              current[keys[i]] = {};
            }
            current = current[keys[i]];
          }
          
          current[keys[keys.length - 1]] = value;
          return obj;
        } catch (error) {
          console.error('Error updating nested state:', error);
          return prevState; // Return unchanged state on error
        }
      }
      
      return { ...prevState, [name]: value };
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Skip processing if name is undefined (though it should be present here)
    if (!name) {
      console.error('Input name is undefined in handleNumericInputChange');
      return;
    }
    
    let processedValue = value;

    // For RPD and LPD fields, allow direct input without formatting
    if (name.includes('rpd') || name.includes('lpd')) {
      processedValue = value;
    } else if (name.includes('ax')) {
      // For axial, ensure integer between 0-180
      processedValue = value.replace(/[^0-9]/g, '');
      const numValue = parseInt(processedValue, 10);
      if (!isNaN(numValue)) {
         if (numValue > 180) {
           processedValue = '180';
         } else if (numValue < 0) { // Ensure non-negative, though regex handles non-digits
            processedValue = '0';
         }
      } else {
        processedValue = ''; // Clear if not a valid number after cleaning
      }
    } else { // Existing logic for other numeric fields
      // Allow only numbers, decimal point, and negative sign
      processedValue = value.replace(/[^0-9.-]/g, '');
    }
    
    // Create a properly structured synthetic event with explicitly set name and formatted value
    const syntheticEvent = {
      ...e,
      target: {
        // Copy necessary properties from original target
        ...e.target,
        name: name,  // Explicitly set the original name
        value: processedValue, // Use the processed value
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    // Call the main handleChange with the properly structured synthetic event
    handleChange(syntheticEvent);
  };

  const calculateTotal = (items: ContactLensItem[], currentAdvance: string) => {
    const originalTotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const discountedTotal = items.reduce((sum, item) => {
      // Assuming item.amount is already updated with discount by handleApplyDiscount
      return sum + item.amount;
    }, 0);

    const advanceTotal = parseFloat(currentAdvance || '0');

    // Assuming Sch Amt shows the discount amount
    const schemeAmount = originalTotal - discountedTotal;
    const finalBalance = discountedTotal - advanceTotal;
    
    setFormData(prev => ({
      ...prev,
      estimate: originalTotal.toFixed(2), // Original total before discount
      schAmt: schemeAmount.toFixed(2),   // Calculated discount amount
      payment: discountedTotal.toFixed(2), // Final total after discount
      balance: finalBalance.toFixed(2)
    }));
  };

  const handleApplyDiscount = () => {
    const discount = parseFloat(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      // Replace alert with showing error notification
      setNotification({ message: 'Please enter a valid discount percentage between 0 and 100.', type: 'error', visible: true });
      return;
    }

    const updatedItems = formData.contactLensItems.map(item => ({
      ...item,
      amount: item.qty * item.rate * (1 - discount / 100) // Update item amount with discount
    }));

    setFormData(prev => ({
      ...prev,
      contactLensItems: updatedItems
    }));
    // Recalculate total using the updated items and current advance
    calculateTotal(updatedItems, formData.advance);

    // Add success notification
    setNotification({ message: 'Discount applied successfully!', type: 'success', visible: true });
  };

  // Update balance when advance or payment changes
  useEffect(() => {
    const cash = parseFloat(formData.cashAdv || '0');
    const ccUpi = parseFloat(formData.ccUpiAdv || '0');
    const cheque = parseFloat(formData.chequeAdv || '0');
    
    // This calculatedAdvanceTotal is only for reference or potential display elsewhere.
    // The actual advance used for balance calculation is formData.advance.
    // const calculatedAdvanceTotal = cash + ccUpi + cheque;
    
    const currentDiscountedTotal = parseFloat(formData.payment || '0');
    const currentAdvance = parseFloat(formData.advance || '0');
    
    const finalBalance = currentDiscountedTotal - currentAdvance;
    
    setFormData(prev => ({
        ...prev,
        // We no longer force formData.advance to be the sum of the other three here.
        // handleNumericInputChange handles updating formData.advance when typed into.
        balance: finalBalance.toFixed(2)
    }));
    
  }, [formData.cashAdv, formData.ccUpiAdv, formData.chequeAdv, formData.payment, formData.advance]); // Added formData.advance as a dependency

  // Effect to calculate IPD from RPD and LPD
  useEffect(() => {
    const rpd = formData.rightEye.dv.rpd;
    const lpd = formData.leftEye.dv.lpd;
    
    if (rpd && lpd) {
      const rpdValue = parseFloat(rpd);
      const lpdValue = parseFloat(lpd);
      
      if (!isNaN(rpdValue) && !isNaN(lpdValue)) {
        const calculatedIPD = (rpdValue + lpdValue).toFixed(1);
        setFormData(prev => ({
          ...prev,
          ipd: calculatedIPD
        }));
      }
    } else if (!rpd && !lpd) {
         setFormData(prev => ({
          ...prev,
          ipd: '' // Clear IPD if both RPD and LPD are empty
        }));
    }
  }, [formData.rightEye.dv.rpd, formData.leftEye.dv.lpd, setFormData]);

  const handleAddContactLens = (item: ContactLensItem) => {
    const newItems = [...formData.contactLensItems, {
      ...item, 
      si: formData.contactLensItems.length + 1,
      amount: item.qty * item.rate // Initial amount before discount
    }];
    
    setFormData(prev => ({
      ...prev,
      contactLensItems: newItems
    }));
    
    setShowManualForm(false);
    // Recalculate total after adding item (before discount is applied)
    calculateTotal(newItems, formData.advance);
  };

  return (
    <div className="p-4">
      <Card>
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h1 className="text-xl font-bold">Contact Lens</h1>
          <div className="flex space-x-2">
            <button className="text-blue-600 hover:underline">&lt;&lt; First</button>
            <button className="text-blue-600 hover:underline">&lt; Prev</button>
            <button className="text-blue-600 hover:underline">Next &gt;</button>
            <button className="text-blue-600 hover:underline">Last &gt;&gt;</button>
            <button className="ml-8 text-blue-600 hover:underline">&lt;&lt; Display Prescription History &gt;&gt;</button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="CL No."
                name="clNo"
                value={formData.clNo}
                onChange={handleChange}
              />
              <Input
                label="Ref No."
                name="refNo"
                value={formData.refNo}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Input
                  type="datetime-local"
                  label="Date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Input
                  type="time"
                  label="Time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Input
                  type="datetime-local"
                  label="Dlv. Date"
                  name="dvDate"
                  value={formData.dvDate}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Input
                  type="time"
                  label="Dlv. Time"
                  name="dvTime"
                  value={formData.dvTime}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Select
                label="Class"
                name="class"
                value={formData.class}
                onChange={handleChange}
                options={[
                  { label: 'Select Class', value: '' },
                  { label: 'Class 1', value: 'Class 1' },
                  { label: 'Class 2', value: 'Class 2' }
                ]}
              />
              <Select
                label="Booking By"
                name="bookingBy"
                value={formData.bookingBy}
                onChange={handleChange}
                options={[
                  { label: 'Select Booking By', value: '' },
                  { label: 'Staff 1', value: 'Staff 1' },
                  { label: 'Staff 2', value: 'Staff 2' }
                ]}
              />
            </div>
            
            {/* Eye Prescription Section */}
            <ContactLensPrescriptionSection 
              formData={formData}
              handleChange={handleChange}
              handleNumericInputChange={handleNumericInputChange}
              handleCheckboxChange={handleCheckboxChange}
            />
          </div>
          
          {/* Right Column - Personal Information */}
          <ContactLensPersonalInfo
            formData={formData}
            handleChange={handleChange}
            handleCheckboxChange={handleCheckboxChange}
          />
        </div>
        
        {/* Contact Lens Details Table */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium">Selected Contact Lens Details</h2>
            <button 
              onClick={() => setShowManualForm(true)}
              className="text-blue-600 hover:underline"
            >
              &lt;&lt; Add Contact Lens Manually &gt;&gt;
            </button>
          </div>
          
          <ContactLensItemTable 
            items={formData.contactLensItems}
            setItems={(items) => {
              setFormData({ ...formData, contactLensItems: items });
              calculateTotal(items, formData.advance);
            }}
          />
        </div>
        
        {/* Bottom Section */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* Remarks and Order Status */}
          <ContactLensOrderStatus
            formData={formData}
            handleChange={handleChange}
          />
          
          {/* Payment Section */}
          <ContactLensPayment
            formData={formData}
            handleChange={handleChange}
            handleNumericInputChange={handleNumericInputChange}
            discountPercentage={discountPercentage}
            setDiscountPercentage={setDiscountPercentage}
            handleApplyDiscount={handleApplyDiscount}
          />
        </div>
        
        {/* Bottom Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <Button>&lt;&lt; Add Contact Lenses &gt;&gt;</Button>
          <Button>&lt;&lt; Edit/Search Contact Lenses &gt;&gt;</Button>
          <Button>&lt;&lt; Print Contact Lenses &gt;&gt;</Button>
          <Button>&lt;&lt; Clear All &gt;&gt;</Button>
          <Button>&lt;&lt; Exit &gt;&gt;</Button>
        </div>
      </Card>
      
      {/* Render the Toast Notification */}
      {notification.visible && (
        <ToastNotification 
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, visible: false })}
        />
      )}
      
      {/* Manual Entry Form Popup */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <ContactLensManualForm 
            onAdd={handleAddContactLens}
            onClose={() => setShowManualForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ContactLensPage;
