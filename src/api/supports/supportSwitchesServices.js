const supportDBService = require('./supportDBServices');
const SwitchesModel = require('../../db/models/switches/switchesModel');

class SupportSwitchesServices {

  static async getAllSwitchesService () {
    let result = {};
    result = await SwitchesModel.findAll();

    console.log(result);
    return result;
  }

  static async updateSwitchesService (req) {
    return await SwitchesModel.updateMultiple(req.body);
  }

  static async createSwitch(body) {
    return await SwitchesModel.create(body);
  }
}

module.exports = SupportSwitchesServices;
