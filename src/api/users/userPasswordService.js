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
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(special);

    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    return this.shuffleString(password);
  }

  /**
   * Helper function to get a random character from a string
   *
   * @param {string} str
   * @returns
   */
  static getRandomChar(str) {
    const randomIndex = this.getSecureRandomInt(0, str.length);
    return str[randomIndex];
  }

  /**
   * Helper function to generate a secure random integer within a range
   *
   * @param {int} min
   * @param {int} max
   * @returns
   */
  static getSecureRandomInt(min, max) {
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxNum = Math.pow(256, bytesNeeded);
    const cutoff = maxNum - (maxNum % range);

    let randomInt;
    do {
      randomInt = parseInt(crypto.randomBytes(bytesNeeded).toString('hex'), 16);
    } while (randomInt >= cutoff);

    return min + (randomInt % range);
  }

  /**
   * Helper function to shuffle the password string
   *
   * @param {string} str
   * @returns
   */
  static shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.getSecureRandomInt(0, i + 1);
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

  static createHash(binaryKey, hashAlgorithm = 'sha1') {
    if (!hashAlgorithm) hashAlgorithm = 'sha1';

    // Verify the algorithm is supported
    if (!crypto.getHashes().includes(hashAlgorithm.toLowerCase())) {
      throw new Error(`Unrecognized hash name: ${hashAlgorithm}`);
    }

    // Compute the hash
    const hash = crypto.createHash(hashAlgorithm);
    return hash.update(binaryKey).digest('hex');
  }

  static createPassword(password, saltKey, passwordFormat = 'sha1') {
    const keyword = Buffer.from(`${password}${saltKey}`.trim(), 'utf8');
    return this.createHash(keyword, passwordFormat);
  }

  static createSaltKey(size) {
    const buffer = crypto.randomBytes(size);
    return buffer.toString('base64');
  }
}

module.exports = PasswordService;
