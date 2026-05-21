export const formatCategory = (category) => {
  if (!category || category === 'N/A') return 'N/A';
  
  // Replace underscores with spaces and title-case the words
  const formatted = category
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
    
  return formatted;
};

// Also trims the category if it's too long for charts
export const formatChartCategory = (category, maxLength = 12) => {
  const formatted = formatCategory(category);
  if (formatted === 'N/A') return 'N/A';
  return formatted.length > maxLength 
    ? formatted.substring(0, maxLength) + '…' 
    : formatted;
};
