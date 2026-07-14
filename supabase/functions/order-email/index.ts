/**
 * Geplande bestelmail — draait elke zondag en woensdag via pg_cron
 *
 * Voer dit in Supabase SQL Editor uit om de cron te activeren:
 *
 *   select cron.schedule(
 *     'order-email-sunday',
 *     '0 8 * * 0',   -- elke zondag om 8:00
 *     $$ select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/order-email',
 *       headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb
 *     ) $$
 *   );
 *
 *   select cron.schedule(
 *     'order-email-wednesday',
 *     '0 8 * * 3',   -- elke woensdag om 8:00
 *     $$ select net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/order-email',
 *       headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb
 *     ) $$
 *   );
 *
 * Benodigde env variabelen in Supabase Edge Function secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') ?? 'noreply@cloudcast.be'

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Haal alle locaties op met een leveranciersconfiguratie
  const { data: configs } = await supabase
    .from('supplier_config')
    .select('location_id, supplier_name, supplier_email')
    .neq('supplier_email', '')

  if (!configs?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0

  for (const config of configs) {
    // Haal items op die onder minimum staan
    const { data: lowItems } = await supabase
      .from('inventory_items')
      .select('name, unit, current_stock, min_stock, category')
      .eq('location_id', config.location_id)
      .filter('current_stock', 'lte', supabase.rpc)

    // Handmatige filter want Supabase .lte werkt niet op computed kolommen
    const { data: allItems } = await supabase
      .from('inventory_items')
      .select('name, unit, current_stock, min_stock, category')
      .eq('location_id', config.location_id)

    const items = (allItems ?? []).filter(
      (i: { current_stock: number; min_stock: number }) => i.current_stock <= i.min_stock
    )

    if (!items.length) continue

    // Haal locatienaam op
    const { data: loc } = await supabase
      .from('locations')
      .select('name')
      .eq('id', config.location_id)
      .single()

    const locName = loc?.name ?? 'Onbekende locatie'
    const today   = new Date().toLocaleDateString('nl-BE')

    const orderLines = items
      .map((i: { name: string; min_stock: number; current_stock: number; unit: string }) =>
        `• ${i.name}: ${Math.ceil((i.min_stock * 2) - i.current_stock)} ${i.unit} ` +
        `(huidig: ${i.current_stock} ${i.unit}, min: ${i.min_stock} ${i.unit})`
      )
      .join('\n')

    const emailBody = [
      `Beste ${config.supplier_name || 'leverancier'},`,
      '',
      `Graag plaatsen wij de volgende bestelling namens ${locName}:`,
      '',
      orderLines,
      '',
      'Gelieve te bevestigen wanneer de levering kan plaatsvinden.',
      '',
      'Met vriendelijke groet,',
      locName,
    ].join('\n')

    // Verstuur via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [config.supplier_email],
        subject: `Bestelling – ${locName} – ${today}`,
        text:    emailBody,
      }),
    })

    if (res.ok) sent++
    else {
      const err = await res.text()
      console.error(`Mail mislukt voor ${config.supplier_email}:`, err)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
