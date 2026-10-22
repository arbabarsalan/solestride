// Prices are stored as integer paisa (PKR) throughout the API.
// This renders them the way people read prices in Pakistan: "Rs 8,999".
export function formatPKR(paisa) {
  const rupees = Math.round(paisa / 100);
  return `Rs ${rupees.toLocaleString("en-US")}`;
}
