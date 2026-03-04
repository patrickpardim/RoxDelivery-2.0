-- Function to securely get a customer by phone (bypassing RLS for public menu)
CREATE OR REPLACE FUNCTION get_customer_by_phone(
  p_user_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  address TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  complement TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin), bypassing RLS
SET search_path = public -- Security best practice
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.address, c.cep, c.street, c.number, c.neighborhood, c.city, c.state, c.complement
  FROM public.customers c
  WHERE c.user_id = p_user_id AND c.phone = p_phone;
END;
$$;

-- Function to securely upsert (insert or update) a customer (bypassing RLS for public menu)
CREATE OR REPLACE FUNCTION upsert_customer(
  p_user_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_cep TEXT,
  p_street TEXT,
  p_number TEXT,
  p_neighborhood TEXT,
  p_city TEXT,
  p_state TEXT,
  p_complement TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (admin), bypassing RLS
SET search_path = public -- Security best practice
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Check if customer exists
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = p_user_id AND phone = p_phone;

  IF v_customer_id IS NOT NULL THEN
    -- Update
    UPDATE public.customers
    SET
      name = p_name,
      address = p_address,
      cep = p_cep,
      street = p_street,
      number = p_number,
      neighborhood = p_neighborhood,
      city = p_city,
      state = p_state,
      complement = p_complement,
      updated_at = now()
    WHERE id = v_customer_id;
  ELSE
    -- Insert
    INSERT INTO public.customers (
      user_id, name, phone, address, cep, street, number, neighborhood, city, state, complement
    ) VALUES (
      p_user_id, p_name, p_phone, p_address, p_cep, p_street, p_number, p_neighborhood, p_city, p_state, p_complement
    )
    RETURNING id INTO v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$;

-- Grant execute permissions to anon (public) and authenticated users
GRANT EXECUTE ON FUNCTION get_customer_by_phone TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_customer TO anon, authenticated;
