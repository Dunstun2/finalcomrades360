/**
 * Database Restoration Script
 * Restore from backup files
 */

const { sequelize } = require('../database/database');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);
const BACKUP_DIR = path.join(__dirname, '../backups');

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('⚠️  No backups directory found');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
      size: fs.statSync(path.join(BACKUP_DIR, f)).size
    }))
    .sort((a, b) => b.time - a.time);

  return files;
}

async function restoreSQLite(backupPath) {
  const dbPath = process.env.DB_STORAGE || path.join(__dirname, '../database.sqlite');
  const tempExtractPath = path.join(BACKUP_DIR, 'temp-restore');

  try {
    // Create temp directory
    if (!fs.existsSync(tempExtractPath)) {
      fs.mkdirSync(tempExtractPath, { recursive: true });
    }

    // Extract backup
    await execPromise(`powershell Expand-Archive -Path "${backupPath}" -DestinationPath "${tempExtractPath}" -Force`);
    
    // Find extracted .sqlite file
    const files = fs.readdirSync(tempExtractPath).filter(f => f.endsWith('.sqlite'));
    if (files.length === 0) {
      throw new Error('No .sqlite file found in backup');
    }

    // Backup current database
    const currentBackup = `${dbPath}.pre-restore-${Date.now()}.bak`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, currentBackup);
      console.log(`📦 Current database backed up to: ${currentBackup}`);
    }

    // Restore from backup
    const extractedFile = path.join(tempExtractPath, files[0]);
    fs.copyFileSync(extractedFile, dbPath);

    // Cleanup
    fs.rmSync(tempExtractPath, { recursive: true, force: true });

    console.log(`✅ SQLite database restored from: ${backupPath}`);
  } catch (error) {
    console.error('❌ SQLite restore failed:', error.message);
    throw error;
  }
}

async function restoreMySQL(backupPath) {
  const tempExtractPath = path.join(BACKUP_DIR, 'temp-restore');
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbHost = process.env.DB_HOST || 'localhost';

  try {
    // Create temp directory
    if (!fs.existsSync(tempExtractPath)) {
      fs.mkdirSync(tempExtractPath, { recursive: true });
    }

    // Extract backup
    await execPromise(`powershell Expand-Archive -Path "${backupPath}" -DestinationPath "${tempExtractPath}" -Force`);
    
    // Find extracted .sql file
    const files = fs.readdirSync(tempExtractPath).filter(f => f.endsWith('.sql'));
    if (files.length === 0) {
      throw new Error('No .sql file found in backup');
    }

    const sqlFile = path.join(tempExtractPath, files[0]);
    
    // Restore database
    const command = `mysql -h ${dbHost} -u ${dbUser} -p${dbPass} ${dbName} < "${sqlFile}"`;
    await execPromise(command);

    // Cleanup
    fs.rmSync(tempExtractPath, { recursive: true, force: true });

    console.log(`✅ MySQL database restored from: ${backupPath}`);
  } catch (error) {
    console.error('❌ MySQL restore failed:', error.message);
    throw error;
  }
}

async function runRestore(backupFile) {
  if (!backupFile) {
    console.log('📋 Available backups:');
    const backups = await listBackups();
    backups.forEach((b, i) => {
      console.log(`${i + 1}. ${b.name} (${new Date(b.time).toLocaleString()}, ${(b.size / 1024).toFixed(2)} KB)`);
    });
    console.log('\nUsage: node restore-database.js <backup-filename>');
    return;
  }

  const backupPath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`🔄 Restoring from: ${backupFile}`);
  
  const dialect = sequelize.options.dialect;
  
  try {
    if (dialect === 'sqlite' && backupFile.includes('sqlite')) {
      await restoreSQLite(backupPath);
    } else if (dialect === 'mysql' && backupFile.includes('mysql')) {
      await restoreMySQL(backupPath);
    } else {
      throw new Error(`Backup type mismatch. Current DB: ${dialect}, Backup: ${backupFile}`);
    }
    
    console.log('✅ Restore completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const backupFile = process.argv[2];
  runRestore(backupFile);
}

module.exports = { restoreSQLite, restoreMySQL, listBackups };
