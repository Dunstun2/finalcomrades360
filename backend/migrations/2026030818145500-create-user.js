'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Skip if table already exists (for idempotence)
    const tables = await queryInterface.showAllTables();
    if (tables.includes('User')) return;

    await queryInterface.createTable('User', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      publicId: {
        type: Sequelize.STRING,
        unique: true
      },
      role: {
        type: Sequelize.STRING,
        defaultValue: 'customer',
        references: {
          model: 'Roles',
          key: 'id'
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE'
      },
      roles: {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: 'Array of all approved roles for this user'
      },
      referralCode: {
        type: Sequelize.STRING,
        unique: true
      },
      referredByReferralCode: {
        type: Sequelize.STRING,
        comment: 'Referral code used during registration for marketing tracking'
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'General account verification status - used for role applicants (set true when application approved)'
      },
      applicationStatus: {
        type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'),
        defaultValue: 'none'
      },
      deletionRequested: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isDeactivated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isFrozen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      twoFactorSecret: {
        type: Sequelize.STRING
      },
      twoFactorRecoveryCodes: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      twoFactorBackupCodes: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      pendingEmail: {
        type: Sequelize.STRING
      },
      emailChangeToken: {
        type: Sequelize.STRING
      },
      emailChangeExpiresAt: {
        type: Sequelize.DATE
      },
      pendingPhone: {
        type: Sequelize.STRING
      },
      phoneOtp: {
        type: Sequelize.STRING
      },
      phoneOtpExpiresAt: {
        type: Sequelize.DATE
      },
      county: {
        type: Sequelize.STRING
      },
      town: {
        type: Sequelize.STRING
      },
      estate: {
        type: Sequelize.STRING
      },
      houseNumber: {
        type: Sequelize.STRING
      },
      businessAddress: {
        type: Sequelize.TEXT,
        comment: 'Seller business/store physical address'
      },
      businessCounty: {
        type: Sequelize.STRING,
        comment: 'Business location county'
      },
      businessTown: {
        type: Sequelize.STRING,
        comment: 'Business location town/city'
      },
      businessLandmark: {
        type: Sequelize.STRING,
        comment: 'Nearby landmark for business location'
      },
      businessPhone: {
        type: Sequelize.STRING,
        comment: 'Business contact phone (may differ from personal phone)'
      },
      businessLat: {
        type: Sequelize.DECIMAL(10, 8),
        comment: 'Latitude for seller business location calculation'
      },
      businessLng: {
        type: Sequelize.DECIMAL(11, 8),
        comment: 'Longitude for seller business location calculation'
      },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other')
      },
      bio: {
        type: Sequelize.TEXT
      },
      dateOfBirth: {
        type: Sequelize.STRING
      },
      campus: {
        type: Sequelize.STRING
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      phoneVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      nationalIdUrl: {
        type: Sequelize.TEXT
      },
      nationalIdStatus: {
        type: Sequelize.ENUM('none', 'pending', 'approved', 'rejected'),
        defaultValue: 'none'
      },
      nationalIdRejectionReason: {
        type: Sequelize.STRING
      },
      nationalIdNumber: {
        type: Sequelize.STRING,
        comment: 'National ID number provided by user/admin during verification'
      },
      accessRestrictions: {
        type: Sequelize.JSON,
        defaultValue: []
      },
      banReason: {
        type: Sequelize.STRING
      },
      emailVerificationToken: {
        type: Sequelize.STRING
      },
      phoneVerificationCode: {
        type: Sequelize.STRING
      },
      lastLogin: {
        type: Sequelize.DATE
      },
      profileImage: {
        type: Sequelize.STRING
      },
      profileVisibility: {
        type: Sequelize.ENUM('public', 'private'),
        defaultValue: 'public'
      },
      walletBalance: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      loyaltyPoints: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('User');
  }
};
