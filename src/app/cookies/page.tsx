export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Política de Cookies</h1>
      <p className="text-muted-foreground text-sm">Última atualização: Janeiro 2025</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">O que são cookies?</h2>
        <p className="text-muted-foreground leading-relaxed">
          Cookies são pequenos ficheiros de texto armazenados no seu dispositivo quando visita um website. São utilizados para garantir o funcionamento correto do site e melhorar a sua experiência.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies que utilizamos</h2>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Finalidade</th>
                <th className="text-left px-4 py-3 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token</td>
                <td className="px-4 py-3">Essencial</td>
                <td className="px-4 py-3 text-muted-foreground">Autenticação do utilizador</td>
                <td className="px-4 py-3 text-muted-foreground">Sessão</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">impersonating_broker_id</td>
                <td className="px-4 py-3">Essencial</td>
                <td className="px-4 py-3 text-muted-foreground">Impersonação de mediador (admin)</td>
                <td className="px-4 py-3 text-muted-foreground">4 horas</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">NEXT_LOCALE</td>
                <td className="px-4 py-3">Funcional</td>
                <td className="px-4 py-3 text-muted-foreground">Preferência de idioma</td>
                <td className="px-4 py-3 text-muted-foreground">1 ano</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">homeflux_cookie_consent</td>
                <td className="px-4 py-3">Essencial</td>
                <td className="px-4 py-3 text-muted-foreground">Registo do consentimento de cookies</td>
                <td className="px-4 py-3 text-muted-foreground">1 ano</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Gestão de cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Pode gerir os cookies através das definições do seu navegador. No entanto, desativar cookies essenciais pode afetar o funcionamento da plataforma. Para mais informações, consulte a nossa{' '}
          <a href="/privacy" className="text-primary underline underline-offset-2">Política de Privacidade</a>.
        </p>
      </section>
    </div>
  );
}
