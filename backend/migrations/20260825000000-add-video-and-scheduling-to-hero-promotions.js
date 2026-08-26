'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('HeroPromotions')
      ? 'HeroPromotions'
      : tables.includes('HeroPromotion')
        ? 'HeroPromotion'
        : null;

    if (!targetTable) {
      console.warn('No HeroPromotion table found; skipping video/scheduling migration.');
      return;
    }

    const tableDescription = await queryInterface.describeTable(targetTable);

    const addColumnIfMissing = async (columnName, definition) => {
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(targetTable, columnName, definition);
      }
    };

    await addColumnIfMissing('videoUrl', { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing('videoType', { type: DataTypes.STRING, allowNull: true, defaultValue: 'background' });
    await addColumnIfMissing('videoAutoplay', { type: DataTypes.BOOLEAN, defaultValue: true });
    await addColumnIfMissing('videoLoop', { type: DataTypes.BOOLEAN, defaultValue: true });
    await addColumnIfMissing('videoMuted', { type: DataTypes.BOOLEAN, defaultValue: true });
    await addColumnIfMissing('scheduleType', { type: DataTypes.STRING, defaultValue: 'continuous' });
    await addColumnIfMissing('recurringDays', { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing('specificDates', { type: DataTypes.TEXT, allowNull: true });
    await addColumnIfMissing('timeSlotStart', { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing('timeSlotEnd', { type: DataTypes.STRING, allowNull: true });
    await addColumnIfMissing('timezone', { type: DataTypes.STRING, defaultValue: 'Africa/Nairobi' });
    await addColumnIfMissing('dateTimeMode', { type: DataTypes.STRING, defaultValue: 'same' });
    await addColumnIfMissing('dateSpecificTimes', { type: DataTypes.TEXT, allowNull: true });

    console.log(`✅ Added video and scheduling columns to ${targetTable} table`);
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const targetTable = tables.includes('HeroPromotions')
      ? 'HeroPromotions'
      : tables.includes('HeroPromotion')
        ? 'HeroPromotion'
        : null;

    if (!targetTable) return;

    const tableDescription = await queryInterface.describeTable(targetTable);
    const removeColumnIfPresent = async (columnName) => {
      if (tableDescription[columnName]) {
        await queryInterface.removeColumn(targetTable, columnName);
      }
    };

    await removeColumnIfPresent('videoUrl');
    await removeColumnIfPresent('videoType');
    await removeColumnIfPresent('videoAutoplay');
    await removeColumnIfPresent('videoLoop');
    await removeColumnIfPresent('videoMuted');
    await removeColumnIfPresent('scheduleType');
    await removeColumnIfPresent('recurringDays');
    await removeColumnIfPresent('specificDates');
    await removeColumnIfPresent('timeSlotStart');
    await removeColumnIfPresent('timeSlotEnd');
    await removeColumnIfPresent('timezone');
    await removeColumnIfPresent('dateTimeMode');
    await removeColumnIfPresent('dateSpecificTimes');

    console.log(`✅ Removed video and scheduling columns from ${targetTable} table`);
  }
};
