export const formatCurrency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format;

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
