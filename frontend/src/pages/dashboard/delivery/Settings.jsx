import React, { useState } from 'react';
import { FaBell, FaGlobe, FaMoon, FaLock, FaMapMarkedAlt, FaVolumeUp } from 'react-icons/fa';
import { Switch } from '../../../components/ui/switch'; // Assuming we have a Switch component or will create one

const SettingSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <Icon />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-6 space-y-6">
            {children}
        </div>
    </div>
);

const SettingItem = ({ label, description, rightElement }) => (
    <div className="flex items-center justify-between">
        <div>
            <p className="font-medium text-gray-900">{label}</p>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div>{rightElement}</div>
    </div>
);

const DeliverySettings = () => {
    const [settings, setSettings] = useState({
        newOrders: true,
        promoEmails: false,
        soundEffects: true,
        darkMode: false,
        autoAccept: false,
        navigationApp: 'google_maps'
    });

    const toggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="w-full space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

            <SettingSection title="Notifications" icon={FaBell}>
                <SettingItem
                    label="New Order Alerts"
                    description="Receive push notifications for new delivery requests"
                    rightElement={<Switch checked={settings.newOrders} onCheckedChange={() => toggle('newOrders')} />}
                />
                <SettingItem
                    label="Promotional Emails"
                    description="Receive tips and bonus opportunities via email"
                    rightElement={<Switch checked={settings.promoEmails} onCheckedChange={() => toggle('promoEmails')} />}
                />
            </SettingSection>

            <SettingSection title="App Preferences" icon={FaGlobe}>
                <SettingItem
                    label="Sound Effects"
                    description="Play sounds for alerts and interactions"
                    rightElement={<Switch checked={settings.soundEffects} onCheckedChange={() => toggle('soundEffects')} />}
                />
                <SettingItem
                    label="Navigation App"
                    description="Choose your preferred app for directions"
                    rightElement={
                        <select
                            value={settings.navigationApp}
                            onChange={(e) => setSettings({ ...settings, navigationApp: e.target.value })}
                            className="border rounded-md px-3 py-1 text-sm bg-gray-50"
                        >
                            <option value="google_maps">Google Maps</option>
                            <option value="waze">Waze</option>
                            <option value="apple_maps">Apple Maps</option>
                        </select>
                    }
                />
                <SettingItem
                    label="Dark Mode"
                    description="Use dark theme for low-light conditions"
                    rightElement={<Switch checked={settings.darkMode} onCheckedChange={() => toggle('darkMode')} />}
                />
            </SettingSection>

            <SettingSection title="Delivery Preferences" icon={FaMapMarkedAlt}>
                <SettingItem
                    label="Auto-Accept Orders"
                    description="Automatically accept orders within 2km radius"
                    rightElement={<Switch checked={settings.autoAccept} onCheckedChange={() => toggle('autoAccept')} />}
                />
                <SettingItem
                    label="Measurement Units"
                    description="Distance units for navigation"
                    rightElement={
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button className="px-3 py-1 bg-white shadow-sm rounded-md text-sm font-medium">km</button>
                            <button className="px-3 py-1 text-gray-500 text-sm font-medium hover:text-gray-900">mi</button>
                        </div>
                    }
                />
            </SettingSection>

            <SettingSection title="Privacy & Security" icon={FaLock}>
                <SettingItem
                    label="Share Location"
                    description="Allow customers to track your location during delivery"
                    rightElement={<Switch checked={true} disabled />}
                />
                <div className="pt-4 border-t border-gray-100">
                    <button className="text-red-600 font-medium hover:text-red-700 text-sm">Delete Account</button>
                </div>
            </SettingSection>

            <div className="text-center text-gray-500 text-sm pt-4">
                App Version 2.4.0
            </div>
        </div>
    );
};

export default DeliverySettings;
