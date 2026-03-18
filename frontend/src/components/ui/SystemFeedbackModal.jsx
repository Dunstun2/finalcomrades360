import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from './dialog';
import { Button } from './button';
import { Check, AlertTriangle, AlertCircle } from 'lucide-react';

const SystemFeedbackModal = ({
    open,
    onOpenChange,
    type = 'success', // 'success' | 'error' | 'warning'
    title,
    description,
    onConfirm,
    confirmLabel = 'Done'
}) => {
    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Check className="h-10 w-10 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-10 w-10 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-10 w-10 text-orange-600" />;
            default:
                return <Check className="h-10 w-10 text-blue-600" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'success': return 'bg-green-100';
            case 'error': return 'bg-red-100';
            case 'warning': return 'bg-orange-100';
            default: return 'bg-blue-100';
        }
    };

    const getTitleColor = () => {
        switch (type) {
            case 'success': return 'text-green-700';
            case 'error': return 'text-red-700';
            case 'warning': return 'text-orange-700';
            default: return 'text-blue-700';
        }
    };

    const getButtonVariant = () => {
        if (type === 'error') return 'destructive';
        return 'default';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <div className="flex flex-col items-center text-center p-4">
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${getIconBg()} mb-6`}>
                        {getIcon()}
                    </div>
                    <DialogHeader className="w-full">
                        <DialogTitle className={`text-2xl font-bold ${getTitleColor()} text-center`}>
                            {title || (type === 'success' ? 'Success!' : 'System Alert')}
                        </DialogTitle>
                        <DialogDescription className="text-gray-600 mt-2 text-center">
                            {description}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <DialogFooter className="sm:justify-center border-t pt-4">
                    <Button
                        variant={getButtonVariant()}
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onOpenChange(false);
                        }}
                        className="px-8 min-w-[120px]"
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SystemFeedbackModal;
