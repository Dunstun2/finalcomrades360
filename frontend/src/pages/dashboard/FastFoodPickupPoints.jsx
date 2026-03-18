import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit, Trash2, MapPin, Phone, User,
    ChevronLeft, Loader2, CheckCircle2, AlertCircle, Power
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/use-toast';
import fastFoodPickupPointService from '../../services/fastFoodPickupPointService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const FastFoodPickupPoints = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [pickupPoints, setPickupPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactName: '',
        contactPhone: '',
        deliveryFee: '',
        isActive: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toggleLoadingId, setToggleLoadingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, pointId: null, pointName: '' });

    useEffect(() => {
        fetchPickupPoints();
    }, []);

    const fetchPickupPoints = async () => {
        try {
            setLoading(true);
            const response = await fastFoodPickupPointService.getAdminPickupPoints();
            setPickupPoints(response.data || []);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch pickup points'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (point) => {
        setEditingPoint(point);
        setFormData({
            name: point.name,
            address: point.address,
            contactName: point.contactName || '',
            contactPhone: point.contactPhone,
            deliveryFee: point.deliveryFee ?? '',
            isActive: point.isActive
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                deliveryFee: formData.deliveryFee === '' ? 0 : Number(formData.deliveryFee)
            };
            if (editingPoint) {
                await fastFoodPickupPointService.updatePickupPoint(editingPoint.id, payload);
                toast({ title: 'Success', description: 'Pickup point updated successfully' });
            } else {
                await fastFoodPickupPointService.createPickupPoint(payload);
                toast({ title: 'Success', description: 'Pickup point created successfully' });
            }
            setShowForm(false);
            setEditingPoint(null);
            setFormData({ name: '', address: '', contactName: '', contactPhone: '', deliveryFee: '', isActive: true });
            fetchPickupPoints();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to save pickup point'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await fastFoodPickupPointService.deletePickupPoint(deleteConfirm.pointId);
            toast({ title: 'Success', description: 'Pickup point deleted successfully' });
            setDeleteConfirm({ isOpen: false, pointId: null, pointName: '' });
            fetchPickupPoints();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to delete pickup point'
            });
        }
    };

    const handleToggleActive = async (point) => {
        try {
            setToggleLoadingId(point.id);
            await fastFoodPickupPointService.updatePickupPoint(point.id, { isActive: !point.isActive });
            toast({
                title: 'Success',
                description: point.isActive ? 'Pickup point deactivated' : 'Pickup point activated'
            });
            fetchPickupPoints();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update pickup point status'
            });
        } finally {
            setToggleLoadingId(null);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="rounded-full h-10 w-10 p-0 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pickup Points</h1>
                        <p className="text-gray-500 font-medium">Manage fast food collection locations</p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setEditingPoint(null);
                        setFormData({ name: '', address: '', contactName: '', contactPhone: '', deliveryFee: '', isActive: true });
                        setShowForm(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-200 transition-all hover:scale-105"
                >
                    <Plus className="mr-2 h-5 w-5" /> Add New Point
                </Button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-orange-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-bold animate-pulse">Loading pickup points...</p>
                </div>
            ) : pickupPoints.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <MapPin className="text-gray-300 h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No pickup points found</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mb-6">Start by adding your first fast food collection location.</p>
                    <Button
                        variant="outline"
                        onClick={() => setShowForm(true)}
                        className="border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                        Create Now
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pickupPoints.map((point) => (
                        <div
                            key={point.id}
                            className={`bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md hover:border-orange-200 overflow-hidden group ${!point.isActive && 'opacity-75 blur-[0.5px] grayscale-[0.5]'}`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                                        <MapPin className="text-orange-600 w-6 h-6" />
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                                        Actions
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-gray-900 mb-2">{point.name}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 text-gray-600">
                                        <MapPin size={16} className="mt-1 flex-shrink-0 text-gray-400" />
                                        <p className="text-sm font-medium line-clamp-2">{point.address}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <User size={16} className="flex-shrink-0 text-gray-400" />
                                        <p className="text-sm font-bold">{point.contactName || 'N/A'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <Phone size={16} className="flex-shrink-0 text-gray-400" />
                                        <p className="text-sm font-mono font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{point.contactPhone}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600">
                                        <span className="text-sm font-bold text-emerald-700">Delivery Fee:</span>
                                        <p className="text-sm font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                            KES {Number(point.deliveryFee || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleEdit(point)}
                                        className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Edit size={14} className="mr-1.5" /> Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleToggleActive(point)}
                                        disabled={toggleLoadingId === point.id}
                                        className={`rounded-xl font-black text-[10px] uppercase tracking-widest ${point.isActive ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                                    >
                                        {toggleLoadingId === point.id ? (
                                            <Loader2 size={14} className="mr-1.5 animate-spin" />
                                        ) : (
                                            <Power size={14} className="mr-1.5" />
                                        )}
                                        {point.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDeleteConfirm({ isOpen: true, pointId: point.id, pointName: point.name })}
                                        className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest"
                                    >
                                        <Trash2 size={14} className="mr-1.5" /> Delete
                                    </Button>
                                </div>
                            </div>
                            <div className={`px-6 py-3 border-t text-[10px] font-black uppercase tracking-widest flex justify-between items-center ${point.isActive ? 'bg-green-50/50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                <span>{point.isActive ? 'Active' : 'Inactive'}</span>
                                {point.isActive ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Creation/Editing Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900">
                            {editingPoint ? 'Edit Pickup Point' : 'Add Pickup Point'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-bold text-gray-700">Point Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="e.g. Campus Hub"
                                required
                                className="rounded-xl border-gray-200 focus:ring-orange-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-sm font-bold text-gray-700">Full Address</Label>
                            <Textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="e.g. Main Gate Street, Comrade Plaza, 2nd Floor"
                                required
                                className="rounded-xl border-gray-200 focus:ring-orange-500 min-h-[100px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactName" className="text-sm font-bold text-gray-700">Contact Person</Label>
                                <Input
                                    id="contactName"
                                    name="contactName"
                                    value={formData.contactName}
                                    onChange={handleInputChange}
                                    placeholder="e.g. John Doe"
                                    className="rounded-xl border-gray-200 focus:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPhone" className="text-sm font-bold text-gray-700">Contact Phone</Label>
                                <Input
                                    id="contactPhone"
                                    name="contactPhone"
                                    value={formData.contactPhone}
                                    onChange={handleInputChange}
                                    placeholder="07..."
                                    required
                                    className="rounded-xl border-gray-200 focus:ring-orange-500 font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deliveryFee" className="text-sm font-bold text-gray-700">Delivery Fee (KES)</Label>
                            <Input
                                id="deliveryFee"
                                name="deliveryFee"
                                type="number"
                                min="0"
                                step="1"
                                value={formData.deliveryFee}
                                onChange={handleInputChange}
                                placeholder="e.g. 100"
                                required
                                className="rounded-xl border-gray-200 focus:ring-orange-500 font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="h-5 w-5 text-orange-600 border-gray-300 rounded-lg focus:ring-orange-500"
                            />
                            <Label htmlFor="isActive" className="text-sm font-bold text-gray-700">Active and visible to customers</Label>
                        </div>
                        <DialogFooter className="pt-8 flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowForm(false)}
                                className="rounded-xl font-black border-2 border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700 px-10 h-14 flex-1 sm:flex-none transition-all uppercase tracking-widest text-xs"
                            >
                                CANCEL
                            </Button>
                            <Button
                                type="submit"
                                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                                className="!bg-[#059669] hover:!bg-[#047857] text-white font-black rounded-xl px-12 h-14 flex-1 sm:flex-none shadow-xl shadow-emerald-200/50 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-emerald-900 text-sm tracking-widest uppercase"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                        <span>PROCESSING...</span>
                                    </>
                                ) : (
                                    <>
                                        {editingPoint ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <Plus className="w-6 h-6 flex-shrink-0" />}
                                        <span>{editingPoint ? 'SAVE CHANGES' : 'CREATE POINT'}</span>
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, pointId: null, pointName: '' })}
                onConfirm={handleDelete}
                title="Delete Pickup Point?"
                message={`Are you sure you want to delete "${deleteConfirm.pointName}"? This action cannot be undone.`}
                confirmLabel="Delete Forever"
                cancelLabel="Keep It"
                variant="destructive"
            />
        </div>
    );
};

export default FastFoodPickupPoints;
