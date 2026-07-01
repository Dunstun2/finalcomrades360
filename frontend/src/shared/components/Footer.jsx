import React from 'react';
import { FaFacebookF, FaYoutube, FaInstagram, FaTiktok, FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
    return (
        <footer className="mt-12 border-t pt-8 pb-12 text-sm text-gray-600 bg-gray-50/50">
            <div className="container mx-auto px-0 md:px-4">
                <div className="flex flex-wrap gap-y-10 md:grid md:grid-cols-4 md:gap-8">
                    {/* About Section */}
                    <div className="w-1/2 md:w-auto">
                        <div className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">About</div>
                        <ul className="space-y-2">
                            <li><a href="/about" className="hover:text-blue-600 transition-colors">About Us</a></li>
                            <li><a href="/contact" className="hover:text-blue-600 transition-colors">Contact</a></li>
                            <li><a href="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                            <li><a href="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                        </ul>
                    </div>

                    {/* Help Section */}
                    <div className="w-1/2 md:w-auto">
                        <div className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">Help</div>
                        <ul className="space-y-2">
                            <li><a href="/faq" className="hover:text-blue-600 transition-colors">FAQs</a></li>
                            <li><a href="/shipping" className="hover:text-blue-600 transition-colors">Shipping & Returns</a></li>
                            <li><a href="/payments" className="hover:text-blue-600 transition-colors">Payment Options</a></li>
                            <li><a href="/size-guide" className="hover:text-blue-600 transition-colors">Size Guide</a></li>
                        </ul>
                    </div>

                    {/* Connect Section */}
                    <div className="w-full md:w-auto">
                        <div className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">Connect</div>
                        <div className="flex space-x-6">
                            <a href="https://facebook.com/Comrades360" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#1877F2] transition-colors" title="Facebook">
                                <FaFacebookF size={20} />
                            </a>
                            <a href="https://youtube.com/@comrades_360" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#FF0000] transition-colors" title="YouTube">
                                <FaYoutube size={20} />
                            </a>
                            <a href="https://instagram.com/comrades360" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#E4405F] transition-colors" title="Instagram">
                                <FaInstagram size={20} />
                            </a>
                            <a href="https://tiktok.com/@comrades360" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#000000] transition-colors" title="TikTok">
                                <FaTiktok size={20} />
                            </a>
                            <a href="https://wa.me/254757588395" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#25D366] transition-colors" title="WhatsApp">
                                <FaWhatsapp size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Powered By Section */}
                    <div className="w-full md:w-auto md:text-right">
                        <div className="text-gray-500">
                            Proudly powered by <span className="font-bold text-gray-900">Comrades360</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">© 2026 All Rights Reserved</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
