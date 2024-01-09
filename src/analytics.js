const { model, Schema } = require("mongoose");

const AnalyticsSchema = new Schema({
  licenseKey: { type: String, required: true, unique: true },
  totalCheckouts: { type: Number, default: 0 },
  totalGenerated: { type: Number, default: 0 },
});

module.exports = model("Analytics", AnalyticsSchema);