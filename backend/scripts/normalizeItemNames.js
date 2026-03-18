const { Op } = require('sequelize');
const { Product, FastFood, Service, sequelize } = require('../models');
const { MAX_ITEM_NAME_LENGTH, normalizeItemName } = require('../utils/itemNamePolicy');

const findUniqueName = async (Model, fieldName, baseName, currentId) => {
  let candidate = baseName;
  let counter = 2;

  while (true) {
    const existing = await Model.findOne({
      where: {
        id: { [Op.ne]: currentId },
        [Op.and]: [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col(fieldName)),
            '=',
            String(candidate).toLowerCase()
          )
        ]
      }
    });

    if (!existing) return candidate;

    const suffix = ` ${counter}`;
    const allowedBaseLength = Math.max(1, MAX_ITEM_NAME_LENGTH - suffix.length);
    candidate = `${baseName.slice(0, allowedBaseLength).trimEnd()}${suffix}`;
    counter += 1;
  }
};

const renameLongNames = async (Model, fieldName, label) => {
  const items = await Model.findAll({
    where: sequelize.where(
      sequelize.fn('LENGTH', sequelize.col(fieldName)),
      { [Op.gt]: MAX_ITEM_NAME_LENGTH }
    )
  });

  let changed = 0;
  for (const item of items) {
    const current = item[fieldName];
    const normalized = normalizeItemName(current);
    const next = await findUniqueName(Model, fieldName, normalized, item.id);
    if (next && next !== current) {
      item[fieldName] = next;
      await item.save();
      changed += 1;
      console.log(`${label}#${item.id}: "${current}" -> "${next}"`);
    }
  }

  console.log(`${label}: renamed ${changed} item(s)`);
  return changed;
};

const run = async () => {
  try {
    console.log(`Applying max name length ${MAX_ITEM_NAME_LENGTH} ("kidaga kimemwoea")`);

    const productChanges = await renameLongNames(Product, 'name', 'Product');
    const fastFoodChanges = await renameLongNames(FastFood, 'name', 'FastFood');
    const serviceChanges = await renameLongNames(Service, 'title', 'Service');

    console.log(`Done. Total renamed: ${productChanges + fastFoodChanges + serviceChanges}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to normalize item names:', error);
    process.exit(1);
  }
};

run();
