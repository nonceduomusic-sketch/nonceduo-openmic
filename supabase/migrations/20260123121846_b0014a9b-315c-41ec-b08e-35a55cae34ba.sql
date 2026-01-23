-- Grant execute so anon/authenticated clients can create/validate shared PIN sessions
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pin_session(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_pin_session(text) TO anon, authenticated;
