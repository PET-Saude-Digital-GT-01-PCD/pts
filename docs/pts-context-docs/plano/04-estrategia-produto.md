# 04 — Estratégia de Produto

> **Input:** `02`, `03` · **Skills:** `product-vision`, `product-strategy`, `value-proposition`, `startup-canvas`, `north-star-metric`, `monetization-strategy`

## 1. Visão

**Uma linha de cuidado, não uma linha de espera.**

Conectar cada pessoa com deficiência a um plano terapêutico vivo — pactuado, acompanhado e compartilhado — para que reabilitação no SUS se torne cuidado contínuo em vez de fragmentos de registro.

- **Aspiração:** nenhuma Pessoa com Deficiência sem PTS ativo, atualizado e visível para quem cuida dela.
- **Valores:** centralidade da pessoa, cogestão do cuidado, redução da carga burocrática do trabalhador do SUS, conformidade e transparência.
- **Norte de longo prazo:** ser o padrão de gestão do PTS no SUS — começando pelos CER.

## 2. Segmentos de Mercado (por problema — ver doc 03)

| # | Segmento | JTBD central | Por que este? | Ordem de ataque |
|---|---|---|---|---|
| 1 | **Equipe multiprofissional do CER** | Registrar e acompanhar o PTS integradamente, sem retrabalho | Gargalo central; destrava o restante | **Primeiro (beachhead)** |
| 2 | **Gestores de CER / secretarias** | Governar o cuidado, demonstrar resultado | Compram e legitimam; provem sucesso do núcleo | Segundo |
| 3 | **Usuários PCD e cuidadores** | Saber o percurso, participar do plano | Vale para o produto mas não dirige adoção técnica | Terceiro |
| 4 | **Equipes de APS (USF)** | Dar continuidade ao cuidado | Exige integração com e-SUS; ganho pós-piloto | Quarto |

**Foco inicial:** equipe do CER. Decisão de foco: dominar o núcleo do fluxo antes de qualquer expansão.

## 3. Custos Relativos

- Posicionamento de **valor único**, não de baixo custo: ferramenta especializada que salva tempo clínico e integra o cuidado — comparável a "Starbucks" no leque de prontuários.
- Porém, no setor público o custo é freio: a proposta deve ser **economicamente leve para adotar** (open source em fase acadêmica, universidade como mantenedora inicial, custo de implementação baixo em cada CER).
- Síntese: **alto valor percebido com baixo custo de aquisição** (a diferenciação vem do domínio e do fluxo, não do ticket).

## 4. Proposta de Valor (por segmento)

### Segmento 1 — Equipe do CER
- **Antes:** registros espalhados, redigitação, metas desalinhadas, reuniões longas.
- **Como:** linha de base clínica automática (e-SUS), avaliações por especialidade com CIF preditiva, painel de metas cruzadas, mural assíncrono.
- **Depois:** mais tempo de cuidado, plano coeso, comunicação ágil.
- **Alternativas atuais:** papel, planilhas, prontuário genérico — todos fragmentados.

### Segmento 2 — Gestores
- **Antes:** sem visibilidade de status dos PTS, filas opacas, reporte manual.
- **Como:** dashboards de indicadores, semáforo de prioridades, trilha de auditoria do PTS.
- **Depois:** regulação de capacidade baseada em evidência, demonstração de resultado à gestão municipal.
- **Alternativas:** planilhas de controle, censos manuais, ausência de dado.

### Segmento 3 — Usuários e cuidadores
- **Antes:** não sabem o que esperar, se sentem invisíveis, ficha repetida.
- **Como:** formulário pré-chegada (WhatsApp), consentimento LGPD acessível, metas em linguagem clara.
- **Depois:** participação real no plano, percurso previsível, menos cansaço.
- **Alternativas:** filas e avisos por telefone, nada.

### Segmento 4 — APS
- **Antes:** sem saber o que o CER fez; duplicidade de conduta.
- **Como:** marcador de PTS ativo no e-SUS PEC + guia de contrarreferência inteligente.
- **Depois:** continuidade de cuidado entre níveis de atenção.
- **Alternativas:** papel solto, silêncio.

## 5. Trade-offs: O que NÃO fazer

