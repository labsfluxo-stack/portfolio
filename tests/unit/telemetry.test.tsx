import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Telemetry } from '@/components/sections/Telemetry'
import { pt } from '@/content/pt'
import { en } from '@/content/en'

function setReducedMotion(reduced: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList)
}

describe('Telemetry', () => {
  // Estes testes exigiam a procedência como texto visível por número, e
  // estavam certos enquanto essa era a decisão. Ela mudou: nove
  // justificativas na mesma tela não leem como rigor, leem como quem precisa
  // provar que sabe (ver o comentário em components/ui/Metric.tsx). O que
  // eles protegem continua o mesmo — nenhum número pode ficar sem origem.
  it('os quatro números primários aparecem, cada um carregando a procedência', () => {
    setReducedMotion(true)
    const { container } = render(<Telemetry dict={pt} locale="pt" />)
    for (const metric of pt.telemetry.metrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument()
      expect(screen.getByText(metric.value)).toBeInTheDocument()
      expect(
        container.querySelector(`[title="${metric.provenance}"]`),
        `a procedência de "${metric.key}" sumiu do componente`,
      ).toBeTruthy()
    }
  })

  // A limpeza só é legítima se a seção continuar dizendo de onde os números
  // vêm — uma vez, no rodapé. Sem esta trava, tirar as justificativas viraria
  // apagamento da procedência, que é outra coisa.
  it('a seção declara a origem dos números uma vez, e uma só', () => {
    setReducedMotion(true)
    const { container } = render(<Telemetry dict={pt} locale="pt" />)
    const texto = container.textContent ?? ''

    const notas = texto.split(pt.telemetry.provenanceNote).length - 1
    expect(notas, 'a nota de procedência da seção não aparece').toBeGreaterThan(0)
    expect(notas, 'a nota voltou a se repetir por número').toBe(1)

    // A data era a repetição mais gritante — 35 ocorrências numa página só.
    const datas = texto.split('2026-08-02').length - 1
    expect(datas, 'a data voltou a aparecer espalhada em texto visível').toBe(1)
  })

  it('com locale en, os números primários saem com vírgula como separador', () => {
    setReducedMotion(true)
    render(<Telemetry dict={en} locale="en" />)
    expect(screen.getByText('250,000+')).toBeInTheDocument()
    expect(screen.queryByText('250.000+')).not.toBeInTheDocument()
  })

  it('exibe a fita de detalhamento, cada número carregando a procedência', () => {
    const { container } = render(<Telemetry dict={pt} locale="pt" />)
    expect(screen.getByText(pt.telemetry.secondaryLabel)).toBeInTheDocument()
    for (const item of pt.telemetry.secondary) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
      expect(screen.getByText(item.value)).toBeInTheDocument()
      expect(
        container.querySelector(`[title="${item.provenance}"]`),
        `a procedência de "${item.key}" sumiu do componente`,
      ).toBeTruthy()
    }
  })
})
