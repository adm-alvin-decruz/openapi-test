const ConfigsModel = require('../../db/models/configsModel');

class SupportConfigsServices {

  static async getAllConfigs(config) {
    return config ? await ConfigsModel.findAllByConfig(config) : await ConfigsModel.findAll();
  }
  static async createConfig(body) {
    return await ConfigsModel.create(body)
  }
  static async deleteConfigById(id) {
    return await ConfigsModel.delete(id)
  }
  static async updateConfigById(id, body) {
    return await ConfigsModel.update(id, body)
  }
}

module.exports = SupportConfigsServices;
