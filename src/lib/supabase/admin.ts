import { createClient } from "@supabase/supabase-js";

/**
 * Client com a service role (ignora RLS). USO RESTRITO a server actions que já
 * validam permissão e escopo por conta própria — nunca exposto ao cliente.
 * Hoje: upload da foto de perfil (o caminho é travado na pasta do próprio
 * usuário pela action, dispensando policies de storage.objects em produção).
 * Retorna null se a chave não estiver configurada no ambiente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
