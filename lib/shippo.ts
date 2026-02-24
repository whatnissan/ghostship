const SHIPPO_BASE_URL = 'https://api.goshippo.com'

function getHeaders() {
  const key = process.env.SHIPPO_API_KEY
  if (!key) throw new Error('SHIPPO_API_KEY not set')
  return { 'Authorization': `ShippoToken ${key}`, 'Content-Type': 'application/json' }
}

export interface ShippoAddress {
  name: string; street1: string; street2?: string
  city: string; state: string; zip: string; country: string
}

export interface PackageDimensions {
  weightOz: number; lengthIn: number; widthIn: number; heightIn: number
}

export async function getShippingRates(pkg: PackageDimensions) {
  const res = await fetch(`${SHIPPO_BASE_URL}/shipments/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      address_from: { name: 'Ghost Ship Sender', street1: '1600 Amphitheatre Pkwy', city: 'Mountain View', state: 'CA', zip: '94043', country: 'US' },
      address_to:   { name: 'Ghost Ship Recipient', street1: '1 Infinite Loop', city: 'Cupertino', state: 'CA', zip: '95014', country: 'US' },
      parcels: [{
        length: pkg.lengthIn.toString(), width: pkg.widthIn.toString(),
        height: pkg.heightIn.toString(), distance_unit: 'in',
        weight: (pkg.weightOz / 16).toString(), mass_unit: 'lb',
      }],
      async: false,
    }),
  })
  if (!res.ok) throw new Error(`Shippo rate fetch failed: ${await res.text()}`)
  return (await res.json()).rates
}

export async function createLabelWithQRCode({
  toAddress, pkg, rateObjectId,
}: { toAddress: ShippoAddress; pkg: PackageDimensions; rateObjectId: string }) {
  const res = await fetch(`${SHIPPO_BASE_URL}/transactions/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ rate: rateObjectId, label_file_type: 'PNG', async: false }),
  })
  if (!res.ok) throw new Error(`Shippo label creation failed: ${await res.text()}`)
  const tx = await res.json()
  if (tx.status !== 'SUCCESS') throw new Error(`Shippo transaction failed: ${tx.messages?.join(', ')}`)
  return {
    shipmentId:     tx.rate.shipment,
    transactionId:  tx.object_id,
    qrCodeUrl:      tx.qr_code_url ?? tx.label_url,
    trackingNumber: tx.tracking_number,
    labelUrl:       tx.label_url,
  }
}
