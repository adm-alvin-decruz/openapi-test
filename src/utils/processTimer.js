const processTimer = (processName) => {
  const start = process.hrtime();

  console.log(`[${new Date().toISOString()}] Process "${processName}" started`);

  return () => {
    const end = process.hrtime(start);
    const duration = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    console.log(`[${new Date().toISOString()}] Process "${processName}" ended. Duration: ${duration}ms`);
  };
};

module.exports = processTimer;