import React from 'react';

const CustomDialog = ({ isOpen, onClose, onConfirm, onCancel, title, message, type = 'info', confirmText, cancelText, confirmDisabled, children }) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          confirmButtonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          cancelButtonColor: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      case 'danger':
      case 'error':
        return {
          icon: (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ),
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          cancelButtonColor: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      case 'warning':
        return {
          icon: (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ),
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          cancelButtonColor: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
      default:
        return {
          icon: (
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ),
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          cancelButtonColor: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        };
    }
  };

  const { icon, bgColor, textColor, confirmButtonColor, cancelButtonColor } = getIconAndColor();

  // Determine if this is a confirmation dialog (has onConfirm) or a simple info dialog
  const isConfirmDialog = !!onConfirm;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={handleCancel}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
          <div>
            {icon}
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <div className="mt-2">
                <p className={`text-sm ${textColor}`}>
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Render children (custom form elements like dropdowns, checkboxes, etc.) */}
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}

          <div className={`mt-5 sm:mt-6 ${isConfirmDialog ? 'flex gap-3' : ''}`}>
            {isConfirmDialog ? (
              <>
                <button
                  type="button"
                  className={`flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${cancelButtonColor} text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  onClick={handleCancel}
                >
                  {cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={confirmDisabled}
                  className={`flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${confirmButtonColor} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm ${confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={onConfirm}
                >
                  {confirmText || 'Confirm'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 ${confirmButtonColor} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                onClick={handleCancel}
              >
                {cancelText || 'Close'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomDialog;
