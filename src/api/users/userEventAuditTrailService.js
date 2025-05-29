require("dotenv").config();
const userEventAuditTrailModel = require("../../db/models/userEventAuditTrailModel");
const userModel = require("../../db/models/userModel");

class UserCredentialEventService {
  generateEventModel(status, eventType, eventData, source) {
    if (status === "success") {
      return {
        eventType: eventType,
        data: eventData,
        source: source,
        status: 1
      }
    }
    if (status === "failed") {
      return {
        eventType: eventType,
        data: eventData,
        source: source,
        status: 0
      }
    }
    return null
  }

  async createEvent(email, status, eventType, eventData, source, userId = null) {
    const data = this.generateEventModel(status, eventType, eventData, source);
    return await userEventAuditTrailModel.create(email, userId, data);
  }
}

module.exports = new UserCredentialEventService();
