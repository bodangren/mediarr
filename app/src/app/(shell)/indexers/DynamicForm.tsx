'use client';

import { useForm } from 'react-hook-form';

export interface FieldDefinition {
  name: string;
  type: string;
  label: string;
  default?: any;
  required?: boolean;
}

export interface DynamicFormProps {
  schema: FieldDefinition[];
  initialData?: any;
  onSubmit: (data: any) => void;
  submitLabel?: string;
}

export function DynamicForm({ schema, initialData, onSubmit, submitLabel = 'Save' }: DynamicFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initialData || {}
  });

  const handleFormSubmit = (data: any) => {
    const filteredData: any = {};
    schema.forEach(field => {
      filteredData[field.name] = data[field.name];
    });
    onSubmit(filteredData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {schema.map(field => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium mb-1">
            {field.label}
          </label>
          
          {field.type === 'boolean' ? (
             <input type="checkbox" id={field.name} {...register(field.name)} className="h-4 w-4" />
          ) : (
             <input 
                type={field.type === 'password' ? 'password' : 'text'} 
                id={field.name} 
                {...register(field.name, { required: field.required })}
                className="w-full border p-2 rounded"
             />
          )}
          {errors[field.name] && <span role="alert" className="text-status-error text-xs mt-1 block">This field is required</span>}
        </div>
      ))}
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{submitLabel}</button>
    </form>
  );
}
