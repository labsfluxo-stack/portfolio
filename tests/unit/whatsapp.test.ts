import { describe, expect, it } from 'vitest'
import { urlWhatsapp } from '@/components/landing/whatsapp'
import { pt } from '@/content/pt'

describe('urlWhatsapp', () => {
  it('anexa a mensagem codificada', () => {
    const url = urlWhatsapp('https://wa.me/5511999999999', 'Olá, tudo bem?')
    expect(url).toBe('https://wa.me/5511999999999?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })

  // A mensagem carrega acento, vírgula e ponto de interrogação. Concatenar
  // sem codificar produz URL que o WhatsApp trunca na primeira vírgula.
  it('codifica caracteres que quebrariam a query', () => {
    const url = urlWhatsapp('https://wa.me/55', 'a&b=c?d')
    expect(url).toContain('text=a%26b%3Dc%3Fd')
  })

  // Fonte única: se alguém escrever outro número na landing, isto pega.
  it('a landing usa o mesmo número do contato do portfólio', () => {
    const url = urlWhatsapp(pt.contact.whatsapp, pt.landing.cta.mensagem)
    expect(url.startsWith(`${pt.contact.whatsapp}?text=`)).toBe(true)
  })
})
