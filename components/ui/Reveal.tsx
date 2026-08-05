'use client'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/lib/motion'

export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode
  delayMs?: number
  /** Repassado ao `motion.div` de fora. Necessário sempre que o filho direto
   * é um item de grid que hoje conta com `align-items`/`justify-items:
   * stretch` (o padrão do CSS Grid) para virar um card de largura e altura
   * uniformes na fileira (SystemCard, LayerCard, Metric): `className="grid"`
   * faz este wrapper — que passa a ser o item real da grade externa, já
   * esticado por ela — esticar por sua vez o único filho nos dois eixos
   * (o mesmo truque de "grid de um item só" para preencher 100% x 100%).
   * Sem isso o card perde a altura uniforme e a fileira fica desalinhada
   * assim que o conteúdo varia de tamanho entre os itens. */
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return <>{children}</>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: delayMs / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
