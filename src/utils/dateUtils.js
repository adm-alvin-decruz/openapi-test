const getCurrentUTCTimestamp = () => {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

const convertDateToMySQLFormat = (dateString) => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const convertDateFromMySQLToSlash = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-');
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

function formatDateToMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function currentDateAddHours(unit) {
  const date = new Date();
  date.setHours(date.getHours() + unit);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function convertDateFormat(dateString, additionalHours = 0) {
  // Parse the input date string
  const date = new Date(dateString.replace(' ', 'T')); // Convert space to T for proper parsing

  // Add additional hours if needed
  if (additionalHours !== 0) {
    date.setHours(date.getHours() + additionalHours);
  }

  return date.toISOString();
}

module.exports = {
  getCurrentUTCTimestamp,
  convertDateToMySQLFormat,
  formatDateToMySQLDateTime,
  currentDateAddHours,
  convertDateFormat,
  convertDateFromMySQLToSlash,
};
