import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { ApiStatus, checkApiStatus } from '../utils/apiStatus';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiStatusModal({ isOpen, onClose }: ApiStatusModalProps) {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckApis = async () => {
    setIsChecking(true);
    try {
      const results = await checkApiStatus();
      setApiStatuses(results);
    } catch (error) {
      console.error('Failed to check API status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'accessible':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'rate-limited':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'auth-required':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ApiStatus['status']) => {
    switch (status) {
      case 'accessible':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'rate-limited':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'auth-required':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">API Status Check</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Check the connectivity status of external APIs used for token data.
          </p>

          <button
            onClick={handleCheckApis}
            disabled={isChecking}
            className="w-full mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isChecking ? 'Checking APIs...' : 'Check API Status'}
          </button>

          {/* Results */}
          {apiStatuses.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Results:</h3>
              {apiStatuses.map((api) => (
                <div
                  key={api.name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(api.status)}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(api.status)}
                    <span className="font-medium">{api.name}</span>
                  </div>
                  <span className="text-sm">{api.message}</span>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> If APIs show as failed, try using a VPN or different network. 
                  Some corporate firewalls block these endpoints.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 