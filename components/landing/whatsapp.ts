/**
 * Monta o link do WhatsApp com a primeira frase já escrita.
 *
 * A mensagem pré-preenchida não é enfeite: ela elimina a fricção de redigir a
 * primeira frase, que é onde parte das pessoas desiste — padrão observado nas
 * páginas brasileiras que convertem (pesquisa §4.6).
 *
 * O NÚMERO NÃO MORA AQUI. Vem de `contact.whatsapp`, que o portfólio já
 * publica. Duplicá-lo criaria duas fontes para o mesmo dado, e no dia em que
 * mudasse uma das páginas ficaria apontando para um número morto.
 */
export function urlWhatsapp(base: string, mensagem: string): string {
  return `${base}?text=${encodeURIComponent(mensagem)}`
}
