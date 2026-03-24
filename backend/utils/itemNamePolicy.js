const NAME_LENGTH_REFERENCE = 'this is a long enough product name to avoid being truncated early';
const MAX_ITEM_NAME_LENGTH = 32; // Reverted to 32 for single-line layout as requested by user

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
