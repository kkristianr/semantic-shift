/**
 * Button Showcase Component - Demonstrates all button variants and features
 * This component can be used for testing and as a reference
 */
import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { Upload, Download, Settings, Trash2, Check, AlertTriangle } from 'lucide-react';

const ButtonShowcase = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="w-full p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">UI Components Showcase</h2>
        <p className="text-gray-600">Demonstration of the new button styles: outline (default) and 3D effects.</p>
      </div>

      {/* Button Styles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Button Styles</h3>
        
        {/* Outline Style */}
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-800">Outline Style (Default)</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="primary" buttonStyle="outline">Primary</Button>
            <Button variant="secondary" buttonStyle="outline">Secondary</Button>
            <Button variant="danger" buttonStyle="outline">Danger</Button>
            <Button variant="success" buttonStyle="outline">Success</Button>
            <Button variant="warning" buttonStyle="outline">Warning</Button>
            <Button variant="ghost" buttonStyle="outline">Ghost</Button>
          </div>
        </div>

        {/* 3D Style */}
        <div className="space-y-2">
          <h4 className="text-md font-medium text-gray-800">3D Style</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="primary" buttonStyle="3d">Primary</Button>
            <Button variant="secondary" buttonStyle="3d">Secondary</Button>
            <Button variant="danger" buttonStyle="3d">Danger</Button>
            <Button variant="success" buttonStyle="3d">Success</Button>
            <Button variant="warning" buttonStyle="3d">Warning</Button>
            <Button variant="ghost" buttonStyle="3d">Ghost</Button>
          </div>
        </div>
      </div>

      {/* Button Sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Button Sizes</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button size="sm" buttonStyle="outline">Small</Button>
          <Button size="md" buttonStyle="outline">Medium</Button>
          <Button size="lg" buttonStyle="outline">Large</Button>
          <Button size="xl" buttonStyle="outline">Extra Large</Button>
        </div>
      </div>

      {/* Button with Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Buttons with Icons</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button leftIcon={<Upload className="w-3 h-3" />} size="sm">
            Upload File
          </Button>
          <Button rightIcon={<Download className="w-3 h-3" />} variant="secondary" size="sm">
            Download
          </Button>
          <Button leftIcon={<Settings className="w-3 h-3" />} variant="ghost" size="sm">
            Settings
          </Button>
          <Button leftIcon={<Trash2 className="w-3 h-3" />} variant="danger" size="sm">
            Delete
          </Button>
        </div>
        <p className="text-sm text-gray-500">Icons are smaller to match the reduced button sizes</p>
      </div>

      {/* Loading States */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Loading States</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button isLoading size="sm">Loading...</Button>
          <Button isLoading variant="success" leftIcon={<Check className="w-3 h-3" />} size="sm">
            Processing
          </Button>
          <Button 
            onClick={handleLoadingDemo}
            isLoading={isLoading}
            variant="warning"
            leftIcon={<AlertTriangle className="w-3 h-3" />}
            size="sm"
          >
            {isLoading ? 'Processing...' : 'Start Process'}
          </Button>
        </div>
      </div>

      {/* Disabled States */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Disabled States</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <Button disabled size="sm">Disabled Primary</Button>
          <Button disabled variant="danger" size="sm">Disabled Danger</Button>
          <Button disabled variant="ghost" size="sm">Disabled Ghost</Button>
        </div>
      </div>

      {/* Full Width */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Full Width Buttons</h3>
        <div className="space-y-2">
          <Button fullWidth variant="primary" size="sm">Full Width Primary</Button>
          <Button fullWidth variant="secondary" size="sm">Full Width Secondary</Button>
        </div>
      </div>

      {/* Input Components */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Input Components</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Basic Input"
            placeholder="Enter some text..."
          />
          <Input 
            label="Input with Helper Text"
            placeholder="Enter some text..."
            helperText="This is helper text"
          />
          <Input 
            label="Input with Error"
            placeholder="Enter some text..."
            error="This field is required"
          />
          <Input 
            label="Input with Left Icon"
            placeholder="Search..."
            leftIcon={<Settings className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Select Components */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Select Components</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Basic Select"
            placeholder="Choose an option..."
          >
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </Select>
          <Select 
            label="Select with Helper Text"
            placeholder="Choose an option..."
            helperText="Select your preferred option"
          >
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </Select>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Common Usage Patterns</h3>
        <div className="space-y-4">
          {/* Form Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Form Actions</h4>
            <div className="flex gap-3">
              <Button variant="primary" size="sm">Save Changes</Button>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button variant="danger" size="sm">Delete</Button>
            </div>
          </div>

          {/* Card Actions */}
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Card Actions</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Some content here...</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost">Edit</Button>
                <Button size="sm" variant="danger">Remove</Button>
              </div>
            </div>
          </div>

          {/* Loading States in Context */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Loading States</h4>
            <div className="flex gap-3">
              <Button isLoading variant="primary" size="sm">Processing...</Button>
              <Button disabled variant="secondary" size="sm">Waiting...</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ButtonShowcase;
