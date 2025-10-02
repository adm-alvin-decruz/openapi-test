const { GROUPS_SUPPORTS } = require('../../../utils/constants');
const CommonErrors = require('../../../config/https/errors/commonErrors');
const MembershipErrors = require('../../../config/https/errors/membershipErrors');

class MembershipCheck {
  constructor() {
    this.error = null;
  }

  static execute(data) {
    if (!data.group || !GROUPS_SUPPORTS.includes(data.group)) {
      return (this.error = CommonErrors.BadRequest('group', 'group_invalid', data.language));
    }

    return (this.error = null);
  }
}

module.exports = MembershipCheck;
