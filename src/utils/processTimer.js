const processTimer = (processName) => {
  const start = process.hrtime();

  console.log(`Process Timer: [${new Date().toISOString()}] CIAM Process "${processName}" started`);

  return () => {
    const end = process.hrtime(start);
    const duration = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    console.log(`Process Timer: [${new Date().toISOString()}] CIAM Process "${processName}" ended. Duration: ${duration}ms`);
  };
};

const apiRequestTimer = () => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const start = process.hrtime();

  const log = (message) => {
    console.log(`Process Timer: [${new Date().toISOString()}] [${requestId}] CIAM Process ${message}`);
  };

  log('API request started');

  return {
    log,
    end: (message) => {
      const end = process.hrtime(start);
      const duration = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
      log(`Process Timer: CIAM Process ${message} ended. Duration: ${duration}ms`);
    },
    getRequestId: () => requestId
  };
};

module.exports = {apiRequestTimer,processTimer};