const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model { }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    publicId: {
      type: DataTypes.STRING,
      unique: true
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'customer',
      references: {
        model: 'Roles',
        key: 'id'
      }
    },
    roles: {
      type: DataTypes.JSON,
      defaultValue: ['customer'],
      comment: 'Array of all approved roles for this user'
    },
    referralCode: {
      type: DataTypes.STRING,
      unique: true
    },
    referredByReferralCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Referral code used during registration for marketing tracking'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'General account verification status - used for role applicants (set true when application approved)'
    },

    applicationStatus: {
      type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
      defaultValue: 'none'
    },
    deletionRequested: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    isDeactivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isFrozen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // 2FA fields
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    twoFactorRecoveryCodes: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    twoFactorBackupCodes: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    // Pending verification fields
    pendingEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailChangeToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailChangeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pendingPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneOtp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Address fields for delivery
    county: {
      type: DataTypes.STRING,
      allowNull: true
    },
    town: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estate: {
      type: DataTypes.STRING,
      allowNull: true
    },
    houseNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Seller business location fields (for pickup/delivery)
    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Seller business/store physical address'
    },
    businessCounty: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Business location county'
    },
    businessTown: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Business location town/city'
    },
    businessLandmark: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nearby landmark for business location'
    },
    businessPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Business contact phone (may differ from personal phone)'
    },
    businessLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitude for seller business location calculation'
    },
    businessLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitude for seller business location calculation'
    },
    // Personal information fields
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    campus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Verification fields
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    nationalIdUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nationalIdStatus: {
      type: DataTypes.ENUM('none', 'pending', 'approved', 'rejected'),
      defaultValue: 'none'
    },
    nationalIdRejectionReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nationalIdNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'National ID number provided by user/admin during verification'
    },
    // Access control
    accessRestrictions: {
      type: DataTypes.JSON,
      defaultValue: {
        marketplace: true,
        sellerPortal: false,
        marketingTools: false,
        commissionAccess: false,
        adminPanel: false
      }
    },
    // Ban/deactivation reason
    banReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Additional verification fields
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Last login tracking
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profileVisibility: {
      type: DataTypes.ENUM('public', 'private'),
      defaultValue: 'public'
    },
    walletBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    loyaltyPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    sequelize,
    timestamps: true,
    modelName: 'User',
    tableName: 'User',  // Explicitly set to match the actual table name in the database
  });

  // Returns true if the user meets all verification criteria
  User.isVerifiedCriteriaMet = function (user) {
    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(user.role) ||
      (user.roles && user.roles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r)));

    if (isAdmin) return true;

    return !!(user.emailVerified && user.phoneVerified && user.nationalIdStatus === 'approved');
  };

  // Instance method to recalculate and save isVerified status
  User.prototype.recalculateIsVerified = async function () {
    const shouldBeVerified = User.isVerifiedCriteriaMet(this);
    if (this.isVerified !== shouldBeVerified) {
      this.isVerified = shouldBeVerified;
      await this.save({ fields: ['isVerified'] });
      return true;
    }
    return false;
  };

  // Define associations
  User.associate = function (models) {
    // A user can have many role applications
    User.hasMany(models.RoleApplication, {
      foreignKey: 'userId',
      as: 'roleApplications'
    });

    // A user can be a reviewer of role applications
    User.hasMany(models.RoleApplication, {
      foreignKey: 'reviewedBy',
      as: 'reviewedApplications'
    });

    // A user has many notifications
    User.hasMany(models.Notification, {
      foreignKey: 'userId',
      as: 'notifications'
    });

    // A user can have many social media accounts (via referralCode)
    User.hasMany(models.SocialMediaAccount, {
      foreignKey: 'userReferralCode',
      sourceKey: 'referralCode',
      as: 'socialMediaAccounts'
    });

    // A user can have many roles
    User.hasMany(models.UserRole, {
      foreignKey: 'userId',
      as: 'userRoles'
    });

    // A user belongs to a role
    User.belongsTo(models.Role, {
      foreignKey: 'role',
      targetKey: 'id',
      as: 'roleDetails'
    });

    // A user has many login history records
    User.hasMany(models.LoginHistory, {
      foreignKey: 'userId',
      as: 'loginHistory'
    });

    // A delivery agent user has a delivery profile
    User.hasOne(models.DeliveryAgentProfile, {
      foreignKey: 'userId',
      as: 'deliveryProfile'
    });

    // A user has one wallet
    User.hasOne(models.Wallet, {
      foreignKey: 'userId',
      as: 'wallet'
    });
  };

  return User;
};
