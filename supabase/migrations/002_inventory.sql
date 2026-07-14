-- Inventory items per locatie
CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text NOT NULL DEFAULT 'Overig',
  unit            text NOT NULL DEFAULT 'stuks',
  current_stock   numeric NOT NULL DEFAULT 0,
  min_stock       numeric NOT NULL DEFAULT 0,
  rpos_product_id text,                          -- koppeling met RPOS SKU/productcode
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Transactielog: elke stockwijziging (verkoop, handmatig, levering)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_delta  numeric NOT NULL,              -- negatief = verkoop/gebruik, positief = levering
  reason          text NOT NULL DEFAULT 'manual', -- 'sale' | 'delivery' | 'manual' | 'correction'
  rpos_tx_id      text,                          -- RPOS transactie-ID voor deduplicatie
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Leveranciersconfiguratie per locatie
CREATE TABLE IF NOT EXISTS supplier_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE UNIQUE,
  supplier_name   text NOT NULL DEFAULT '',
  supplier_email  text NOT NULL DEFAULT '',
  order_days      text[] NOT NULL DEFAULT ARRAY['sunday','wednesday'],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER supplier_config_updated_at
  BEFORE UPDATE ON supplier_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index voor snelle RPOS-koppeling
CREATE INDEX IF NOT EXISTS idx_inventory_rpos ON inventory_items(location_id, rpos_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id, created_at DESC);

-- RLS
ALTER TABLE inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_config       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_company" ON inventory_items
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "inventory_transactions_company" ON inventory_transactions
  FOR ALL USING (
    item_id IN (
      SELECT i.id FROM inventory_items i
      JOIN user_profiles up ON up.company_id = i.company_id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "supplier_config_company" ON supplier_config
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l
      JOIN user_profiles up ON up.company_id = l.company_id
      WHERE up.user_id = auth.uid()
    )
  );
