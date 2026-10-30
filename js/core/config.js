/* Configuração pública do Supabase (a anon key pode ficar no front-end;
   a proteção real vem das políticas RLS). NUNCA use a service_role aqui. */
window.Assprom = window.Assprom || {};
window.Assprom.config = {
  SUPABASE_URL: 'https://aokvibdcsopuyqshinqj.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFva3ZpYmRjc29wdXlxc2hpbnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMzM1ODUsImV4cCI6MjEwODkwOTU4NX0.YfVNjiAHvoPp1zaeN1stbZjJbxjjdiBkN99zh9IK16I',
  PAINEL_URL: 'pages/painel.html'          // para onde ir após o login (relativo a index.html)
};
