import type { Dictionary, Locale } from '@/content'

// `locale` entra na assinatura para manter a interface <Footer locale dict>
// consistente com <Header locale dict>, mesmo sem uso hoje — o rodapé não
// tem, por ora, nenhum conteúdo que varie por idioma além do que já está
// em `dict`.
export function Footer({ dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-6 py-10 font-mono text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{dict.footer.rights}</p>
        <p>{dict.footer.builtWith}</p>
        <a
          href={dict.footer.sourceCodeUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border underline-offset-4 hover:text-text"
        >
          {dict.footer.sourceCode}
        </a>
      </div>
    </footer>
  )
}
