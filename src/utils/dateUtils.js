const getCurrentUTCTimestamp = () => {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

const convertDateToMySQLFormat = (dateString) => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

function formatDateToMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  getCurrentUTCTimestamp,
  convertDateToMySQLFormat,
  formatDateToMySQLDateTime
};
