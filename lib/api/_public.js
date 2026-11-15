// What an anonymous visitor may see of a shipment. Customer identity never leaves the server
// unless the caller is an admin or the shipment's own signed-in owner.
function toPublicShipment(shipment) {
  if (!shipment) return shipment;
  const { customerEmail, customerName, id, ...rest } = shipment; // eslint-disable-line no-unused-vars
  return rest;
}

module.exports = { toPublicShipment };
