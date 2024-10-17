const switchDBModel = require('../db/models/switches/switcheModel');

class SwitchService {
  static async getAllSwitches() {
    return await switchDBModel.findAll();
  }

  static async findSwitchValue(data, name) {
    // Check if data is an object (including arrays)
    if (typeof data !== 'object' || data === null) {
      console.error('SwitchService Error: Input data must be an object or an array');
      return false;
    }

    // Check if name is a string
    if (typeof name !== 'string') {
      console.error('SwitchService Error: Name must be a string');
      return false;
    }

    try {
      if (Array.isArray(data)) {
        // If data is an array, use the previous logic
        const item = data.find(item => item.name === name);
        return item ? Boolean(item.switch) : false;
      } else {
        // If data is an object, directly access the property
        if (data.hasOwnProperty(name)) {
          return Boolean(data[name].switch);
        } else {
          return false;
        }
      }
    } catch (error) {
      console.error('SwitchService Error occurred while searching:', error.message);
      return false;
    }
  }
}

module.exports = SwitchService;