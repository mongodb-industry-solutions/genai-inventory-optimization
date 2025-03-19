export function normalizeData(data, criteria) {
  const minMaxValues = {};

  // Compute min and max for each criterion
  criteria.forEach((c) => {
    const values = data.map((item) => item[c] || 0);
    minMaxValues[c] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });

  // Create a new dataset with normalized values for calculations
  return data.map((item) => {
    const normalizedItem = {};
    criteria.forEach((c) => {
      const { min, max } = minMaxValues[c];
      normalizedItem[c] = max !== min ? (item[c] - min) / (max - min) : 0;
    });
    return { productId: item.productId, normalized: normalizedItem };
  });
}

export function calculateWeightedScores(
  data,
  normalizedData,
  weights,
  criteria
) {
  return data.map((item, index) => {
    const weightedScore = criteria.reduce(
      (sum, c) => sum + normalizedData[index].normalized[c] * (weights[c] || 0),
      0
    );
    return { ...item, weightedScore };
  });
}

export function calculateABC(data) {
  const scores = data.map((item) => ({
    productId: item.productId,
    score: item.weightedScore,
  }));

  scores.sort((a, b) => b.score - a.score);

  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
  let cumulative = 0;
  const classifications = {};

  for (let i = 0; i < scores.length; i++) {
    cumulative += scores[i].score;
    const percentage = cumulative / totalScore;
    classifications[scores[i].productId] =
      percentage <= 0.6 ? "A" : percentage <= 0.85 ? "B" : "C";
  }

  return classifications;
}

export function compareResults(previous, current) {
  const comparison = {};
  for (let productId in current) {
    const prevClass = previous[productId];
    const currentClass = current[productId];

    // Compare the classes and assign the appropriate arrow
    if (prevClass && currentClass) {
      if (prevClass === currentClass) {
        comparison[productId] = "same"; // No change
      } else if (prevClass < currentClass) {
        comparison[productId] = "down"; // Decreased class
      } else {
        comparison[productId] = "up"; // Increased class
      }
    }
  }
  return comparison;
}
