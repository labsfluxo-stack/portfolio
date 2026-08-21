/**
 * O que aparece no lugar da cena 3D quando `hasWebGL()` (`CanecaSlot.tsx`)
 * devolve falso — aparelho antigo, WebGL desligado por política, o que for.
 *
 * Ponto 4 do brief: um modal vazio não é aceitável. A escolha aqui é "a
 * marca aplicada a um desenho plano da caneca", não só uma frase de
 * desculpa — o mesmo raciocínio de `PorticoFallback.tsx` (elevação técnica
 * em SVG no lugar da ponte rolante), mas com uma diferença que importa: ali
 * o SVG é puramente decorativo porque a informação real já existe em texto
 * na página (seções Sistemas/Stack). Aqui a informação — QUAL marca — só
 * existe no que a pessoa acabou de digitar, então ela não pode viver só
 * dentro de um `<svg aria-hidden>`. O nome sai como `<p>` de verdade, por
 * cima do desenho, na cor da marca: DOM real, não texto de canvas nem de
 * SVG — a mesma regra do resto da rota.
 */
export function CanecaFallback({ corMarca, nomeMarca }: { corMarca: string; nomeMarca: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 200 170"
        className="h-3/5 w-3/5 max-w-56"
        fill="none"
      >
        {/* corpo */}
        <rect
          x="42"
          y="24"
          width="92"
          height="110"
          rx="8"
          className="fill-surface-2 stroke-border"
          strokeWidth="3"
        />
        {/* alça */}
        <path
          d="M134,52 C170,58 170,104 134,110"
          className="stroke-border"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        {/* faixa da marca — a mesma proporção vertical de FAIXA_Y0/FAIXA_Y1
            em caneca-textura.ts, para as duas versões (3D e plana) lerem
            como o mesmo objeto. */}
        <rect x="42" y="64" width="92" height="30" fill={corMarca} opacity="0.16" />
        <rect x="42" y="62" width="92" height="2" fill={corMarca} />
        <rect x="42" y="96" width="92" height="2" fill={corMarca} />
      </svg>
      {/* O nome, em DOM real — ver o comentário do arquivo para o porquê de
          não estar dentro do `<svg aria-hidden>` acima. `text-[19px]`:
          acima do piso de 17px que a rota inteira respeita para corpo de
          texto, porque aqui ele também faz o papel de "logo". */}
      <p
        className="absolute max-w-[55%] break-words text-center text-[19px] font-bold"
        style={{ color: corMarca }}
      >
        {nomeMarca}
      </p>
    </div>
  )
}
