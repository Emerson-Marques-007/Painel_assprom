/* Configuração pública do Supabase (a anon key pode ficar no front-end;
   a proteção real vem das políticas RLS). NUNCA use a service_role aqui. */
window.Assprom = window.Assprom || {};
window.Assprom.config = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'SUA-ANON-KEY',
  PAINEL_URL: 'pages/painel.html'          // para onde ir após o login (relativo a index.html)
};
