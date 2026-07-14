/**
 * RPOS / FSS webhook ontvanger
 *
 * Endpoint: POST https://<project>.supabase.co/functions/v1/rpos-webhook
 * Header:   Authorization: Bearer <WEBHOOK_SECRET>
 *
 * BELANGRIJK: formaat hieronder is een placeholder.
 * Zodra FSS de API-documentatie bezorgt, past dit bestand aan.
 *
 * Verwacht payload (FSS formaat — aanpassen zodra bekend):
 * {
 *   "transactionId": "TX-001",
 *   "locationId":    "RPOS_LOCATION_CODE",
 *   "items": [
 *     { "productId": "SKU-123", "productName": "Cola 33cl", "quantity": 2 }
 *   ],
 *   "timestamp": "2026-06-30T16:00:00Z"
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('RPOS_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  // Auth check
  const auth = req.headers.get('Authorization') ?? ''
  if (WEBHOOK_SECRET && auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const payload = body as {
    transactionId?: string
    locationId?: string
    items?: { productId?: string; productName?: string; quantity?: number }[]
    timestamp?: string
  }

  if (!payload.items?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let processed = 0
  const errors: string[] = []

  for (const soldItem of payload.items) {
    if (!soldItem.productId && !soldItem.productName) continue
    const qty = soldItem.quantity ?? 1

    // Zoek inventory item op RPOS product ID of naam
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, name, current_stock, min_stock, location_id')
      .or(
        soldItem.productId
          ? `rpos_product_id.eq.${soldItem.productId},name.ilike.${soldItem.productName ?? ''}`
          : `name.ilike.${soldItem.productName}`
      )
      .limit(1)

    if (!items?.length) {
      errors.push(`Product niet gevonden: ${soldItem.productId ?? soldItem.productName}`)
      continue
    }

    const item = items[0]

    // Deduplicatie: check of deze transactie al verwerkt is
    if (payload.transactionId) {
      const { data: existing } = await supabase
        .from('inventory_transactions')
        .select('id')
        .eq('rpos_tx_id', `${payload.transactionId}_${soldItem.productId}`)
        .limit(1)
      if (existing?.length) continue // al verwerkt
    }

    // Stock verlagen
    const newStock = Math.max(0, (item.current_stock as number) - qty)
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', item.id)

    // Transactie loggen
    await supabase.from('inventory_transactions').insert({
      item_id:       item.id,
      quantity_delta: -qty,
      reason:        'sale',
      rpos_tx_id:    payload.transactionId ? `${payload.transactionId}_${soldItem.productId}` : null,
    })

    processed++
  }

  return new Response(
    JSON.stringify({ ok: true, processed, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
