const crypto = require('crypto');
const argon2 = require('argon2');

class PasswordService {

  /**
   * Function to generate a password based on the specified policy
   *
   * @param {int} length
   * @returns
   */
  static generatePassword(length = 8) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return this.shuffleString(password);
  }

  // Helper function to shuffle the password string
  static shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  /**
   * Function to hash the password (similar to Laravel's password hash method)
   *
   * @param {string} password
   * @returns
   */
  static async hashPassword(password) {
    try {
      return await argon2.hash(password);
    } catch (err) {
      console.error('Error hashing password:', err);
      throw err;
    }
  }

  /**
   * Function to compare input password with hashed password from DB
   *
   * @param {string} inputPassword
   * @param {string} hashedPassword
   * @returns
   */
  static async comparePassword(inputPassword, hashedPassword) {
    try {
      return await argon2.verify(hashedPassword, inputPassword);
    } catch (err) {
      console.error('Error verifying password:', err);
      throw err;
    }
  }
}

module.exports = PasswordService;
