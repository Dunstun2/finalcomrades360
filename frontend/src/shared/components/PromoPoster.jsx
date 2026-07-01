import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, X } from 'lucide-react';

const PromoPoster = ({ promo, onClose }) => {
  const posterRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    try {
      const element = posterRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: false,
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `comrades360-promo-${promo.code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to generate poster:', error);
      alert('Failed to generate poster image. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || String(dateStr).trim() === '' || String(dateStr).toLowerCase() === 'n/a') return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'long' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };

  const start = formatDate(promo.validFrom);
  const end = formatDate(promo.validUntil);
  const hasAnyDate = start || end;

  const getApplicableItemsText = () => {
    const rawIds = promo.applicableProductIds;
    if (!rawIds) return null;

    let idArray = [];
    if (Array.isArray(rawIds)) {
      idArray = rawIds;
    } else if (typeof rawIds === 'string') {
      try {
        if (rawIds.startsWith('[')) {
          idArray = JSON.parse(rawIds);
        } else {
          idArray = rawIds.split(',').map(id => id.trim()).filter(id => id);
        }
      } catch (e) {
        idArray = rawIds.split(',').map(id => id.trim()).filter(id => id);
      }
    }

    const names = idArray
      .map(item => {
        const parts = item.split(':');
        return parts.length > 1 ? parts[1].trim() : null;
      })
      .filter(name => name);

    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} or ${names[1]}`;
    return `${names[0]}, ${names[1]} and more`;
  };

  const applicableItemsText = getApplicableItemsText();

  const getOrderText = () => {
    const type = (!promo.orderType || promo.orderType === 'all') ? 'anything' : promo.orderType;
    if (applicableItemsText) {
      if (type !== 'anything') {
        return (
          <>
            Order <span style={{ color: YELLOW, fontWeight: 'bold' }}>{applicableItemsText}</span> <span style={{ fontSize: '14px', color: GRAY }}>({type})</span> &amp;
          </>
        );
      }
      return (
        <>
          Order <span style={{ color: YELLOW, fontWeight: 'bold' }}>{applicableItemsText}</span> &amp;
        </>
      );
    }
    return (
      <>
        Order <span style={{ color: YELLOW, fontWeight: 'bold', textTransform: 'capitalize' }}>{type}</span> &amp;
      </>
    );
  };

  const YELLOW = '#F5C518';
  const DARK_YELLOW = '#D4A017';
  const BLACK = '#000000';
  const WHITE = '#FFFFFF';
  const GRAY = '#AAAAAA';
  const DARK_GRAY = '#1a1a1a';

  const badgeStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #5a4500',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'inline-block',
    margin: '3px',
  };

  const badgeYellowStyle = { ...badgeStyle, color: YELLOW };

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '8px' : '16px', overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: WHITE, borderRadius: '12px', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)', maxWidth: '800px', width: '100%',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', margin: 'auto'
      }}>

        {/* Preview Area */}
        <div style={{
          flex: 1, backgroundColor: '#e5e7eb', padding: isMobile ? '16px 8px' : '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>

          {/* POSTER — All inline styles for html2canvas fidelity */}
          <div
            ref={posterRef}
            style={{
              width: '420px',
              backgroundColor: BLACK,
              color: WHITE,
              fontFamily: "'Arial Black', 'Arial', sans-serif",
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '28px 24px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Corner accent top-right */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '120px', height: '120px',
              backgroundColor: '#3a2e00',
              borderBottomLeftRadius: '120px',
            }} />
            {/* Corner accent bottom-left */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0,
              width: '150px', height: '150px',
              backgroundColor: '#2a2200',
              borderTopRightRadius: '150px',
            }} />

            {/* HEADER */}
            <div style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '10px', position: 'relative', zIndex: 1,
              marginBottom: '12px'
            }}>
              <div style={{
                width: '38px', height: '38px', backgroundColor: YELLOW,
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: BLACK, fontWeight: '900', fontSize: '18px',
                flexShrink: 0
              }}>C</div>
              <h1 style={{
                fontSize: '26px', fontWeight: '900', color: YELLOW,
                letterSpacing: '4px', margin: 0, lineHeight: 1
              }}>COMRADES360</h1>
            </div>

            {/* ORDER TYPE */}
            <p style={{
              fontSize: '18px', fontStyle: 'italic', color: WHITE,
              margin: '0 0 6px', position: 'relative', zIndex: 1,
              fontFamily: 'Georgia, serif',
              textAlign: 'center'
            }}>
              {getOrderText()}
            </p>

             {/* GET X% DISCOUNT */}
            <div style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              justifyContent: 'center', gap: '8px', width: '100%',
              position: 'relative', zIndex: 1, marginBottom: '4px'
            }}>
              <span style={{ fontSize: '28px', fontWeight: '900', color: WHITE, letterSpacing: '2px' }}>GET</span>
              <div style={{ position: 'relative', display: 'inline-block', overflow: 'visible', margin: '0 4px' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: '-6px',
                  right: '-6px',
                  backgroundColor: YELLOW,
                  transform: 'skewX(-10deg)',
                  zIndex: 0,
                }} />
                <span style={{
                  fontSize: '50px',
                  fontWeight: '900',
                  color: BLACK,
                  fontStyle: 'italic',
                  letterSpacing: '-1px',
                  position: 'relative',
                  zIndex: 1,
                  padding: '4px 12px',
                  display: 'inline-block',
                  lineHeight: '1.1'
                }}>{promo.discountPercentage}%</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: '900', color: WHITE, letterSpacing: '2px' }}>DISCOUNT!</span>
            </div>

            {/* PROMO CODE BOX */}
            <div style={{
              width: '100%', borderTop: `2px dashed ${DARK_YELLOW}`,
              borderBottom: `2px dashed ${DARK_YELLOW}`,
              padding: '10px 0', margin: '12px 0',
              textAlign: 'center', backgroundColor: '#111100',
              position: 'relative', zIndex: 1,
            }}>
              <p style={{ fontSize: '12px', color: GRAY, margin: '0 0 4px' }}>Use Promo Code At Checkout:</p>
              <h2 style={{
                fontSize: '34px', fontWeight: '900', color: YELLOW,
                letterSpacing: '4px', margin: '0 0 10px'
              }}>{promo.code}</h2>

              {/* Detail badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={badgeStyle}>
                  {promo.targetAudience === 'new_users' ? 'New Users Only' : 'All Customers'}
                </span>
                {promo.minOrderValue > 0 && (
                  <span style={badgeStyle}>Min: KES {promo.minOrderValue}</span>
                )}
                {promo.maxDiscountAmount > 0 && (
                  <span style={badgeStyle}>Max Disc: KES {promo.maxDiscountAmount}</span>
                )}
                {promo.minUserOrderCount > 0 && (
                  <span style={badgeYellowStyle}>Req: {promo.minUserOrderCount}+ Past Orders</span>
                )}
                {promo.minUserLifetimeSpend > 0 && (
                  <span style={badgeYellowStyle}>Req: KES {promo.minUserLifetimeSpend}+ Spend</span>
                )}
              </div>
            </div>

             {/* DATES — only show if at least one date is set */}
            {hasAnyDate && (
              <div style={{
                width: '100%', display: 'flex', justifyContent: (start && end) ? 'space-between' : 'center',
                alignItems: 'center', padding: '0 8px', marginBottom: '12px',
                position: 'relative', zIndex: 1,
              }}>
                {start && (
                  <div>
                    <p style={{ fontSize: '9px', color: GRAY, fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '1px' }}>Offer Starts</p>
                    <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                      <span style={{ color: WHITE }}>{start.day}</span>
                      {start.time && <span style={{ color: YELLOW, marginLeft: '8px' }}>{start.time}</span>}
                    </p>
                  </div>
                )}
                {start && end && <div style={{ width: '1px', height: '36px', backgroundColor: '#5a4500' }} />}
                {end && (
                  <div>
                    <p style={{ fontSize: '9px', color: GRAY, fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '1px' }}>Offer Ends</p>
                    <p style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', margin: 0 }}>
                      <span style={{ color: WHITE }}>{end.day}</span>
                      {end.time && <span style={{ color: YELLOW, marginLeft: '8px' }}>{end.time}</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FOOTER: No account */}
            <div style={{
              width: '100%', border: `1px solid #5a4500`, borderRadius: '8px',
              padding: '10px', textAlign: 'center', backgroundColor: DARK_GRAY,
              marginBottom: '10px', position: 'relative', zIndex: 1,
            }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: YELLOW, margin: '0 0 3px' }}>No account? No problem!</p>
              <p style={{ fontSize: '11px', color: GRAY, margin: 0 }}>Order easily as a <strong style={{ color: WHITE }}>GUEST</strong> and enjoy fast service.</p>
            </div>

            {/* CONTACT BAR */}
            <div style={{
              width: '100%', border: `1px solid ${YELLOW}`, borderRadius: '999px',
              padding: '8px 20px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', backgroundColor: BLACK,
              position: 'relative', zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: YELLOW, fontSize: '14px' }}>🌐</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: WHITE }}>comrades360.shop</span>
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#5a4500' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: YELLOW, fontSize: '14px' }}>📞</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: YELLOW }}>0757588395</span>
              </div>
            </div>

          </div>
        </div>

         {/* Controls Area */}
        <div style={{ width: isMobile ? '100%' : '220px', backgroundColor: WHITE, padding: '24px', borderLeft: isMobile ? 'none' : '1px solid #e5e7eb', borderTop: isMobile ? '1px solid #e5e7eb' : 'none', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937', margin: 0 }}>Export Poster</h3>
            <button onClick={onClose} style={{ padding: '6px', cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px', color: '#6b7280' }}>✕</button>
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Optimized for WhatsApp, Instagram & Twitter sharing. Download a high-resolution PNG.
          </p>
          <button
            onClick={handleDownload}
            style={{
              width: '100%', backgroundColor: '#2563eb', color: WHITE,
              fontWeight: 'bold', padding: '12px', borderRadius: '8px',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', marginTop: isMobile ? '16px' : 'auto', fontSize: '14px'
            }}
          >
            <Download size={18} />
            Download Poster
          </button>
        </div>

      </div>
    </div>
  );
};

export default PromoPoster;
