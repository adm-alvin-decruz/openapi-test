const supportDBService = require('./supportDBServices');
const SwitchesModel = require('../../db/models/switches/switcheModel');

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
}

module.exports = SupportSwitchesServices;