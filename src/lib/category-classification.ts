/**
 * Category classification for budget analysis (50-30-20 rule)
 * Maps category names to their budget classification: needs, wants, or savings
 */
export const categoryClassification: Record<string, "needs" | "wants" | "savings"> = {
  // Needs (50%)
  "Groceries": "needs",
  "Rent/Mortgage": "needs",
  "Utilities": "needs",
  "Transportation": "needs",
  "Insurance": "needs",
  "Healthcare": "needs",
  
  // Wants (30%)
  "Entertainment": "wants",
  "Dining Out": "wants",
  "Shopping": "wants",
  "Hobbies": "wants",
  "Subscriptions": "wants",
  "Travel": "wants",
  
  // Savings (20%)
  "Savings": "savings",
  "Investments": "savings",
  "Emergency Fund": "savings",
};

/**
 * Get budget classification for a category
 * Defaults to "wants" if category is not found
 */
export const getCategoryClassification = (categoryName: string): "needs" | "wants" | "savings" => {
  return categoryClassification[categoryName] || "wants";
};

