require('dotenv').config();
const userCredentialEventsModel = require('../../db/models/userCredentialEventsModel');
const userModel = require('../../db/models/userModel');

class UserCredentialEventService {
  async updateEventStatus(eventId, status) {
    return await userCredentialEventsModel.updateStatus(eventId, status);
  }

  async createEvent(event, userId = null, email = null, mandaiId = null) {
    const eventData = {
      eventType: event.eventType,
      data: event.data,
      source: event.source,
      status: event.status,
    };
    if (userId) {
      return await userCredentialEventsModel.create(userId, eventData);
    }
    const userInfo = await userModel.findByEmailOrMandaiId(email, mandaiId);
    if (userInfo) {
      return await userCredentialEventsModel.create(userInfo.id, eventData);
    }
  }
}

module.exports = new UserCredentialEventService();
