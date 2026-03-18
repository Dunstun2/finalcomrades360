/**
 * Database Backup Script
 * Supports both SQLite and MySQL backups with rotation
 */

const { sequelize } = require('../database/database');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 7; // Keep last 7 backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupSQLite() {
  const dbPath = process.env.DB_STORAGE || path.join(__dirname, '../database.sqlite');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `sqlite-backup-${timestamp}.sqlite`);

  try {
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    
    // Compress backup
    await execPromise(`powershell Compress-Archive -Path "${backupPath}" -DestinationPath "${backupPath}.zip" -Force`);
    fs.unlinkSync(backupPath); // Remove uncompressed file
    
    console.log(`✅ SQLite backup created: ${backupPath}.zip`);
    return `${backupPath}.zip`;
  } catch (error) {
    console.error('❌ SQLite backup failed:', error.message);
    throw error;
  }
}

async function backupMySQL() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `mysql-backup-${timestamp}.sql`);

  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbHost = process.env.DB_HOST || 'localhost';

  try {
    // Use mysqldump
    const command = `mysqldump -h ${dbHost} -u ${dbUser} -p${dbPass} ${dbName} > "${backupPath}"`;
    await execPromise(command);
    
    // Compress backup
    await execPromise(`powershell Compress-Archive -Path "${backupPath}" -DestinationPath "${backupPath}.zip" -Force`);
    fs.unlinkSync(backupPath); // Remove uncompressed file
    
    console.log(`✅ MySQL backup created: ${backupPath}.zip`);
    return `${backupPath}.zip`;
  } catch (error) {
    console.error('❌ MySQL backup failed:', error.message);
    throw error;
  }
}

async function rotateBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  // Remove old backups
  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    toDelete.forEach(f => {
      fs.unlinkSync(f.path);
      console.log(`🗑️  Removed old backup: ${f.name}`);
    });
  }
}

async function backupUploads() {
  const uploadsPath = path.join(__dirname, '../uploads');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `uploads-backup-${timestamp}.zip`);

  if (!fs.existsSync(uploadsPath)) {
    console.log('⚠️  No uploads directory found, skipping');
    return;
  }

  try {
    await execPromise(`powershell Compress-Archive -Path "${uploadsPath}" -DestinationPath "${backupPath}" -Force`);
    console.log(`✅ Uploads backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Uploads backup failed:', error.message);
    throw error;
  }
}

async function runBackup() {
  console.log('🔄 Starting backup process...');
  
  try {
    const dialect = sequelize.options.dialect;
    
    // Backup database
    if (dialect === 'sqlite') {
      await backupSQLite();
    } else if (dialect === 'mysql') {
      await backupMySQL();
    }
    
    // Backup uploads
    await backupUploads();
    
    // Rotate old backups
    await rotateBackups();
    
    console.log('✅ Backup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBackup();
}

module.exports = { backupSQLite, backupMySQL, backupUploads, rotateBackups };
