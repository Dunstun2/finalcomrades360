const fs = require('fs');
const path = require('path');

// Database migration generator for all Sequelize models
// Generates migration files based on model definitions

const models = require('../models');
const { sequelize } = require('../database/database');

// Helper to convert Sequelize data types to migration format
function getDataTypeString(field) {
  const type = field.type;
  
  if (!type) return 'DataTypes.STRING';
  
  const typeName = type.key || type.constructor.name;
  
  switch(typeName) {
    case 'INTEGER':
      return 'DataTypes.INTEGER';
    case 'BIGINT':
      return 'DataTypes.BIGINT';
    case 'STRING':
      const length = type._length || 255;
      return `DataTypes.STRING${length !== 255 ? `(${length})` : ''}`;
    case 'TEXT':
      return 'DataTypes.TEXT';
    case 'BOOLEAN':
      return 'DataTypes.BOOLEAN';
    case 'DATE':
    case 'DATETIME':
      return 'DataTypes.DATE';
    case 'DECIMAL':
      const precision = type._precision || 10;
      const scale = type._scale || 2;
      return `DataTypes.DECIMAL(${precision}, ${scale})`;
    case 'FLOAT':
      return 'DataTypes.FLOAT';
    case 'DOUBLE':
      return 'DataTypes.DOUBLE';
    case 'JSON':
    case 'JSONB':
      return 'DataTypes.JSON';
    case 'ENUM':
      const values = type.values || [];
      return `DataTypes.ENUM(${values.map(v => `'${v}'`).join(', ')})`;
    case 'UUID':
      return 'DataTypes.UUID';
    default:
      return 'DataTypes.STRING';
  }
}

// Generate migration content
function generateMigrationContent(modelName, tableName, attributes) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  
  let columnDefinitions = '';
  
  for (const [fieldName, field] of Object.entries(attributes)) {
    const dataType = getDataTypeString(field);
    const allowNull = field.allowNull !== false;
    const primaryKey = field.primaryKey || false;
    const autoIncrement = field.autoIncrement || false;
    const unique = field.unique || false;
    const defaultValue = field.defaultValue !== undefined ? 
      (typeof field.defaultValue === 'string' ? `'${field.defaultValue}'` : field.defaultValue) : null;
    
    let fieldDef = `        ${fieldName}: {\n`;
    fieldDef += `          type: ${dataType}`;
    
    if (primaryKey) fieldDef += `,\n          primaryKey: true`;
    if (autoIncrement) fieldDef += `,\n          autoIncrement: true`;
    if (!allowNull) fieldDef += `,\n          allowNull: false`;
    if (unique) fieldDef += `,\n          unique: true`;
    if (defaultValue !== null && !autoIncrement) {
      fieldDef += `,\n          defaultValue: ${defaultValue}`;
    }
    
    // Handle references
    if (field.references) {
      fieldDef += `,\n          references: {\n`;
      fieldDef += `            model: '${field.references.model}',\n`;
      fieldDef += `            key: '${field.references.key || 'id'}'\n`;
      fieldDef += `          }`;
      
      if (field.onDelete) {
        fieldDef += `,\n          onDelete: '${field.onDelete}'`;
      }
      if (field.onUpdate) {
        fieldDef += `,\n          onUpdate: '${field.onUpdate}'`;
      }
    }
    
    if (field.comment) {
      fieldDef += `,\n          comment: '${field.comment}'`;
    }
    
    fieldDef += `\n        }`;
    columnDefinitions += fieldDef + ',\n';
  }
  
  // Remove trailing comma
  columnDefinitions = columnDefinitions.trim().replace(/,$/, '');
  
  const migrationContent = `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('${tableName}', {
${columnDefinitions},
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Add indexes if needed
    // await queryInterface.addIndex('${tableName}', ['columnName']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('${tableName}');
  }
};
`;

  return migrationContent;
}

// Generate migrations for all models
async function generateAllMigrations() {
  const migrationsDir = path.join(__dirname, '../migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  let counter = 0;
  
  console.log('🔄 Generating migrations for all models...\n');
  
  for (const [modelName, model] of Object.entries(models)) {
    // Skip sequelize instance
    if (modelName === 'sequelize' || !model.tableName || !model.rawAttributes) {
      continue;
    }
    
    const tableName = model.tableName;
    const attributes = model.rawAttributes;
    
    // Generate migration file
    const migrationFilename = `${timestamp}${String(counter).padStart(2, '0')}-create-${tableName.toLowerCase()}.js`;
    const migrationPath = path.join(migrationsDir, migrationFilename);
    
    // Skip if migration already exists
    if (fs.existsSync(migrationPath)) {
      console.log(`⏭️  Skipping ${modelName} - migration already exists`);
      counter++;
      continue;
    }
    
    const content = generateMigrationContent(modelName, tableName, attributes);
    
    fs.writeFileSync(migrationPath, content, 'utf8');
    console.log(`✅ Generated: ${migrationFilename}`);
    
    counter++;
  }
  
  console.log(`\n🎉 Migration generation complete! Created ${counter} migration files.`);
  console.log(`\nTo run migrations, use:`);
  console.log(`  npx sequelize-cli db:migrate`);
  console.log(`\nTo rollback, use:`);
  console.log(`  npx sequelize-cli db:migrate:undo`);
}

// Run if executed directly
if (require.main === module) {
  generateAllMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error generating migrations:', error);
      process.exit(1);
    });
}

module.exports = { generateAllMigrations, generateMigrationContent };
