import FarmerLogistics from './FarmerLogistics';

/**
 * Business logistics uses the same real-data shipment list — the endpoint
 * returns shipments where the user is either the farmer or the buyer.
 */
export default function BusinessLogistics() {
  return <FarmerLogistics />;
}
