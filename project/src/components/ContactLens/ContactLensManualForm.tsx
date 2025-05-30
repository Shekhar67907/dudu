import React, { useState } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { ContactLensItem } from './ContactLensTypes';

interface ContactLensManualFormProps {
  onAdd: (item: ContactLensItem) => void;
  onClose: () => void;
}

const ContactLensManualForm: React.FC<ContactLensManualFormProps> = ({ onAdd, onClose }) => {
  const [formData, setFormData] = useState<Omit<ContactLensItem, 'si' | 'amount'>>({
    bc: '',
    power: '',
    material: '',
    dispose: '',
    brand: '',
    qty: 1,
    diameter: '',
    rate: 0,
    lensCode: '',
    side: '',
    sph: '',
    cyl: '',
    ax: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/[^0-9.-]/g, '');
    
    if (name === 'qty' || name === 'rate') {
      setFormData({ 
        ...formData, 
        [name]: numericValue === '' ? 0 : parseFloat(numericValue) 
      });
    } else {
      setFormData({ ...formData, [name]: numericValue });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.qty * formData.rate;
    onAdd({ ...formData, si: 0, amount }); // si will be assigned by parent
    onClose();
  };

  const materialOptions = [
    { label: 'Select Material', value: '' },
    { label: 'Silicone Hydrogel', value: 'Silicone Hydrogel' },
    { label: 'Hydrogel', value: 'Hydrogel' },
    { label: 'RGP', value: 'RGP' },
    { label: 'PMMA', value: 'PMMA' },
    { label: 'Hybrid', value: 'Hybrid' }
  ];

  const disposeOptions = [
    { label: 'Select Dispose', value: '' },
    { label: 'Daily', value: 'Daily' },
    { label: 'Two Weekly', value: 'Two Weekly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Quarterly', value: 'Quarterly' },
    { label: 'Yearly', value: 'Yearly' }
  ];

  const brandOptions = [
    { label: 'Select Brand', value: '' },
    { label: 'Acuvue', value: 'Acuvue' },
    { label: 'Air Optix', value: 'Air Optix' },
    { label: 'Biomedics', value: 'Biomedics' },
    { label: 'Bausch & Lomb', value: 'Bausch & Lomb' },
    { label: 'Cooper Vision', value: 'Cooper Vision' }
  ];

  const sideOptions = [
    { label: 'Select Side', value: '' },
    { label: 'Right', value: 'Right' },
    { label: 'Left', value: 'Left' }
  ];

  return (
    <div className="bg-yellow-50 border rounded-lg shadow-lg p-4 w-3/4 max-w-3xl">
      <h3 className="text-xl font-bold mb-4 text-center">Add Contact Lens Manually</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <Input 
              label="B/C"
              name="bc"
              value={formData.bc}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Power"
              name="power"
              value={formData.power}
              onChange={handleNumericChange}
              required
            />
          </div>
          
          <div>
            <Select 
              label="Material"
              name="material"
              value={formData.material}
              onChange={handleChange as any}
              options={materialOptions}
              required
            />
          </div>
          
          <div>
            <Select 
              label="Dispose"
              name="dispose"
              value={formData.dispose}
              onChange={handleChange as any}
              options={disposeOptions}
              required
            />
          </div>
          
          <div>
            <Select 
              label="Brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange as any}
              options={brandOptions}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Qty"
              name="qty"
              type="number"
              min="1"
              value={formData.qty.toString()}
              onChange={handleNumericChange}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Diameter"
              name="diameter"
              value={formData.diameter}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Rate"
              name="rate"
              type="number"
              min="0"
              step="0.01"
              value={formData.rate.toString()}
              onChange={handleNumericChange}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Amount"
              value={(formData.qty * formData.rate).toFixed(2)}
              readOnly
              disabled
            />
          </div>
          
          <div>
            <Input 
              label="Lens Code"
              name="lensCode"
              value={formData.lensCode}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Select 
              label="Side"
              name="side"
              value={formData.side}
              onChange={handleChange as any}
              options={sideOptions}
              required
            />
          </div>
          
          <div>
            <Input 
              label="Sph"
              name="sph"
              value={formData.sph}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Input 
              label="Cyl"
              name="cyl"
              value={formData.cyl}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <Input 
              label="Ax"
              name="ax"
              value={formData.ax}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="flex justify-center mt-4 space-x-4">
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
            Add Contact Lenses
          </Button>
          <Button 
            type="button" 
            onClick={onClose} 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800"
          >
            Close
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContactLensManualForm;
