import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Save, Sliders, Calendar, Zap, LayoutDashboard, Utensils, Award, Clock, Plus, X, Edit, ChevronLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { platformService } from '../../services/platformService';
import { fastFoodService } from '../../services/fastFoodService';
import { uploadFile } from '../../services/upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import FastFoodCard from '../../components/FastFoodCard';
import FastFoodHero from '../../components/FastFoodHero';

const HeroSettingsConfig = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [uploading, setUploading] = useState(false);

    // View state management
    const [currentView, setCurrentView] = useState('list'); // 'list' or 'edit'
    const [editingCampaignId, setEditingCampaignId] = useState(null);


    // Dashboard State (Complex JSON)
    const [config, setConfig] = useState({
        activeCampaignId: 'auto', // 'auto' or specific campaign ID
        campaigns: [
            {
                id: 'default', title: '', type: 'manual', subtitle: '', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80', active: true, priority: 10,
                schedule: { startDate: '', endDate: '', startTime: '', endTime: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
            }
        ],
        automation: {
            enableBreakfast: true,
            enableLateNight: false,
            enableBestSellers: true,
            stockRescueMode: false
        }
    });

    useEffect(() => {
        const init = async () => {
            try {
                const [configRes, itemsRes] = await Promise.all([
                    platformService.getConfig('fast_food_hero'),
                    fastFoodService.getAllFastFoods()
                ]);

                if (configRes.success && configRes.data) {
                    const loadedConfig = typeof configRes.data === 'string' ? JSON.parse(configRes.data) : configRes.data;

                    // Simple migration for legacy data
                    if (loadedConfig.title && !loadedConfig.campaigns) {
                        setConfig(prev => ({ ...prev })); // Keep default if structure mismatch
                    } else {
                        // Ensure all campaigns have schedule object
                        const migratedCampaigns = (loadedConfig.campaigns || []).map(c => ({
                            ...c,
                            schedule: c.schedule || { startDate: '', endDate: '', startTime: '', endTime: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
                        }));
                        setConfig({ ...loadedConfig, campaigns: migratedCampaigns });
                    }
                }

                if (itemsRes.data) {
                    setMenuItems(itemsRes.data);
                }
            } catch (err) {
                console.error('Failed to load settings', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSave = async () => {
        // Validation
        const invalidCampaigns = config.campaigns.filter(c => !c.title?.trim() || !c.subtitle?.trim());
        if (invalidCampaigns.length > 0) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Campaign Name and Subtitle are required for all campaigns.",
            });
            setCurrentView('edit');
            setEditingCampaignId(invalidCampaigns[0].id);
            return;
        }

        setSaving(true);
        try {
            const response = await platformService.updateConfig('fast_food_hero', config);
            if (response.success) {
                toast({ title: "Settings Saved", description: "Rotation schedule updated successfully." });
            } else {
                toast({ variant: "destructive", title: "Error", description: response.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
        } finally {
            setSaving(false);
        }
    };


    const addCampaign = () => {
        const newId = `camp_${Date.now()}`;
        setConfig(prev => ({
            ...prev,
            campaigns: [
                ...prev.campaigns,
                {
                    id: newId,
                    title: '',
                    subtitle: '',
                    image: '',
                    type: 'manual',
                    active: false,
                    priority: 50,
                    schedule: { startDate: '', endDate: '', startTime: '', endTime: '', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
                }
            ]
        }));
        // Switch to edit view for the new campaign
        setEditingCampaignId(newId);
        setCurrentView('edit');
    };

    const editCampaign = (id) => {
        setEditingCampaignId(id);
        setCurrentView('edit');
    };

    const backToList = () => {
        setCurrentView('list');
        setEditingCampaignId(null);
    };

    const saveAndClose = async () => {
        await handleSave();
        backToList();
    };

    const updateCampaign = (id, field, value) => {
        setConfig(prev => ({
            ...prev,
            campaigns: prev.campaigns.map(c => c.id === id ? { ...c, [field]: value } : c)
        }));
    };

    const updateSchedule = (id, field, value) => {
        setConfig(prev => ({
            ...prev,
            campaigns: prev.campaigns.map(c =>
                c.id === id ? { ...c, schedule: { ...c.schedule, [field]: value } } : c
            )
        }));
    };

    const deleteCampaign = (id) => {
        setConfig(prev => ({
            ...prev,
            campaigns: prev.campaigns.filter(c => c.id !== id)
        }));

        toast({
            title: "Campaign Deleted",
            description: "Campaign has been removed successfully."
        });
    };

    const handleImageUpload = async (id, file) => {
        if (!file) return;

        setUploading(true);
        try {
            const imageUrl = await uploadFile(file);
            updateCampaign(id, 'image', imageUrl);
            toast({
                title: "Upload Successful",
                description: "Campaign image has been updated."
            });
        } catch (error) {
            console.error('Image upload failed', error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "There was an error uploading the image."
            });
        } finally {
            setUploading(false);
        }
    };

    // --- LOGIC: DETERMINE ACTIVE BANNERS (ROTATION) ---
    const getActiveBanners = () => {
        // In a real app, we check dates/times here against new Date()
        // For preview, we show all "Active" campaigns sorted by Priority
        const activeList = config.campaigns
            .filter(c => c.active)
            .sort((a, b) => b.priority - a.priority);

        if (activeList.length === 0) return [{ title: 'Welcome', subtitle: 'Order now', image: '', type: 'default' }];
        return activeList;
    };

    const activeBanners = getActiveBanners();
    const topBanner = activeBanners[0];
    const linkedItem = topBanner.itemId ? menuItems.find(i => String(i.id) === String(topBanner.itemId)) : null;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading command center...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <LayoutDashboard className="h-6 w-6 text-orange-600" />
                            Marketing Command Center
                        </h1>
                        <p className="text-sm text-gray-500">Manage rotation, scheduling, and item cards.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                    {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save System Config</>}
                </Button>
            </div>

            <Tabs defaultValue="campaigns" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
                    <TabsTrigger value="campaigns">Campaigns & Schedule</TabsTrigger>
                    <TabsTrigger value="preview">Live Rotation Preview</TabsTrigger>
                    <TabsTrigger value="automation">Automation Rules</TabsTrigger>
                </TabsList>

                {/* --- CAMPAIGNS TAB (Main Work Area) --- */}
                <TabsContent value="campaigns" className="space-y-6">
                    {currentView === 'list' ? (
                        // LIST VIEW - Compact campaign cards
                        <>
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Campaign Management</h2>
                                <Button onClick={addCampaign} className="bg-orange-600 hover:bg-orange-700">
                                    <Plus className="h-4 w-4 mr-2" /> Create New Campaign
                                </Button>
                            </div>

                            {config.campaigns.length === 0 ? (
                                <Card className="border-dashed border-2">
                                    <CardContent className="p-12 text-center">
                                        <LayoutDashboard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Campaigns Yet</h3>
                                        <p className="text-gray-500 mb-4">Create your first campaign to start managing hero banners</p>
                                        <Button onClick={addCampaign} className="bg-orange-600 hover:bg-orange-700">
                                            <Plus className="h-4 w-4 mr-2" /> Create Campaign
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {config.campaigns.map((camp) => (
                                        <Card key={camp.id} className={`transition-all hover:shadow-md ${camp.active ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-4">
                                                    {/* Thumbnail */}
                                                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 border">
                                                        {camp.image ? (
                                                            <img src={camp.image} alt={camp.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <LayoutDashboard className="h-8 w-8" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-bold text-gray-900 truncate">{camp.title}</h3>
                                                        <p className="text-sm text-gray-500 truncate">{camp.subtitle}</p>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${camp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                {camp.active ? '● Active' : '○ Inactive'}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                Priority: <strong className="text-gray-900">{camp.priority}</strong>
                                                            </span>
                                                            {camp.itemId && camp.itemId !== 'none' && (
                                                                <span className="text-xs text-orange-600 font-medium">
                                                                    🍔 Linked Item
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => editCampaign(camp.id)}
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => deleteCampaign(camp.id)}
                                                            title="Delete Campaign"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        // EDITOR VIEW - Full campaign editor
                        <>
                            {(() => {
                                const camp = config.campaigns.find(c => c.id === editingCampaignId);
                                if (!camp) return <div>Campaign not found</div>;

                                return (
                                    <>
                                        {/* Editor Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Button variant="ghost" size="icon" onClick={backToList}>
                                                    <ChevronLeft className="h-5 w-5" />
                                                </Button>
                                                <div>
                                                    <h2 className="text-lg font-semibold">Edit Campaign</h2>
                                                    <p className="text-sm text-gray-500">Configure your campaign settings</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" onClick={backToList}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={saveAndClose} className="bg-orange-600 hover:bg-orange-700">
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save & Close
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Editor Form */}
                                        <Card className={`transition-all ${camp.active ? 'border-l-4 border-l-green-500 shadow-md' : 'border-l-4 border-l-gray-300'}`}>
                                            <CardContent className="p-6">
                                                <div className="flex flex-col gap-10">

                                                    {/* TOP SECTION: EDITING FORM */}
                                                    <div className="w-full space-y-8">
                                                        {/* Basic Info & Switch */}
                                                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                            <div className="flex-1 w-full space-y-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Campaign Identity</label>
                                                                    <Input
                                                                        value={camp.title}
                                                                        onChange={(e) => updateCampaign(camp.id, 'title', e.target.value)}
                                                                        className={`text-2xl font-black border-transparent hover:border-gray-200 px-0 focus:px-4 h-auto py-1 transition-all bg-transparent placeholder:opacity-30 ${!camp.title?.trim() ? 'border-b-red-300' : ''}`}
                                                                        placeholder="Campaign Main Title..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Input
                                                                        value={camp.subtitle}
                                                                        onChange={(e) => updateCampaign(camp.id, 'subtitle', e.target.value)}
                                                                        className={`text-base text-gray-500 border-transparent hover:border-gray-200 px-0 focus:px-4 transition-all bg-transparent placeholder:opacity-30 ${!camp.subtitle?.trim() ? 'border-b-red-300' : ''}`}
                                                                        placeholder="Campaign Catchy Subtitle..."
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-3 py-2 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 w-full md:w-auto">
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-xs font-bold uppercase tracking-tighter ${camp.active ? 'text-green-600' : 'text-gray-400'}`}>
                                                                        Status: {camp.active ? 'Live' : 'Draft'}
                                                                    </span>
                                                                    <Switch
                                                                        checked={camp.active}
                                                                        onCheckedChange={(c) => updateCampaign(camp.id, 'active', c)}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                                                                    <span className="text-[10px] text-gray-400 uppercase font-black">Display Order</span>
                                                                    <Input
                                                                        type="number"
                                                                        value={camp.priority}
                                                                        onChange={(e) => updateCampaign(camp.id, 'priority', parseInt(e.target.value))}
                                                                        className="w-12 h-6 text-xs text-center border-none p-0 focus-visible:ring-0 font-bold"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Config Grid: 2 Columns */}
                                                        <div className="grid md:grid-cols-2 gap-10">
                                                            {/* Content Source */}
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Visual Strategy</h4>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <label className="text-xs font-bold text-gray-500 uppercase">Product Link</label>
                                                                    <Select
                                                                        value={camp.itemId || "none"}
                                                                        onValueChange={(val) => updateCampaign(camp.id, 'itemId', val)}
                                                                    >
                                                                        <SelectTrigger className="bg-white h-12 rounded-xl border-gray-200 focus:ring-orange-500 shadow-sm transition-all hover:border-orange-300">
                                                                            <SelectValue placeholder="Social/Manual or Item Linked?" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-72 bg-white border-gray-200 shadow-xl overflow-y-auto">
                                                                            <SelectItem value="none" className="font-bold text-orange-600 focus:bg-orange-50">Manual Mode (Social/Marketing)</SelectItem>
                                                                            <div className="px-2 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Linkable Menu Items</div>
                                                                            {menuItems.map(item => (
                                                                                <SelectItem key={item.id} value={String(item.id)} className="focus:bg-blue-50 cursor-pointer">
                                                                                    {item.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {(!camp.itemId || camp.itemId === 'none') && (
                                                                    <div className="space-y-4 p-5 bg-orange-50/30 rounded-2xl border border-orange-100/50">
                                                                        <div className="flex items-center justify-between">
                                                                            <label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Banner Graphics</label>
                                                                            {uploading && <span className="text-[10px] text-orange-600 animate-pulse font-bold">UPLOADING...</span>}
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            <div
                                                                                onClick={() => document.getElementById(`image-upload-${camp.id}`).click()}
                                                                                className={`relative h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all bg-white hover:border-orange-400 group shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : 'border-gray-200'}`}
                                                                            >
                                                                                {camp.image ? (
                                                                                    <div className="relative w-full h-full p-2">
                                                                                        <img src={camp.image} className="w-full h-full object-cover rounded-lg shadow-sm" alt="Preview" />
                                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity rounded-lg">
                                                                                            <Upload className="text-white w-6 h-6" />
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center p-4">
                                                                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2 group-hover:text-orange-400 transition-colors" />
                                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Drop image or click to choose</p>
                                                                                    </div>
                                                                                )}
                                                                                <input
                                                                                    id={`image-upload-${camp.id}`}
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    accept="image/*"
                                                                                    onChange={(e) => handleImageUpload(camp.id, e.target.files[0])}
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                <Input
                                                                                    value={camp.image}
                                                                                    onChange={(e) => updateCampaign(camp.id, 'image', e.target.value)}
                                                                                    placeholder="Paste Image URL (CDN)..."
                                                                                    className="text-[11px] h-9 bg-white border-gray-200 focus-visible:ring-orange-500 rounded-lg"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Scheduling */}
                                                            <div className="space-y-6">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                                        Timing & Availability
                                                                    </h4>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] text-gray-400 uppercase font-black">Activation Date</label>
                                                                        <Input type="date" value={camp.schedule?.startDate} onChange={(e) => updateSchedule(camp.id, 'startDate', e.target.value)} className="h-11 rounded-xl border-gray-200 bg-white" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] text-gray-400 uppercase font-black">Expiration Date</label>
                                                                        <Input type="date" value={camp.schedule?.endDate} onChange={(e) => updateSchedule(camp.id, 'endDate', e.target.value)} className="h-11 rounded-xl border-gray-200 bg-white" />
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] text-gray-400 uppercase font-black">Service Start</label>
                                                                        <Input type="time" value={camp.schedule?.startTime} onChange={(e) => updateSchedule(camp.id, 'startTime', e.target.value)} className="h-11 rounded-xl border-gray-200 bg-white" />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[10px] text-gray-400 uppercase font-black">Service End</label>
                                                                        <Input type="time" value={camp.schedule?.endTime} onChange={(e) => updateSchedule(camp.id, 'endTime', e.target.value)} className="h-11 rounded-xl border-gray-200 bg-white" />
                                                                    </div>
                                                                </div>

                                                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                                    <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                                                        <Clock className="inline-block w-3 h-3 mr-1" />
                                                                        Campaign will only be visible within these dates and times. Leave blank for perpetual display.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-gray-100 mx-[-24px]" />

                                                    {/* BOTTOM SECTION: HIGH FIDELITY PREVIEW */}
                                                    <div className="w-full space-y-6 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                                                <div>
                                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">
                                                                        Live Production Preview
                                                                    </h4>
                                                                    <p className="text-[10px] text-gray-400 font-bold">WYSIWYG: EXACT DISPLAY AS SEEN BY CUSTOMERS</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Real-Time Sync Active</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {(() => {
                                                            const previewItem = camp.itemId && camp.itemId !== 'none'
                                                                ? menuItems.find(i => String(i.id) === String(camp.itemId))
                                                                : null;

                                                            return (
                                                                <div className="relative">
                                                                    {/* Device frame */}
                                                                    <div className="relative bg-[#0a0a0a] rounded-[3.5rem] p-4 lg:p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border-[12px] border-[#1a1a1a]">
                                                                        {/* Top bezel detail */}
                                                                        <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-24 h-5 bg-[#141414] rounded-full flex items-center justify-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-[#1e1e1e]"></div>
                                                                            <div className="w-8 h-1 rounded-full bg-[#1e1e1e]"></div>
                                                                        </div>

                                                                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-inner">
                                                                            <FastFoodHero
                                                                                settings={camp}
                                                                                item={previewItem}
                                                                                searchTerm=""
                                                                                setSearchTerm={() => { }}
                                                                            />
                                                                        </div>

                                                                        {/* Bottom indicator */}
                                                                        <div className="mt-8 flex justify-center">
                                                                            <div className="px-6 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white/40 text-[9px] font-bold tracking-[0.3em] uppercase">
                                                                                Virtual Banner Instance
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Background glow behind frame */}
                                                                    <div className="absolute -inset-10 bg-orange-500/5 blur-[100px] -z-10 pointer-events-none"></div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </TabsContent>

                {/* --- PREVIEW TAB --- */}
                <TabsContent value="preview" className="space-y-6">
                    <Card className="bg-orange-50/50 border-orange-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Zap className="w-5 h-5 text-orange-500" /> Live Rotation Preview
                            </CardTitle>
                            <CardDescription>This mimics what the customer sees. The system rotates through these based on Priority.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* SIMULATED PHONE VIEW OR HERO SECTION */}
                            <div className="border-[8px] border-gray-900 rounded-[3rem] overflow-hidden shadow-2xl bg-white w-full relative">
                                <FastFoodHero
                                    settings={topBanner}
                                    item={linkedItem}
                                    searchTerm=""
                                    setSearchTerm={() => { }}
                                />
                                {/* Text Overlay (Priority Indicator) */}
                                <div className="absolute top-4 right-8 bg-black/60 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md z-50 font-bold">
                                    Queue Priority: {topBanner.priority}
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="font-bold text-gray-700 mb-4">Rotation Queue (Sorted by Priority)</h3>
                                <div className="space-y-2">
                                    {activeBanners.map((b, i) => (
                                        <div key={b.id || i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                                                    {i + 1}
                                                </span>
                                                <span className="font-medium text-gray-900">{b.title}</span>
                                                <span className="text-xs text-gray-500">{b.subtitle}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>Priority: <strong className="text-gray-900">{b.priority}</strong></span>
                                                <span>Type: {b.type}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Create Campaign Button */}
                            <div className="mt-8 flex justify-start">
                                <Button
                                    onClick={addCampaign}
                                    className="bg-orange-600 hover:bg-orange-700 shadow-lg"
                                    size="lg"
                                >
                                    <Plus className="h-5 w-5 mr-2" /> Create New Campaign
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- AUTOMATION TAB --- */}
                <TabsContent value="automation" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5" /> Automated Rules</CardTitle>
                            <CardDescription>These rules generate banners automatically when no high-priority campaigns are active.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-base font-medium">Auto-Breakfast Mode</label>
                                    <p className="text-sm text-gray-500">Show breakfast items from 6AM - 11AM</p>
                                </div>
                                <Switch
                                    checked={config.automation.enableBreakfast}
                                    onCheckedChange={(c) => setConfig(p => ({ ...p, automation: { ...p.automation, enableBreakfast: c } }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default HeroSettingsConfig;
