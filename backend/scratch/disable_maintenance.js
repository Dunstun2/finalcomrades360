const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function disableMaintenance() {
  try {
    console.log('🔄 Standalone Maintenance Deactivation Starting...');
    
    // 1. Manually find and read .env
    const possibleEnvPaths = [
      path.join(__dirname, '../.env'),
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'backend', '.env'),
      '/home/vdranjxy/comrades-backend/.env'
    ];
    
    let envContent = '';
    for (const p of possibleEnvPaths) {
      if (fs.existsSync(p)) {
        console.log(`[Env] Found .env at: ${p}`);
        envContent = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!envContent) {
      console.error('❌ Could not find .env file. Please run this in the backend folder.');
      process.exit(1);
    }

    // 2. Parse basic DB credentials from string (to avoid dotenv dependency)
    const getVal = (key) => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      return match ? match[1].trim().replace(/['"]/g, '') : null;
    };

    const config = {
      host: getVal('DB_HOST') || 'localhost',
      user: getVal('DB_USER'),
      password: getVal('DB_PASS'),
      database: getVal('DB_NAME'),
      port: parseInt(getVal('DB_PORT') || '3306')
    };

    if (!config.user || !config.database) {
      console.error('❌ Incomplete DB credentials in .env');
      process.exit(1);
    }

    console.log(`[DB] Connecting to ${config.database} as ${config.user}...`);
    
    const connection = await mysql.createConnection(config);
    
    // 3. Update query
    const [rows] = await connection.execute(
      "SELECT `value` FROM PlatformConfigs WHERE `key` = 'maintenance_settings' LIMIT 1"
    );

    if (rows.length === 0) {
      console.log('ℹ️ No maintenance_settings record found.');
    } else {
      const currentSettings = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
      console.log('📊 Current Settings:', currentSettings);

      if (currentSettings.enabled === false) {
        console.log('✅ Maintenance mode is already disabled.');
      } else {
        currentSettings.enabled = false;
        await connection.execute(
          "UPDATE PlatformConfigs SET `value` = ?, `updatedAt` = ? WHERE `key` = 'maintenance_settings'",
          [JSON.stringify(currentSettings), new Date().toISOString()]
        );
        console.log('🚀 SUCCESS: Maintenance mode disabled.');
      }
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('mysql2')) {
      console.error('TIP: Run "npm install mysql2" if you get a module not found error.');
    }
    process.exit(1);
  }
}

disableMaintenance();
