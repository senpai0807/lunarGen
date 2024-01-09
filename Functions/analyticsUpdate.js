const Analytics = require('../src/analytics');

async function incrementTotalCheckouts(licenseKey, increment = 0) {
  let analytics = await Analytics.findOne({ licenseKey: licenseKey });

  if (analytics) {
    analytics.totalCheckouts += increment;
    await analytics.save();
  } else {
    analytics = new Analytics({
      licenseKey: licenseKey,
      totalCheckouts: increment,
      totalGenerated: 0,
    });
    await analytics.save();
  }

  return analytics;
}

async function incrementTotalGenerated(licenseKey, increment = 0) {
  let analytics = await Analytics.findOne({ licenseKey: licenseKey });

  if (analytics) {
    analytics.totalGenerated += increment;
    await analytics.save();
  } else {
    analytics = new Analytics({
      licenseKey: licenseKey,
      totalCheckouts: 0,
      totalGenerated: increment,
    });
    await analytics.save();
  }

  return analytics;
}

module.exports = { incrementTotalCheckouts, incrementTotalGenerated };