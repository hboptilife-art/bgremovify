
GRANT INSERT, UPDATE ON public.iyzico_orders TO authenticated;

CREATE POLICY "Users can create their own iyzico orders"
  ON public.iyzico_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own iyzico orders"
  ON public.iyzico_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
