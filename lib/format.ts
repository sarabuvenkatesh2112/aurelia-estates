export const formatPrice = (crores: number) =>
  crores < 1
    ? `₹${Math.round(crores * 100)} L`
    : `₹${crores.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
export const formatRupees = (rupees: number) => formatPrice(rupees / 1e7);
