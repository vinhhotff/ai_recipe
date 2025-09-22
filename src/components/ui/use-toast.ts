import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const toast = ({ title, description, variant }: ToastProps) => {
  const message = title && description ? `${title}: ${description}` : title || description || '';
  
  if (variant === 'destructive') {
    sonnerToast.error(message);
  } else {
    sonnerToast.success(message);
  }
};

export { toast as useToast };
