import React, { useState, useEffect } from 'react';
import { contactLensService } from '../../Services/contactLensService';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
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
import ContactLensSearch from './ContactLensSearch';
// No direct imports from src folder to avoid path issues


// Generate prescription number on component initialization to avoid regenerating it on rerenders
const generatedPrescriptionNo = contactLensService.generateContactLensPrescriptionNo();

const initialContactLensForm: ContactLensFormData = {
  prescriptionNo: generatedPrescriptionNo,
  reference_no: generatedPrescriptionNo, // Set reference number equal to prescription number by default
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
  const [isSaving, setIsSaving] = useState(false);
  const [showSearchSection, setShowSearchSection] = useState<boolean>(true);
  
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
    setFormData(prevState => {
      const updatedItems = [...prevState.contactLensItems, item];
      return {
        ...prevState,
        contactLensItems: updatedItems
      };
    });
    
      
  // Close the manual form
  setShowManualForm(false);
};

// Function to handle patient selection from search results
const handlePatientSelect = (patientData: any) => {
  try {
    // Log values from database to help debugging
    console.log('DEBUG - Database Values:', {
      prescribed_by: patientData.prescription.prescribed_by,
      class: patientData.prescription.class,
      date: patientData.prescription.date,
      delivery_date: patientData.prescription.delivery_date
    });
    
    // Show a notification that data is being loaded
    setNotification({
      message: 'Loading patient data...',
      type: 'success',
      visible: true
    });
        
    // Create a new form data object based on the patient data
    const newFormData: ContactLensFormData = {
      ...initialContactLensForm,
          
      // Set the prescription fields
      prescriptionNo: patientData.prescription.prescription_no || '',
      reference_no: patientData.prescription.reference_no || patientData.prescription.ref_no || '',
      name: patientData.prescription.name || '',
      gender: patientData.prescription.gender || 'Male',
          
      // Fix for Age field
      age: patientData.prescription.age || '',
          
      address: patientData.prescription.address || '',
      city: patientData.prescription.city || '',
      state: patientData.prescription.state || '',
          
      // Fix for PIN field
      pin: patientData.prescription.pin || '',
          
      // Fix for Phone Landline field
      phoneLandline: patientData.prescription.phone_landline || '',
          
      mobile: patientData.prescription.mobile_no || patientData.prescription.mobile || '',
      email: patientData.prescription.email || '',
      remarks: patientData.prescription.remarks || '',
          
      // Fix for Birth Day field
      birthDay: patientData.prescription.birth_day || '',
          
      // Fix for Marriage Anniversary field
      marriageAnniversary: patientData.prescription.marriage_anniversary || '',
          
      // Fix for Customer Code field
      customerCode: patientData.prescription.customer_code || '',
          
      // Fix for Prescribed By field - ensure correct mapping from database to form field
      prescBy: patientData.prescription.prescribed_by || '',
          
      // Fix for Class field - ensure correct mapping from database to form field
      class: patientData.prescription.class || '',
             
      // Add debug logging outside the form data object
      /* Debug logging */
      // Console log right before this to track values in debug console
      // console.log('Debug - Class:', patientData.prescription.class, 'Prescribed By:', patientData.prescription.prescribed_by);
      
      // Keep existing Booking By functionality
      bookingBy: patientData.contactLensData?.booked_by || 
                patientData.prescription.booked_by || 
                '',
      
      // Keep existing Order Status functionality
      orderStatus: patientData.contactLensData?.status || 'Processing',
      
      // Fix for Date field - directly accessing from prescription.date and formatting as ISO datetime
      date: patientData.prescription.date ? 
            patientData.prescription.date + 'T00:00' : 
            getTodayDate() + 'T00:00',
      
      // Fix for Delivery Date field - directly accessing from prescription.delivery_date and formatting as ISO datetime
      dvDate: patientData.prescription.delivery_date ? 
              patientData.prescription.delivery_date + 'T00:00' : 
              getTodayDate() + 'T00:00',
      dvTime: patientData.prescription.delivery_time || '18:30:00',
      retestAfter: patientData.prescription.retest_date || getTodayDate(),
      expiryDate: patientData.prescription.expiry_date || getTodayDate(),
      };
          
      // If we have eye data, map it to the form structure
      if (patientData.eyes && patientData.eyes.length > 0) {
        // Process right eye data
        const rightEyeData = patientData.eyes.find((eye: any) => eye.eye_side === 'Right');
        if (rightEyeData) {
          newFormData.rightEye = {
            dv: {
              sph: rightEyeData.sph || '',
              cyl: rightEyeData.cyl || '',
              ax: rightEyeData.axis || '',
              add: rightEyeData.add_power || '',
              vn: rightEyeData.vn || '6/',
              rpd: rightEyeData.rpd || ''
            },
            nv: {
              sph: rightEyeData.sph || '',
              cyl: rightEyeData.cyl || '',
              ax: rightEyeData.axis || '',
              add: rightEyeData.add_power || '',
              vn: rightEyeData.vn || '6/',
              rpd: rightEyeData.rpd || ''
            }
          };
        }
        
        // Process left eye data
        const leftEyeData = patientData.eyes.find((eye: any) => eye.eye_side === 'Left');
        if (leftEyeData) {
          newFormData.leftEye = {
            dv: {
              sph: leftEyeData.sph || '',
              cyl: leftEyeData.cyl || '',
              ax: leftEyeData.axis || '',
              add: leftEyeData.add_power || '',
              vn: leftEyeData.vn || '6/',
              lpd: leftEyeData.lpd || ''
            },
            nv: {
              sph: leftEyeData.sph || '',
              cyl: leftEyeData.cyl || '',
              ax: leftEyeData.axis || '',
              add: leftEyeData.add_power || '',
              vn: leftEyeData.vn || '6/',
              lpd: leftEyeData.lpd || ''
            }
          };
        }
        
        // Set IPD by combining RPD and LPD if available
        if (rightEyeData?.rpd && leftEyeData?.lpd) {
          try {
            const rpd = parseFloat(rightEyeData.rpd) || 0;
            const lpd = parseFloat(leftEyeData.lpd) || 0;
            if (rpd > 0 && lpd > 0) {
              const ipd = (rpd + lpd).toFixed(1);
              newFormData.ipd = ipd;
            }
          } catch (e) {
            console.error('Error calculating IPD:', e);
          }
        }
      }
      
      // If we have contact lens items, add them to the form
      if (patientData.items && patientData.items.length > 0) {
        const mappedItems = patientData.items.map((item: any, index: number) => ({
          si: index + 1,
          side: item.eye_side === 'Right' ? 'RE' : (item.eye_side === 'Left' ? 'LE' : 'Both'),
          bc: item.base_curve || '',            // BC (base curve)
          power: item.power || '',              // Power
          material: item.material_text || '',    // Material
          dispose: item.disposal_text || '',     // Dispose method
          brand: item.brand_text || '',          // Brand
          diameter: item.diameter || '',         // Diameter
          qty: item.quantity || 1,              // Quantity
          rate: item.rate || 0,                 // Rate
          amount: (item.quantity || 1) * (item.rate || 0), // Amount
          sph: item.sph || '',                  // SPH
          cyl: item.cyl || '',                  // CYL
          ax: item.axis || '',                  // Axis
          lensCode: item.lens_code || ''        // Lens code
        }));
        
        newFormData.contactLensItems = mappedItems;
      }
      
      // If we have payment data, map it to the form
      if (patientData.payment) {
        // Map payment fields from database to UI
        
        // For the UI's Total field, use payment_total if available, otherwise fallback to estimate
        newFormData.payment = patientData.payment.payment_total?.toString() || 
                              patientData.payment.estimate?.toString() || '0.00';
        
        // Other payment fields
        newFormData.estimate = patientData.payment.estimate?.toString() || '0.00';
        newFormData.schAmt = patientData.payment.discount_amount?.toString() || '0.00';
        newFormData.advance = patientData.payment.advance?.toString() || '0.00';
        
        // Balance is calculated in the database
        newFormData.balance = patientData.payment.balance?.toString() || '0.00';
        
        // Individual advance fields
        newFormData.cashAdv = patientData.payment.cash_advance?.toString() || '0.00';
        newFormData.cashAdv2 = '0.00'; // This field isn't in the database, but exists in UI
        newFormData.ccUpiAdv = patientData.payment.card_upi_advance?.toString() || '0.00';
        newFormData.chequeAdv = patientData.payment.cheque_advance?.toString() || '0.00';
        
        // Payment method and date
        newFormData.paymentMethod = patientData.payment.payment_mode || 'Cash';
        newFormData.advDate = patientData.payment.payment_date || getTodayDate();
      }
      
      // Update the form with the new data
      setFormData(newFormData);
      
      // Hide the search section to give more focus to the populated form
      setShowSearchSection(false);
      
      // Show success notification
      setNotification({
        message: 'Patient data loaded successfully!',
        type: 'success',
        visible: true
      });
      
    } catch (error) {
      console.error('Error mapping patient data to form:', error);
      setNotification({
        message: 'Error loading patient data',
        type: 'error',
        visible: true
      });
    }
  };  

  return (
    <div className="p-4">
      <Card>
        <div className="border-b pb-2 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">Contact Lens</h1>
            <div className="flex space-x-2">
              <button className="text-blue-600 hover:underline">&lt;&lt; First</button>
              <button className="text-blue-600 hover:underline">&lt; Prev</button>
              <button className="text-blue-600 hover:underline">Next &gt;</button>
              <button className="text-blue-600 hover:underline">Last &gt;&gt;</button>
              <button className="ml-8 text-blue-600 hover:underline">&lt;&lt; Display Prescription History &gt;&gt;</button>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">Contact Lens Card</h2>
          
          {/* Search Section */}
          {showSearchSection && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <ContactLensSearch onSelectPatient={handlePatientSelect} />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div>
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                label="Prescription No."
                name="prescriptionNo"
                value={formData.prescriptionNo}
                onChange={handleChange}
              />
              <Input
                label="Ref No."
                name="reference_no"
                value={formData.reference_no}
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
                  { label: 'Business', value: 'Business' },
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
        
        {/* SAVE DATA Button - Prominent Placement */}
        <div className="my-8 flex justify-center">
          <button 
            onClick={() => {
              console.log('SAVE DATA button clicked at ' + new Date().toISOString());
              
              // Basic validation
              if (!formData.prescriptionNo) {
                alert('❌ Prescription number is required');
                setNotification({
                  message: 'Prescription number is required',
                  type: 'error',
                  visible: true
                });
                return;
              }

              if (!formData.bookingBy) {
                alert('❌ Booking by is required');
                setNotification({
                  message: 'Booking by is required',
                  type: 'error',
                  visible: true
                });
                return;
              }

              if (formData.contactLensItems.length === 0) {
                alert('❌ Please add at least one contact lens item');
                setNotification({
                  message: 'Please add at least one contact lens item',
                  type: 'error',
                  visible: true
                });
                return;
              }
              
              // Set saving state
              setIsSaving(true);
              
              try {
                // Prepare data for saving
                // Map contact lens items from UI format to DB format
                const items = formData.contactLensItems.map(item => {
                  // Convert UI eye side values (RE/LE) to database values (Right/Left/Both)
                  let eyeSide: 'Right' | 'Left' | 'Both' = 'Both';
                  
                  // Use string comparison instead of strict equality
                  if (item.side && item.side.toString() === 'RE') {
                    eyeSide = 'Right';
                  } else if (item.side && item.side.toString() === 'LE') {
                    eyeSide = 'Left';
                  }
                  
                  return {
                    eye_side: eyeSide, // Convert from UI format (RE/LE) to DB format (Right/Left/Both)
                    base_curve: item.bc,
                    power: item.power,
                    material_text: item.material,
                    disposal_text: item.dispose,
                    brand_text: item.brand,
                    diameter: item.diameter,
                    quantity: item.qty,
                    rate: item.rate,
                    sph: item.sph,
                    cyl: item.cyl,
                    axis: item.ax,
                    lens_code: item.lensCode
                  };
                });

                // Map eye data for both eyes
                const eyes = [
                  // Right eye data
                  {
                    eye_side: 'Right',
                    sph: formData.rightEye.dv.sph,
                    cyl: formData.rightEye.dv.cyl,
                    axis: formData.rightEye.dv.ax,
                    add_power: formData.rightEye.dv.add,
                    vn: formData.rightEye.dv.vn,
                    rpd: formData.rightEye.dv.rpd // Add RPD for right eye
                  },
                  // Left eye data
                  {
                    eye_side: 'Left',
                    sph: formData.leftEye.dv.sph,
                    cyl: formData.leftEye.dv.cyl,
                    axis: formData.leftEye.dv.ax,
                    add_power: formData.leftEye.dv.add,
                    vn: formData.leftEye.dv.vn,
                    lpd: formData.leftEye.dv.lpd // Add LPD for left eye
                  }
                ];
                
                // Add IPD to the right eye record if available
                if (formData.ipd) {
                  // Use type assertion to add IPD to the first eye object
                  (eyes[0] as any).ipd = formData.ipd;
                }

                // Payment data - mapping UI fields to database fields
                const payment = {
                  // Store UI's Total field as payment_total
                  payment_total: parseFloat(formData.payment || '0'),
                  
                  // Database uses these fields to calculate balance automatically
                  estimate: parseFloat(formData.estimate || '0'),
                  advance: parseFloat(formData.advance || '0'),
                  
                  // Do NOT include balance - it's calculated by the database
                  // balance: parseFloat(formData.balance || '0'), // This would cause an error
                  
                  // Other fields
                  payment_mode: formData.paymentMethod || 'Cash',
                  cash_advance: parseFloat(formData.cashAdv || '0'),
                  card_upi_advance: parseFloat(formData.ccUpiAdv || '0'),
                  cheque_advance: parseFloat(formData.chequeAdv || '0'),
                  discount_amount: parseFloat(formData.schAmt || '0'),
                  discount_percent: parseFloat(discountPercentage || '0'),
                  scheme_discount: Boolean(formData.schAmt && parseFloat(formData.schAmt) > 0),
                  payment_date: formData.advDate || getTodayDate()
                };
                
                // Note: Balance will be calculated in the database as (estimate - advance)

                // Main prescription object
                const prescription = {
                  prescription_id: formData.prescriptionNo,
                  reference_no: formData.reference_no, // Add reference number
                  customer_code: formData.customerCode, // Add customer code
                  birth_day: formData.birthDay, // Add birth day
                  marriage_anniversary: formData.marriageAnniversary, // Add marriage anniversary
                  phone_landline: formData.phoneLandline, // Add phone landline
                  prescribed_by: formData.prescBy, // Add prescribed by
                  booked_by: formData.bookingBy,
                  delivery_date: formData.dvDate,
                  delivery_time: formData.dvTime,
                  status: formData.orderStatus || 'Processing',
                  retest_date: formData.retestAfter,
                  expiry_date: formData.expiryDate,
                  remarks: formData.remarks,
                  name: formData.name,
                  gender: formData.gender,
                  age: formData.age,
                  mobile: formData.mobile,
                  email: formData.email,
                  address: formData.address,
                  city: formData.city,
                  state: formData.state,
                  pin: formData.pin
                };
                
                console.log('Saving data to database using contactLensService:', { prescription, eyes, items, payment });
                
                // Use the contactLensService to save the data
                const contactLensData = {
                  prescription,
                  eyes,
                  items,
                  payment
                };
                
                // Call the service to save data
                contactLensService.saveContactLensPrescription(contactLensData)
                  .then(result => {
                    if (result.success) {
                      console.log('Contact lens data saved successfully!', result);
                      alert('✅ Contact lenses saved successfully!');
                      setNotification({
                        message: 'Contact lenses saved successfully to database!',
                        type: 'success',
                        visible: true
                      });
                      
                      // Update form data with new ID if returned
                      if (result.id) {
                        setFormData(prev => ({ ...prev, id: result.id }));
                      }
                    } else {
                      console.error('Failed to save contact lens data:', result.message);
                      alert('❌ Save failed: ' + (result.message || 'Unknown error'));
                      setNotification({
                        message: `Failed to save contact lens data: ${result.message || 'Unknown error'}`,
                        type: 'error',
                        visible: true
                      });
                    }
                  })
                  .catch(error => {
                    console.error('Error saving data:', error);
                    alert('❌ Error: ' + (error.message || 'Unknown error saving data'));
                    setNotification({
                      message: `Error saving contact lens data: ${error.message || 'Unknown error'}`,
                      type: 'error',
                      visible: true
                    });
                  })
                  .finally(() => {
                    setIsSaving(false);
                  });
              } catch (error) {
                console.error('Error preparing data:', error);
                alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error preparing data'));
                setNotification({
                  message: `Error preparing data: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  type: 'error',
                  visible: true
                });
                setIsSaving(false);
              }
            }}
            className={`bg-green-600 ${!isSaving ? 'hover:bg-green-700' : 'opacity-75 cursor-wait'} text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transform transition ${!isSaving ? 'hover:scale-105' : ''}`}
            style={{minWidth: '300px', border: '3px solid yellow'}}
            type="button"
            disabled={isSaving}
          >
            {isSaving ? '⏳ SAVING...' : '💾 SAVE DATA 💾'}
          </button>
        </div>
        
        {/* Bottom Buttons */}
        <div className="mt-6 flex justify-end space-x-4">
          <Button>&lt;&lt; Add Contact Lenses &gt;&gt;</Button>
          <Button 
            onClick={() => setShowSearchSection(!showSearchSection)}
          >
            {showSearchSection ? '« Hide Search »' : '« Show Search »'}
          </Button>
          <Button>&lt;&lt; Print Contact Lenses &gt;&gt;</Button>
          <Button 
            onClick={() => {
              if (confirm('Are you sure you want to clear all data?')) {
                setFormData(initialContactLensForm);
                setShowSearchSection(true);
              }
            }}
          >
            &lt;&lt; Clear All &gt;&gt;
          </Button>
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
