const fs = require('fs');

const path = 'c:/Users/user/Desktop/comrades360-main/frontend/src/pages/dashboard/SystemSettings.jsx';
let content = fs.readFileSync(path, 'utf8');

// Update TemplateInput definition
content = content.replace(
  `const TemplateInput = ({ label, value, onChange, templateKey }) => {`,
  `const TemplateInput = ({ label, value, onChange, templateKey, channels, onChannelChange }) => {`
);

const checkboxesBlock = `
      <div className="flex flex-wrap gap-2 mt-1">
        {['{name}', '{orderNumber}', '{total}', '{agentName}', '{stationName}', '{otp}', '{amount}'].map(tag => (
          <span key={tag} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 cursor-pointer hover:text-blue-600 hover:border-blue-200" onClick={() => onChange((value || '') + ' ' + tag)}>{tag}</span>
        ))}
      </div>
      {channels && onChannelChange && (
        <div className="flex flex-wrap gap-4 mt-3 mb-1 border-t border-gray-100 pt-3">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter w-full block">Send via:</span>
          {['whatsapp', 'sms', 'email', 'in_app'].map(ch => (
            <label key={ch} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 cursor-pointer">
              <input 
                type="checkbox" 
                checked={channels[ch] !== false} 
                onChange={(e) => onChannelChange({ ...channels, [ch]: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
              />
              {ch.replace('_', '-').toUpperCase()}
            </label>
          ))}
        </div>
      )}
`;

content = content.replace(
  `      <div className="flex flex-wrap gap-2 mt-1">
        {['{name}', '{orderNumber}', '{total}', '{agentName}', '{stationName}', '{otp}', '{amount}'].map(tag => (
          <span key={tag} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 cursor-pointer hover:text-blue-600 hover:border-blue-200" onClick={() => onChange((value || '') + ' ' + tag)}>{tag}</span>
        ))}
      </div>`,
  checkboxesBlock
);

// Regex to match all <TemplateInput ... /> calls
const regex = /<TemplateInput\s+label="([^"]+)"\s+(?:templateKey="([^"]+)"\s+)?value=\{settings\.whatsapp_config\.templates\?\.(\w+)\}\s+onChange=\{\(v\)\s*=>\s*setSettings\(p\s*=>\s*\(\{\.\.\.p,\s*whatsapp_config:\s*\{\.\.\.p\.whatsapp_config,\s*templates:\s*\{\.\.\.p\.whatsapp_config\.templates,\s*\w+:\s*v\}\}\s*\}\)\)\s*\}\s*\/>/g;

content = content.replace(regex, (match, label, templateKeyAttr, tKey) => {
    const key = templateKeyAttr || tKey;
    return match.replace('/>', `templateKey="${key}" channels={settings.whatsapp_config.channels?.${key} || { whatsapp: true, sms: true, email: true, in_app: true }} onChannelChange={(ch) => setSettings(p => ({...p, whatsapp_config: {...p.whatsapp_config, channels: {...(p.whatsapp_config.channels || {}), [key]: ch}} }))} />`);
});

fs.writeFileSync(path, content);
console.log('Done replacing TemplateInput calls!');
