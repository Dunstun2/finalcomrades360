import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { recursiveParse, ensureArray, normalizeIngredient } from '../../utils/parsingUtils';
import api from '../../services/api';
import { fastFoodService } from '../../services/fastFoodService';
import { resolveImageUrl, FALLBACK_IMAGE } from '../../utils/imageUtils';
import { Utensils, Clock, MapPin, Shield, Info, Truck, List, Settings, Edit, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

const SellerFastFoodView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        const loadItem = async () => {
            try {
                setLoading(true);
                console.log(`🍔 Fetching Fast Food with ID: ${id} `);
                const res = await fastFoodService.getFastFoodById(id);

                if (alive) {
                    if (res.success) {
                        setItem(res.data);
                        setError(null);
                    } else {
                        setError(res.message || 'Failed to load item');
                    }
                }
            } catch (err) {
                console.error('Error loading fast food:', err);
                if (alive) setError('An unexpected error occurred while fetching the item.');
            } finally {
                if (alive) setLoading(false);
            }
        };

        loadItem();
        return () => { alive = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-2"></div>
                <span className="text-gray-600">Loading item details...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3 border border-red-100">
                    <XCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
            </div>
        );
    }

    if (!item) return null;

    const StatusBadge = ({ approved, reviewStatus }) => {
        if (approved) return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700 border border-green-200">Live</span>;
        if (reviewStatus === 'rejected') return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 border border-red-200">Rejected</span>;
        return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-yellow-100 text-yellow-700 border border-yellow-200">Pending Approval</span>;
    };

    const SectionHeader = ({ icon: Icon, title }) => (
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Icon className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
    );

    const InfoRow = ({ label, value, icon: Icon }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="h-6 w-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">{item.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge approved={item.approved} reviewStatus={item.reviewStatus} />
                            <span className="text-gray-400 text-xs font-medium">ID: {item.id}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to={`/seller/fast-food/edit/${item.id}`}>
                        <Button className="bg-orange-600 hover:bg-orange-700">
                            <Edit className="h-4 w-4 mr-2" /> Edit Item
                        </Button>
                    </Link>
                    <Link to={`/fastfood/${item.id}`} target="_blank">
                        <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" /> Customer View
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Media & Primary Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <img
                            src={resolveImageUrl(item.mainImage)}
                            alt={item.name}
                            className="w-full h-64 object-cover"
                            onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                        />
                        {(() => {
                            const gallery = typeof item.galleryImages === 'string'
                                ? (item.galleryImages.trim() ? JSON.parse(item.galleryImages) : [])
                                : (Array.isArray(item.galleryImages) ? item.galleryImages : []);
                            return gallery.length > 0 && (
                                <div className="p-4 flex gap-2 overflow-x-auto">
                                    {gallery.map((img, i) => (
                                        <img
                                            key={i}
                                            src={resolveImageUrl(img)}
                                            className="w-16 h-16 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                            alt={`Gallery ${i}`}
                                        />
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <SectionHeader icon={Info} title="Quick Summary" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">{item.shortDescription}</p>
                            <p className="text-xs text-gray-500 mt-2">{item.description}</p>
                        </div>
                    </div>
                </div>

                {/* Right Columns: Detailed Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Pricing & Order Details */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <SectionHeader icon={Shield} title="Pricing & Order Details" />
                            <div className="space-y-1">
                                <InfoRow label="Base Price" value={`KES ${item.basePrice?.toLocaleString()}`} />
                                <InfoRow label="Min Order Qty" value={item.minOrderQty || '1'} />
                                <InfoRow label="Max Order Qty" value={item.maxOrderQty || 'Unlimited'} />
                            </div>
                        </div>

                        {/* Dietary Info & Features */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <SectionHeader icon={Utensils} title="Dietary & Features" />
                            <div className="space-y-1">
                                <InfoRow label="Estimated Servings" value={item.estimatedServings} />
                                <InfoRow label="Allergens" value={(() => {
                                    const parsed = recursiveParse(item.allergens);
                                    if (Array.isArray(parsed)) {
                                        return parsed.map(a => recursiveParse(a)).join(', ');
                                    }
                                    return parsed || 'None';
                                })()} />
                                <InfoRow label="Prep Time" value={`${item.preparationTimeMinutes} mins`} />
                                <InfoRow label="Combo Option" value={item.isComboOption ? 'Yes' : 'No'} />
                                <InfoRow label="Category" value={item.category} />
                            </div>
                        </div>

                        {/* Ingredients Section */}
                        {(item.ingredients && (Array.isArray(item.ingredients) ? item.ingredients.length > 0 : true)) && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                                <SectionHeader icon={Info} title="Ingredients" />
                                <div className="flex flex-col gap-2">
                                    {(() => {
                                        let ings = recursiveParse(item.ingredients);

                                        if (Array.isArray(ings)) {
                                            return ings.map((ing, i) => {
                                                const { name, quantity } = normalizeIngredient(ing);
                                                if (!name) return null;

                                                return (
                                                    <div key={i} className="bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm border border-gray-100 flex items-center gap-2 hover:bg-white transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                                        <span className="font-bold">{name}</span>
                                                        {quantity && <span className="text-xs text-gray-400 font-medium whitespace-nowrap">({quantity})</span>}
                                                    </div>
                                                );
                                            }).filter(Boolean);
                                        }

                                        if (typeof ings === 'string' && ings.includes('\n')) {
                                            return ings.split('\n').filter(Boolean).map((line, i) => (
                                                <div key={i} className="bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm border border-gray-100 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                                    <span className="font-medium">{line}</span>
                                                </div>
                                            ));
                                        }

                                        return <p className="text-sm text-gray-600 italic leading-relaxed">{ings || 'None'}</p>;
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Delivery & Fee Configuration */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                            <SectionHeader icon={Truck} title="Delivery & Fee Configuration" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <InfoRow label="Est. Delivery Time" value={`${item.deliveryTimeEstimateMinutes} mins`} />
                                    <InfoRow label="Pickup Available" value={item.pickupAvailable ? 'Yes' : 'No'} />
                                    {item.pickupAvailable && <InfoRow label="Pickup Location" value={item.pickupLocation} />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Delivery Coverage Zones</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(item.deliveryCoverageZones) ? item.deliveryCoverageZones : (typeof item.deliveryCoverageZones === 'string' ? item.deliveryCoverageZones.split(',').map(z => z.trim()) : [])).filter(Boolean).map((zone, i) => (
                                            <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-semibold border border-blue-100">{zone}</span>
                                        ))}
                                        {(!item.deliveryCoverageZones || (Array.isArray(item.deliveryCoverageZones) && item.deliveryCoverageZones.length === 0)) && (
                                            <span className="text-sm text-gray-400 italic">No specific coverage zones defined.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Size Variants */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                            <SectionHeader icon={List} title="Size Variants" />
                            {(() => {
                                const variants = recursiveParse(item.sizeVariants) || [];
                                const validVariants = Array.isArray(variants) ? variants : [];
                                return validVariants.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b">
                                                    <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Variant Name</th>
                                                    <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Base Price (KES)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {validVariants.map((v, i) => {
                                                    const variant = recursiveParse(v);
                                                    return (
                                                        <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                                            <td className="py-3 font-medium text-gray-900">{variant.name || variant.size || variant}</td>
                                                            <td className="py-3 text-gray-500">KES {(variant.basePrice || variant.price || variant.displayPrice || 0).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No size variants configured for this item.</p>
                                );
                            })()}
                        </div>

                        {/* Combo Options */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                            <SectionHeader icon={Settings} title="Combo Options" />
                            {(() => {
                                const combos = recursiveParse(item.comboOptions) || [];
                                const validCombos = Array.isArray(combos) ? combos : [];
                                return validCombos.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 border-b">
                                                    <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Combo Name</th>
                                                    <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Items</th>
                                                    <th className="pb-2 font-bold uppercase tracking-wider text-[10px]">Base Price (KES)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {validCombos.map((c, i) => {
                                                    const opt = recursiveParse(c);
                                                    return (
                                                        <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                                            <td className="py-3 font-medium text-gray-900">{opt.name || (typeof opt === 'string' ? opt : 'Unnamed Option')}</td>
                                                            <td className="py-3 text-gray-500">
                                                                {Array.isArray(opt.items) ? opt.items.join(', ') : (opt.items || 'None')}
                                                            </td>
                                                            <td className="py-3 text-gray-500">KES {(opt.basePrice || opt.price || opt.displayPrice || 0).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No combo options configured.</p>
                                );
                            })()}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerFastFoodView;
