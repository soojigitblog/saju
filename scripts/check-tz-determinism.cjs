const { calculateFourPillars } = require("manseryeok");

const result = calculateFourPillars({
  year: 1992,
  month: 10,
  day: 24,
  hour: 5,
  minute: 30,
  dayBoundary: "midnight",
});

process.stdout.write(JSON.stringify(result.toHanjaObject()));
