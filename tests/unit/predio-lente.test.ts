import { describe, expect, it } from 'vitest'
import { lenteVertical, meiaLarguraEnquadrada } from '@/components/predio/Predio'

/**
 * ═══ A LENTE, E O PARÂMETRO QUE JÁ MORREU UMA VEZ ═══
 *
 * `ABERTURA.alvo` diz quantos metros de meia-largura a cena quer enquadrar no
 * plano da frente. Ele valia 8,6, calibrado quando a câmera repousava a 11,5 m.
 * Quando a descida ganhou avanço de câmera, o repouso virou 5,9 m — em outro
 * arquivo, sem que nada quebrasse — e pedir 8,6 m a 5,9 m de distância passou a
 * exigir 78,7°, acima do teto de 62.
 *
 * O efeito é o pior possível: o parâmetro continuou lá, continuou sendo lido, e
 * deixou de significar qualquer coisa. Podia valer 8,6 ou 40 que a lente seria a
 * mesma, porque era o TETO que mandava. Nenhum teste quebrou, nenhum tipo
 * reclamou, nenhuma imagem ficou obviamente errada.
 *
 * Estes testes existem para que isso não possa acontecer de novo em silêncio.
 */
describe('a lente da cena', () => {
  it('em 16:9 a lente não bate no teto — o alvo é quem manda', () => {
    /**
     * A AFIRMAÇÃO CENTRAL. Se `alvo` voltar a pedir mais do que o teto permite,
     * este teste quebra — e quebra JÁ, não seis meses depois quando alguém
     * estranhar que mexer no alvo não muda nada.
     *
     * A tolerância existe porque 6,30 foi escolhido para pousar exatamente no
     * teto em 16:9: a meia-largura enquadrada hoje é a mesma que o teto
     * entregava antes, e a correção foi de significado e não de composição.
     */
    expect(lenteVertical(16 / 9)).toBeLessThanOrEqual(62)
    expect(lenteVertical(16 / 9)).toBeGreaterThan(61.5)
  })

  it('a meia-largura enquadrada NÃO muda com a proporção da tela', () => {
    /**
     * É a definição de "sem margem lateral": o prédio ocupa a largura inteira,
     * qualquer que seja o formato da janela. Com a lente presa no teto isso era
     * falso — a cobertura horizontal crescia com a largura, e tela ultrawide via
     * mais terraço que tela quadrada.
     *
     * Só vale ACIMA de 16:9. Abaixo disso a conta estoura o teto e o prédio
     * sangra pelas laterais, que é o efeito deliberado em retrato de celular.
     */
    const referencia = meiaLarguraEnquadrada(16 / 9)
    for (const aspecto of [16 / 9, 2, 2.4, 2.9]) {
      expect(meiaLarguraEnquadrada(aspecto)).toBeCloseTo(referencia, 2)
    }
  })

  it('acima de ~2,93:1 o PISO da lente assume, e a cena passa a ver mais', () => {
    /**
     * ESTE TESTE NASCEU DE UM ERRO MEU, e vale registrar qual: a primeira versão
     * do teste acima varria até 3,2:1 afirmando largura constante, e falhou —
     * 6,87 m em vez de 6,30.
     *
     * O código estava certo. `ABERTURA.min` é 40°, e em proporções muito largas
     * segurar os 6,30 m exigiria uma lente ainda mais fechada que isso. O piso
     * existe justamente para impedir a lente de virar teleobjetiva: além dele a
     * perspectiva achata, a cena perde profundidade e o corte deixa de ler como
     * corte. Então a partir de 2,93:1 a escolha é deliberada — enquadra-se MAIS
     * largura em troca de manter alguma perspectiva.
     *
     * A afirmação de largura constante vale entre os dois limites, e agora está
     * escrito onde ela começa e onde termina.
     */
    expect(lenteVertical(3.2)).toBe(40)
    expect(meiaLarguraEnquadrada(3.2)).toBeGreaterThan(meiaLarguraEnquadrada(16 / 9))
  })

  it('em retrato de celular o prédio sangra, e isso é o teto agindo', () => {
    // 9:19,5 é um telefone moderno em pé. A largura pedida não cabe numa lente
    // decente, e o teto assume — enquadrando MENOS que os 6,3 m.
    expect(lenteVertical(9 / 19.5)).toBe(62)
    expect(meiaLarguraEnquadrada(9 / 19.5)).toBeLessThan(meiaLarguraEnquadrada(16 / 9))
  })

  it('a lente fica sempre dentro da faixa declarada', () => {
    for (const aspecto of [0.3, 0.5, 1, 1.33, 1.78, 2.4, 5, 12]) {
      const fov = lenteVertical(aspecto)
      expect(fov).toBeGreaterThanOrEqual(40)
      expect(fov).toBeLessThanOrEqual(62)
    }
  })

  it('proporção degenerada não produz NaN', () => {
    // Um `0 / 0` vindo de uma medição de layout antes de o canvas ter tamanho
    // chegaria aqui como `NaN`, e `NaN` numa matriz de projeção apaga a cena
    // inteira sem uma linha de erro.
    expect(Number.isFinite(lenteVertical(0))).toBe(true)
    expect(Number.isFinite(lenteVertical(Number.NaN))).toBe(false)
  })
})
