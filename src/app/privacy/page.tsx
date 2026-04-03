export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="text-muted-foreground text-sm">Última atualização: Janeiro 2025</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Responsável pelo Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          O HomeFlux é uma plataforma SaaS destinada a mediadores de crédito. O responsável pelo tratamento dos dados pessoais é a entidade gestora da plataforma HomeFlux.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Dados Pessoais Recolhidos</h2>
        <p className="text-muted-foreground leading-relaxed">
          Recolhemos os seguintes dados pessoais: nome, endereço de e-mail, número de telefone, NIF, data de nascimento, e informações relativas ao crédito habitação (montante do empréstimo, prazo, tipo de crédito). Estes dados são fornecidos diretamente pelos utilizadores ou pelos mediadores em nome dos seus clientes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Finalidades do Tratamento</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados são tratados para: prestação dos serviços da plataforma HomeFlux; gestão de processos de crédito habitação; comunicações relacionadas com o serviço; cumprimento de obrigações legais.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Base Legal</h2>
        <p className="text-muted-foreground leading-relaxed">
          O tratamento de dados é realizado com base no consentimento do titular dos dados (Art.º 6.º, n.º 1, al. a) do RGPD) e na execução de um contrato (Art.º 6.º, n.º 1, al. b) do RGPD).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Conservação dos Dados</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os dados pessoais são conservados pelo período necessário à prestação dos serviços e ao cumprimento das obrigações legais aplicáveis, não excedendo 5 anos após o encerramento do processo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Direitos dos Titulares</h2>
        <p className="text-muted-foreground leading-relaxed">
          Os titulares dos dados têm direito de acesso, retificação, apagamento, limitação do tratamento, portabilidade e oposição. Para exercer estes direitos, contacte-nos através do e-mail privacidade@homeflux.pt.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Segurança</h2>
        <p className="text-muted-foreground leading-relaxed">
          Implementamos medidas técnicas e organizativas adequadas para proteger os dados pessoais contra acesso não autorizado, perda ou destruição, incluindo encriptação em trânsito e em repouso.
        </p>
      </section>
    </div>
  );
}