- **Não construir prontuário genérico** — nem substituir e-SUS PEC; a solução **complementa** e integra.
- **Não resolver filas de todo o SUS** — focar em CER no início.
- **Não atender outros pontos da rede** (hospitais, centros de saúde mental) no MVP.
- **Não automatizar decisão clínica além da priorização** — algoritmo auxilia com ajuste humano obrigatório; a clínica mantém a palavra final.
- **Não exigir dispositivo do usuário** — o journey de quem tem exclusão digital é mediado pelo serviço.
- **Dizer "não"** a esses pontos preserva a especialização e a confiança clínica — a razão de existir.

## 6. Métricas-Chave

- **North Star Metric (PTS Digital):** **% de PTS ativos com última revisão dentro do prazo pactuado e metas documentadas** — captura o coração: plano vivo, atualizado, visível.
- **OMTM (trimestre piloto):** **tempo médio de recepção** (meta: ≤ 2 min) — prova rápida de valor imediato e de auto de quem atende.
- Levers (ver doc 09 para detalhes): % registros com linha de base auto-importada; % metas SMART documentadas; número de PTS por usuário revisado no ciclo; tempo até primeira avaliação multiprofissional; fila de espera com tempo estimado visível.

## 7. Crescimento

- **Modelo:** crescimento led por prescrição/adoção institucional (boca a boca clínico + aval de gestores), não growth loops virais.
- **Canais primários:** parcerias acadêmicas (extensão/TCC) → CER-piloto → demonstração a gestores de saúde → adesão de novos CER.
- **Escala:** replicar por CER; cada nova unidade adota módulo a módulo (começando pela recepção e triagem). Interoperabilidade (e-SUS) é o multiplicador: cada integração reduz o custo do próximo CER.
- **Unidade de negócio:** custo de implantação por CER baixo; ganho em eficiência (tempo de equipe liberado) mensurável para sustentar a continuidade.

## 8. Capacidades Necessárias

- **Construir:** modelo e fluxo do PTS especificado (docs 05–06); consciência profunda do domínio clínico-normativo (doc 01); relacionamento com CER(s)-piloto.
- **Construir/parceria:** integração FHIR/e-SUS PEC (dependência externa — precisa de parceria com secretaria/equipe técnica municipal); assinatura Gov.br (consumir serviço existente).
- **Desenvolver:** cultura de medição (indicadores desde o piloto) e de cocriação (profissionais como co-designers, não espectadores).
- **Pessoa-chave para prover:** um **enfermeiro/profissional de referência** no CER-piloto atuando como sponsor — ponte entre o time do produto e o cotidiano clínico.

## 9. Defensabilidade (Can't/Won't)

- **Por que não copiam fácil:** (1) **domínio**: profundo conhecimento do fluxo do PTS e da normativa do SUS; (2) **integração real**: saber navegar e-SUS PEC/RNDS leva meses de relacionamento técnico; (3) **confiança clínica**: profissionais não trocam por promessa — só por evidência do cotidiano; (4) **custo de troca**: uma vez no fluxo diário, o valor percebido adere.
- **Proteção adicional:** open source como seriedade, relação com a academia, e trilha de auditoria do PTS (dado histórico de qualidade).
- **Fraqueza defensável:** prontuários genéricos podem incorporar a função — resposta é **velocidade de adoção do núcleo**, não segredo tecnológico.

## 10. Hipóteses que Devem Ser Verdade (para validação — doc 08)

1. O CER-comar tem problema de registro fragmentado relevante e sente a dor (doc 03, A1).
2. É possível obter acesso real à API e-SUS PEC num CER de verdade (A5).
3. Profissionais adotam o modelo preditivo (A3) e o mural assíncrono (A4).
4. Gestores enxergam valor nos dashboards a ponto de legitimar a continuidade (torna a manutenção sustentável).
5. O piloto produz evidência de redução de tempo/retrabalho em ≤ 90 dias.

## 11. Testes Baratos das Hipóteses (antes do desenvolvimento full)

1. **Entrevista com 3–5 profissionais de CER** (médico, fisioterapeuta, recepção) sobre o fluxo de registro hoje — valida dor central.
2. **Checar viabilidade técnica** da API e-SUS PEC: conversa com secretaria municipal de saúde (acesso, contrato, ritmo).
3. **Teste de papel/protótipo** do fluxo Recepção→Triagem com 1 CER real: tempo antes/depois simulado.
4. **Protótipo de tela** de Mural e Painel de Metas com 3 terapeutas: aceitação do modelo.