import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Mail,
    Phone,
    MapPin,
    Globe
} from 'lucide-react';
import { FaTiktok, FaWhatsapp, FaYoutube, FaTelegram, FaSnapchat, FaPinterest } from 'react-icons/fa';
import api from '../services/api';

export default function Footer() {
    const [contactData, setContactData] = useState(null);

    useEffect(() => {
        fetchContactData();
    }, []);

    const fetchContactData = async () => {
        try {
            const response = await api.get('/cms/contact');
            if (response.data?.content) {
                setContactData(response.data.content);
            }
        } catch (error) {
            // Silently fail - use fallback data
            // console.error('Error fetching contact data:', error);
        }
    };

    const getIconComponent = (platform) => {
        const iconMap = {
            facebook: Facebook,
            twitter: Twitter,
            instagram: Instagram,
            linkedin: Linkedin,
            tiktok: FaTiktok,
            whatsapp: FaWhatsapp,
            youtube: FaYoutube,
            telegram: FaTelegram,
            snapchat: FaSnapchat,
            pinterest: FaPinterest,
            custom: Globe
        };
        return iconMap[platform] || Globe;
    };

    const getHoverColorClass = (platform) => {
        const colorMap = {
            facebook: 'hover:bg-blue-600',
            twitter: 'hover:bg-blue-400',
            instagram: 'hover:bg-pink-600',
            linkedin: 'hover:bg-blue-700',
            tiktok: 'hover:bg-black',
            whatsapp: 'hover:bg-green-500',
            youtube: 'hover:bg-red-600',
            telegram: 'hover:bg-blue-500',
            snapchat: 'hover:bg-yellow-400',
            pinterest: 'hover:bg-red-700',
            custom: 'hover:bg-gray-600'
        };
        return colorMap[platform] || 'hover:bg-gray-600';
    };

    const formatSocialUrl = (item) => {
        if (item.type === 'phone') {
            // WhatsApp or Telegram
            if (item.platform === 'whatsapp') {
                const phone = item.value.replace(/[^\d+]/g, '');
                return `https://wa.me/${phone}`;
            }
            if (item.platform === 'telegram') {
                return item.value.startsWith('@')
                    ? `https://t.me/${item.value.slice(1)}`
                    : `https://t.me/${item.value.replace(/[^\d+]/g, '')}`;
            }
        }
        return item.value;
    };

    const email = contactData?.email || 'info@comrades360.shop';
    const phone = contactData?.phone || '+254 757 588 395';
    const location = contactData?.location || 'Nairobi, Kenya';
    const socialLinks = contactData?.socialMediaLinks || [];

    return (
        <footer className="bg-gray-900 text-gray-300 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* About Section */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">About Comrades360</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Empowering university students in Kenya with opportunities to earn, learn, and grow through our innovative marketplace platform.
                        </p>

                        {/* Social Media Links - Dynamic from CMS */}
                        {socialLinks.length > 0 && (
                            <div className="flex items-center gap-3 flex-wrap">
                                {socialLinks.map((item, index) => {
                                    const IconComponent = getIconComponent(item.platform);
                                    const hoverColor = getHoverColorClass(item.platform);
                                    const url = formatSocialUrl(item);

                                    return (
                                        <a
                                            key={item.id || index}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center ${hoverColor} transition-colors`}
                                            title={item.name}
                                        >
                                            <IconComponent className="w-5 h-5" />
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                            </li>
                            <li>
                                <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
                            </li>
                            <li>
                                <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
                            </li>
                            <li>
                                <Link to="/products" className="hover:text-white transition-colors">Products</Link>
                            </li>
                            <li>
                                <Link to="/services" className="hover:text-white transition-colors">Services</Link>
                            </li>
                            <li>
                                <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Help & Support */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">Help & Support</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/faq" className="hover:text-white transition-colors">FAQs</Link>
                            </li>
                            <li>
                                <Link to="/shipping" className="hover:text-white transition-colors">Shipping & Returns</Link>
                            </li>
                            <li>
                                <Link to="/payments" className="hover:text-white transition-colors">Payment Options</Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">Get In Touch</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                                    {email}
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                                    {phone}
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <span>{location}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                        <p>© {new Date().getFullYear()} Comrades360. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                            <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
