import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Footer from '@/shared/components/Footer';

const faqs = [
  {
    category: "Buying",
    questions: [
      { q: "How do I make a purchase?", a: "Simply browse the marketplace, add items to your cart, and proceed to checkout. You can choose whether to pick up your order or have it delivered directly to your hostel/room." },
      { q: "What payment methods are accepted?", a: "We primarily support M-Pesa. Some verified sellers may also accept cash on delivery, depending on your campus location." },
      { q: "Are the sellers verified?", a: "Yes. All sellers must go through a student or vendor verification process before they can list items on the platform." }
    ]
  },
  {
    category: "Selling",
    questions: [
      { q: "How much does it cost to sell?", a: "Listing items is free! We only take a small commission when an item is successfully sold through the platform to help cover maintenance and server costs." },
      { q: "How do I get paid?", a: "When your item is delivered and accepted by the buyer, the funds are released into your Comrades360 Wallet. You can withdraw to M-Pesa directly from your dashboard." }
    ]
  },
  {
    category: "Delivery",
    questions: [
      { q: "How fast is delivery?", a: "Our student delivery agents (comrades) usually fulfill orders within 30-60 minutes across campus. Fast food orders take priority!" },
      { q: "Can I track my order?", a: "Yes, once an agent is assigned, you can track the status live from your orders page." }
    ]
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(`0-0`);

  const toggleFaq = (idx) => {
    if (openIndex === idx) setOpenIndex(null);
    else setOpenIndex(idx);
  };

  return (
    <>
      <Helmet>
        <title>FAQs | Comrades360</title>
      </Helmet>

      <div className="bg-gray-50 min-h-screen py-6 sm:py-16 px-1.5 sm:px-4 pb-16 sm:pb-20">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-6 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Frequently Asked Questions</h1>
            <p className="text-sm sm:text-lg text-gray-600 px-2">Find answers to common questions about buying and selling on our platform.</p>
          </div>

          <div className="space-y-4 sm:space-y-8">
            {faqs.map((section, sIdx) => (
              <div key={sIdx}>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4 px-1">{section.category}</h2>
                <div className="space-y-2.5 sm:space-y-3">
                  {section.questions.map((faq, qIdx) => {
                    const id = `${sIdx}-${qIdx}`;
                    const isOpen = openIndex === id;
                    return (
                      <div key={id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                          onClick={() => toggleFaq(id)}
                          className="w-full text-left px-3.5 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white hover:bg-gray-50 focus:outline-none gap-2"
                        >
                          <span className="font-bold text-sm sm:text-base text-gray-900">{faq.q}</span>
                          {isOpen ? <ChevronUp size={18} className="text-blue-600 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="px-3.5 sm:px-6 pb-3.5 sm:pb-4 text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Footer */}
      <Footer />
    </>
  );
}

export default Faq;
