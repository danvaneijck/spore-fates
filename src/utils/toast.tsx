import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import { NETWORK_CONFIG } from '../config';

export const showTransactionToast = {
  loading: (message: string = 'Processing transaction...') => {
    return toast.loading(message);
  },

  success: (txHash: string, message: string = 'Transaction successful!') => {
    const explorerUrl = `${NETWORK_CONFIG.explorerUrl}/${txHash}`;
    
    toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <div className="font-semibold">{message}</div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            <span>View on Explorer</span>
            <ExternalLink size={14} />
          </a>
        </div>
      ),
      {
        duration: 6000,
      }
    );
  },

  error: (message: string = 'Transaction failed') => {
    toast.error(message);
  },

  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },
};
