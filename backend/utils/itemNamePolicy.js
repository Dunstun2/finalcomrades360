const NAME_LENGTH_REFERENCE = 'kidaga kimemwoea';
const MAX_ITEM_NAME_LENGTH = NAME_LENGTH_REFERENCE.length;

const normalizeItemName = (value) => {
  if (typeof value !== 'string') return value;

  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) return collapsed;

  return collapsed.length > MAX_ITEM_NAME_LENGTH
    ? collapsed.slice(0, MAX_ITEM_NAME_LENGTH)
    : collapsed;
};

module.exports = {
  NAME_LENGTH_REFERENCE,
  MAX_ITEM_NAME_LENGTH,
  normalizeItemName,
};
