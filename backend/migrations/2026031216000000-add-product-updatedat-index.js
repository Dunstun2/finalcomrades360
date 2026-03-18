'use strict';

async function findProductTable(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((table) => {
    if (typeof table === 'string') return table;
    return table.tableName || table.name;
  });

  if (names.includes('Product')) return 'Product';
  if (names.includes('Products')) return 'Products';
  return null;
}

module.exports = {
  async up(queryInterface) {
    const tableName = await findProductTable(queryInterface);
    if (!tableName) return;

    const indexes = await queryInterface.showIndex(tableName);
    const hasIndex = indexes.some((index) => index.name === 'product_updated_at_idx');
    if (hasIndex) return;

    await queryInterface.addIndex(tableName, ['updatedAt'], {
      name: 'product_updated_at_idx'
    });
  },

  async down(queryInterface) {
    const tableName = await findProductTable(queryInterface);
    if (!tableName) return;

    const indexes = await queryInterface.showIndex(tableName);
    const hasIndex = indexes.some((index) => index.name === 'product_updated_at_idx');
    if (!hasIndex) return;

    await queryInterface.removeIndex(tableName, 'product_updated_at_idx');
  }
};
