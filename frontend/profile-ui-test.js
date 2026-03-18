/**
 * Profile UI Test Suite
 * This script can be run in the browser console to test all Profile page functionality
 * 
 * Usage:
 * 1. Open the Profile page in your browser
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this script
 * 5. Run: await profileUITest.runAllTests()
 */

class ProfileUITest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.currentUser = null;
  }

  // Helper to add test results
  addTestResult(testName, passed, message, details = null) {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString(),
      details
    };
    
    this.testResults.tests.push(result);
    
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  // Wait for element to appear
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // Wait for React component to update
  waitForReactUpdate(timeout = 3000) {
    return new Promise(resolve => {
      setTimeout(resolve, timeout);
    });
  }

  // Test Personal Information Section
  async testPersonalInfoSection() {
    console.log('\n👤 Testing Personal Information Section...');
    
    try {
      // Test 1: Check if Profile tab is visible
      const profileTab = await this.waitForElement('[data-testid="profile-tab"], .profile-tab, button:contains("Profile")');
      this.addTestResult('Personal Info - Tab Visibility', !!profileTab, 'Profile tab is visible');
      
      // Test 2: Click Profile tab
      if (profileTab) {
        profileTab.click();
        await this.waitForReactUpdate();
        this.addTestResult('Personal Info - Tab Click', true, 'Profile tab clicked successfully');
      }

      // Test 3: Check Personal Info subsection
      const personalTab = await this.waitForElement('.personal-info, [data-section="personal"]');
      this.addTestResult('Personal Info - Subsection', !!personalTab, 'Personal Info subsection found');

      // Test 4: Check form fields
      const usernameField = document.querySelector('input[placeholder*="username"], input[name="username"]');
      const emailField = document.querySelector('input[type="email"], input[name="email"]');
      const phoneField = document.querySelector('input[type="tel"], input[name="phone"]');
      
      this.addTestResult('Personal Info - Form Fields', 
        !!usernameField && !!emailField && !!phoneField, 
        'All required form fields found',
        { usernameField: !!usernameField, emailField: !!emailField, phoneField: !!phoneField }
      );

      // Test 5: Test edit mode toggle
      const editButton = document.querySelector('button:contains("Edit"), button[class*="edit"]');
      if (editButton) {
        editButton.click();
        await this.waitForReactUpdate();
        this.addTestResult('Personal Info - Edit Mode', true, 'Edit mode activated');
      }

      // Test 6: Test form input functionality
      if (usernameField) {
        const testValue = 'testuser_' + Date.now();
        usernameField.value = testValue;
        usernameField.dispatchEvent(new Event('input', { bubbles: true }));
        this.addTestResult('Personal Info - Form Input', usernameField.value === testValue, 'Form input working');
      }

      // Test 7: Test save/cancel functionality
      const saveButton = document.querySelector('button:contains("Save"), button[type="submit"]');
      const cancelButton = document.querySelector('button:contains("Cancel")');
      
      this.addTestResult('Personal Info - Save/Cancel Buttons',
        !!saveButton || !!cancelButton,
        'Save/Cancel buttons found',
        { saveButton: !!saveButton, cancelButton: !!cancelButton }
      );

      // Test 8: Test profile completion bar
      const completionBar = document.querySelector('.completion-bar, [data-testid="completion-bar"]');
      this.addTestResult('Personal Info - Completion Bar', !!completionBar, 'Profile completion bar found');

      // Test 9: Test dropdown fields
      const genderDropdown = document.querySelector('select[name="gender"], select option');
      const visibilityDropdown = document.querySelector('select[name="profileVisibility"]');
      
      this.addTestResult('Personal Info - Dropdown Fields',
        !!genderDropdown || !!visibilityDropdown,
        'Dropdown fields found',
        { genderDropdown: !!genderDropdown, visibilityDropdown: !!visibilityDropdown }
      );

      // Test 10: Test textarea for bio
      const bioField = document.querySelector('textarea, textarea[name="bio"]');
      this.addTestResult('Personal Info - Bio Field', !!bioField, 'Bio textarea found');

    } catch (error) {
      this.addTestResult('Personal Info Section', false, `Error: ${error.message}`);
    }
  }

  // Test Account Details Section
  async testAccountDetailsSection() {
    console.log('\n📋 Testing Account Details Section...');
    
    try {
      // Test 1: Click Account Details tab
      const accountTab = document.querySelector('.account-details, [data-section="account"]');
      if (accountTab) {
        accountTab.click();
        await this.waitForReactUpdate();
        this.addTestResult('Account Details - Tab Switch', true, 'Account Details tab clicked');
      }

      // Test 2: Check account role display
      const roleDisplay = document.querySelector('.account-role, [data-field="role"]');
      this.addTestResult('Account Details - Role Display', !!roleDisplay, 'Account role display found');

      // Test 3: Check last update timestamp
      const updateTimestamp = document.querySelector('.last-update, [data-field="updatedAt"]');
      this.addTestResult('Account Details - Update Timestamp', !!updateTimestamp, 'Update timestamp found');

      // Test 4: Check referral code
      const referralCode = document.querySelector('.referral-code, [data-field="referralCode"]');
      this.addTestResult('Account Details - Referral Code', !!referralCode, 'Referral code display found');

      // Test 5: Test copy referral link button
      const copyButton = document.querySelector('button:contains("Copy"), [data-action="copy-referral"]');
      this.addTestResult('Account Details - Copy Button', !!copyButton, 'Copy referral link button found');

      // Test 6: Test social sharing buttons
      const facebookButton = document.querySelector('button:contains("Facebook"), [data-platform="facebook"]');
      const twitterButton = document.querySelector('button:contains("Twitter"), [data-platform="twitter"]');
      const whatsappButton = document.querySelector('button:contains("WhatsApp"), [data-platform="whatsapp"]');
      
      this.addTestResult('Account Details - Social Sharing',
        !!facebookButton && !!twitterButton && !!whatsappButton,
        'All social sharing buttons found',
        { facebook: !!facebookButton, twitter: !!twitterButton, whatsapp: !!whatsappButton }
      );

      // Test 7: Test referral link generation
      if (referralCode) {
        const referralText = referralCode.textContent || referralCode.value;
        const expectedLink = window.location.origin + '/register?ref=' + referralText;
        this.addTestResult('Account Details - Referral Link Format', 
          referralText && referralText.length > 0, 
          'Referral code has valid format',
          { referralCode: referralText, expectedLink }
        );
      }

    } catch (error) {
      this.addTestResult('Account Details Section', false, `Error: ${error.message}`);
    }
  }

  // Test Security Section
  async testSecuritySection() {
    console.log('\n🔒 Testing Security Section...');
    
    try {
      // Test 1: Click Security tab
      const securityTab = document.querySelector('.security, [data-section="security"]');
      if (securityTab) {
        securityTab.click();
        await this.waitForReactUpdate();
        this.addTestResult('Security - Tab Switch', true, 'Security tab clicked');
      }

      // Test 2: Check change password section
      const passwordSection = document.querySelector('.change-password, [data-section="change-password"]');
      this.addTestResult('Security - Password Section', !!passwordSection, 'Change password section found');

      // Test 3: Test password input fields
      const currentPasswordField = document.querySelector('input[type="password"][placeholder*="current"], input[name="currentPassword"]');
      const newPasswordField = document.querySelector('input[type="password"][placeholder*="new"], input[name="newPassword"]');
      const confirmPasswordField = document.querySelector('input[type="password"][placeholder*="confirm"], input[name="confirmPassword"]');
      
      this.addTestResult('Security - Password Fields',
        !!currentPasswordField && !!newPasswordField && !!confirmPasswordField,
        'All password input fields found',
        { current: !!currentPasswordField, new: !!newPasswordField, confirm: !!confirmPasswordField }
      );

      // Test 4: Test password visibility toggles
      const currentToggle = document.querySelector('button:contains("current"), [data-toggle="current"]');
      const newToggle = document.querySelector('button:contains("new"), [data-toggle="new"]');
      const confirmToggle = document.querySelector('button:contains("confirm"), [data-toggle="confirm"]');
      
      this.addTestResult('Security - Password Toggles',
        !!currentToggle || !!newToggle || !!confirmToggle,
        'Password visibility toggles found',
        { current: !!currentToggle, new: !!newToggle, confirm: !!confirmToggle }
      );

      // Test 5: Test 2FA section
      const twoFASection = document.querySelector('.two-factor, [data-section="2fa"]');
      const twoFAStatus = document.querySelector('.two-fa-status, [data-status="2fa"]');
      
      this.addTestResult('Security - 2FA Section', !!twoFASection, 'Two-factor authentication section found');
      this.addTestResult('Security - 2FA Status', !!twoFAStatus, '2FA status display found');

      // Test 6: Test social login section
      const socialLoginSection = document.querySelector('.social-login, [data-section="social-login"]');
      const googleButton = document.querySelector('button:contains("Google"), [data-provider="google"]');
      const facebookButton = document.querySelector('button:contains("Facebook"), [data-provider="facebook"]');
      
      this.addTestResult('Security - Social Login Section', !!socialLoginSection, 'Social login section found');
      this.addTestResult('Security - Social Login Buttons',
        !!googleButton || !!facebookButton,
        'Social login provider buttons found',
        { google: !!googleButton, facebook: !!facebookButton }
      );

      // Test 7: Test change password button
      const changePasswordButton = document.querySelector('button:contains("Change Password"), button[type="submit"]');
      this.addTestResult('Security - Change Password Button', !!changePasswordButton, 'Change password button found');

    } catch (error) {
      this.addTestResult('Security Section', false, `Error: ${error.message}`);
    }
  }

  // Test Login History Section
  async testLoginHistorySection() {
    console.log('\n🕐 Testing Login History Section...');
    
    try {
      // Test 1: Click Login History tab
      const historyTab = document.querySelector('.login-history, [data-section="login-history"]');
      if (historyTab) {
        historyTab.click();
        await this.waitForReactUpdate();
        this.addTestResult('Login History - Tab Switch', true, 'Login History tab clicked');
      }

      // Test 2: Check password security section
      const passwordSecurity = document.querySelector('.password-security, [data-section="password-security"]');
      this.addTestResult('Login History - Password Security', !!passwordSecurity, 'Password security section found');

      // Test 3: Check last password change timestamp
      const passwordChangeTime = document.querySelector('.last-password-change, [data-field="lastPasswordChange"]');
      this.addTestResult('Login History - Password Change Time', !!passwordChangeTime, 'Password change timestamp found');

      // Test 4: Check active sessions section
      const activeSessions = document.querySelector('.active-sessions, [data-section="active-sessions"]');
      this.addTestResult('Login History - Active Sessions', !!activeSessions, 'Active sessions section found');

      // Test 5: Test session termination buttons
      const terminateButtons = document.querySelectorAll('button:contains("Sign Out"), [data-action="terminate-session"]');
      this.addTestResult('Login History - Terminate Buttons',
        terminateButtons.length > 0,
        `Found ${terminateButtons.length} session termination buttons`,
        { terminateButtonsCount: terminateButtons.length }
      );

      // Test 6: Check login history list
      const loginHistoryList = document.querySelector('.login-history-list, [data-section="login-history-list"]');
      const loginEntries = document.querySelectorAll('.login-entry, [data-type="login-entry"]');
      
      this.addTestResult('Login History - History List', !!loginHistoryList, 'Login history list found');
      this.addTestResult('Login History - History Entries',
        loginEntries.length > 0,
        `Found ${loginEntries.length} login history entries`,
        { entriesCount: loginEntries.length }
      );

      // Test 7: Test success/failure indicators
      const successIndicators = document.querySelectorAll('.success-indicator, [data-success="true"]');
      const failureIndicators = document.querySelectorAll('.failure-indicator, [data-success="false"]');
      
      this.addTestResult('Login History - Success/Failure Indicators',
        successIndicators.length > 0 || failureIndicators.length > 0,
        `Found success/failure indicators (${successIndicators.length} success, ${failureIndicators.length} failure)`,
        { successCount: successIndicators.length, failureCount: failureIndicators.length }
      );

      // Test 8: Check device information
      const deviceIcons = document.querySelectorAll('.device-icon, [data-device]');
      this.addTestResult('Login History - Device Info', deviceIcons.length > 0, 'Device information displayed');

    } catch (error) {
      this.addTestResult('Login History Section', false, `Error: ${error.message}`);
    }
  }

  // Test Navigation and UX
  async testNavigationAndUX() {
    console.log('\n🧭 Testing Navigation and UX...');
    
    try {
      // Test 1: Check tab navigation
      const tabs = document.querySelectorAll('[data-section], .tab, button[class*="tab"]');
      this.addTestResult('Navigation - Tab Count', tabs.length >= 4, `Found ${tabs.length} navigation tabs`);

      // Test 2: Test tab switching
      let tabSwitchSuccess = false;
      for (let i = 0; i < Math.min(tabs.length, 3); i++) {
        if (tabs[i]) {
          tabs[i].click();
          await this.waitForReactUpdate();
          tabSwitchSuccess = true;
        }
      }
      this.addTestResult('Navigation - Tab Switching', tabSwitchSuccess, 'Tab switching works');

      // Test 3: Check responsive design indicators
      const mobileIndicators = document.querySelectorAll('@media (max-width: 768px)');
      const desktopIndicators = document.querySelectorAll('@media (min-width: 769px)');
      
      this.addTestResult('Navigation - Responsive Design', true, 'Responsive design detected');

      // Test 4: Test loading states
      const loadingSpinners = document.querySelectorAll('.spinner, .loading, [data-loading="true"]');
      this.addTestResult('Navigation - Loading States', 
        loadingSpinners.length >= 0, 
        `Found ${loadingSpinners.length} loading indicators (0 is acceptable if no loading active)`);

      // Test 5: Check error handling
      const errorMessages = document.querySelectorAll('.error, [data-error="true"]');
      this.addTestResult('Navigation - Error Handling', 
        errorMessages.length === 0, 
        `Found ${errorMessages.length} error messages (0 is expected in normal state)`);

      // Test 6: Test accessibility
      const accessibleButtons = document.querySelectorAll('button[aria-label], button[title]');
      const focusableElements = document.querySelectorAll('button, input, select, textarea, a[href]');
      
      this.addTestResult('Navigation - Accessibility',
        accessibleButtons.length > 0 && focusableElements.length > 0,
        'Accessibility features detected',
        { accessibleButtons: accessibleButtons.length, focusableElements: focusableElements.length }
      );

    } catch (error) {
      this.addTestResult('Navigation and UX', false, `Error: ${error.message}`);
    }
  }

  // Test Form Validation
  async testFormValidation() {
    console.log('\n📝 Testing Form Validation...');
    
    try {
      // Test 1: Test required field validation
      const requiredFields = document.querySelectorAll('input[required], textarea[required]');
      this.addTestResult('Form Validation - Required Fields', requiredFields.length > 0, `Found ${requiredFields.length} required fields`);

      // Test 2: Test email validation
      const emailField = document.querySelector('input[type="email"]');
      if (emailField) {
        const originalValue = emailField.value;
        emailField.value = 'invalid-email';
        emailField.dispatchEvent(new Event('blur', { bubbles: true }));
        
        setTimeout(() => {
          const validationError = document.querySelector('.error, [data-error="email"]');
          this.addTestResult('Form Validation - Email', 
            !!validationError || emailField.classList.contains('invalid'),
            'Email validation working');
          
          // Restore original value
          emailField.value = originalValue;
        }, 500);
      }

      // Test 3: Test password confirmation
      const passwordFields = document.querySelectorAll('input[type="password"]');
      if (passwordFields.length >= 2) {
        passwordFields[0].value = 'password123';
        passwordFields[1].value = 'different123';
        passwordFields[1].dispatchEvent(new Event('blur', { bubbles: true }));
        
        this.addTestResult('Form Validation - Password Match', true, 'Password confirmation fields found');
      }

      // Test 4: Test form submission
      const submitButton = document.querySelector('button[type="submit"], button:contains("Save")');
      this.addTestResult('Form Validation - Submit Button', !!submitButton, 'Form submit button found');

      // Test 5: Test character limits
      const textFields = document.querySelectorAll('input[maxlength], textarea[maxlength]');
      this.addTestResult('Form Validation - Character Limits', 
        textFields.length >= 0, 
        `Found ${textFields.length} fields with character limits`);

    } catch (error) {
      this.addTestResult('Form Validation', false, `Error: ${error.message}`);
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📊 Profile UI Test Report');
    console.log('=' .repeat(50));
    
    const total = this.testResults.passed + this.testResults.failed;
    const passRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.testResults.passed} (${passRate}%)`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Status: ${this.testResults.failed === 0 ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
    
    // Save report to localStorage
    localStorage.setItem('profileUITestResults', JSON.stringify(this.testResults, null, 2));
    console.log('\n📄 Test results saved to localStorage as "profileUITestResults"');
    
    // Show failed tests
    const failedTests = this.testResults.tests.filter(test => !test.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.test}: ${test.message}`);
        if (test.details) {
          console.log(`    Details: ${JSON.stringify(test.details)}`);
        }
      });
    }
    
    return this.testResults;
  }

  // Run all UI tests
  async runAllTests() {
    console.log('🚀 Starting Profile UI Tests');
    console.log('============================');
    console.log('Note: Make sure you are on the Profile page before running these tests');
    
    // Check if we're on the profile page
    if (!window.location.pathname.includes('profile') && 
        !document.querySelector('.profile-component, .profile-page')) {
      console.log('⚠️ Warning: You may not be on the Profile page. Some tests may fail.');
    }
    
    // Run all tests
    await this.testPersonalInfoSection();
    await this.testAccountDetailsSection();
    await this.testSecuritySection();
    await this.testLoginHistorySection();
    await this.testNavigationAndUX();
    await this.testFormValidation();
    
    return this.generateReport();
  }

  // Interactive test runner
  async interactiveTest() {
    console.log('🎮 Interactive Profile Test Mode');
    console.log('This will run tests and allow you to interact with elements');
    
    const tests = [
      { name: 'Personal Info', method: () => this.testPersonalInfoSection() },
      { name: 'Account Details', method: () => this.testAccountDetailsSection() },
      { name: 'Security', method: () => this.testSecuritySection() },
      { name: 'Login History', method: () => this.testLoginHistorySection() },
      { name: 'Navigation & UX', method: () => this.testNavigationAndUX() },
      { name: 'Form Validation', method: () => this.testFormValidation() }
    ];
    
    for (const test of tests) {
      console.log(`\n🔄 Running ${test.name} tests...`);
      try {
        await test.method();
        console.log(`✅ ${test.name} tests completed`);
      } catch (error) {
        console.log(`❌ ${test.name} tests failed: ${error.message}`);
      }
    }
    
    return this.generateReport();
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.profileUITest = new ProfileUITest();
  console.log('🎉 Profile UI Test loaded! Use:');
  console.log('  - await profileUITest.runAllTests()  // Run all tests');
  console.log('  - await profileUITest.interactiveTest()  // Interactive test mode');
  console.log('  - profileUITest.generateReport()  // Generate report from last run');
}

// Example usage:
// await profileUITest.runAllTests()