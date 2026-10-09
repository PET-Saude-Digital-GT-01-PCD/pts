# Relatórios de governança

## Consultar e exportar

1. Abra **Indicadores de governança** em `/governanca`.
2. Informe **Desde** e **Até**. As duas datas são obrigatórias e a final deve ser igual ou posterior à inicial. O intervalo inclui os dois dias completos em `America/Fortaleza` (UTC−03), independentemente do fuso do computador.
3. Informe a **Janela de revisão (dias)**: um inteiro de 1 a 365, com padrão de 90. Esse parâmetro define o critério de revisão em dia no North Star deste relatório. É separado do período de eventos e não altera os prazos pactuados de cuidado.
4. Clique em **Aplicar período**. Confira o CER, período, janela e horário de geração acima dos indicadores.
5. Clique em **Exportar CSV**. Editar qualquer filtro bloqueia a exportação até aplicá-lo ou voltar aos valores aplicados. O arquivo sempre corresponde ao painel exibido, inclusive valores, metas, fontes e critérios temporais.

O período inicial cobre os últimos 30 dias civis, incluindo hoje. Durante atualização ou exportação, os controles ficam bloqueados e o andamento é informado. Uma atualização que falha conserva o painel anterior; corrija os campos indicados ou tente novamente. Uma exportação que falha pode ser repetida após aplicar o período novamente.

Consultar exige `governanca.dashboard.ver` **ou** `governanca.relatorios.ver`. Exportar exige `governanca.relatorios.ver`. O servidor verifica as permissões atuais e o vínculo com o CER em cada operação. Usuários sem CER válido não recebem dados agregados globais. A interface informa quando a permissão permite apenas consulta.

## Como interpretar os indicadores

Cada cartão mostra valor, meta, status, fórmula, fonte e critério temporal. **Sem dado** e `—` indicam ausência de dados ou instrumentação; não representam zero. As definições efetivas do MVP são preservadas, mesmo onde diferem das metas ou propostas históricas do plano/09.

| Alcance | Indicadores | Interpretação |
|---|---|---|
| Situação atual | North Star, cobertura de baseline e PTS com ao menos uma meta | Retratam o estado na geração; selecionar um período passado não reconstrói a situação histórica dos PTS. Metas cadastradas contam independentemente do status. |
| Eventos no período | Adesão | Sessões realizadas divididas por sessões e faltas, pela data do atendimento; cancelamentos e outros eventos ficam fora. Não mede a cobertura de registro da agenda. |
| Coorte do período | Tempo até a primeira avaliação | Considera PTS abertos no intervalo e a primeira avaliação já cadastrada, inclusive após o fim do período. PTS sem avaliação ficam fora da média. |
| Coorte do período | Divergência manual | Considera triagens criadas no intervalo e ajustes já cadastrados, inclusive após o fim do período. Cada triagem conta uma vez. |
| Fonte indisponível | Tempo de recepção, pendência de sincronização e erro de integração | Permanecem sem valor até existir instrumentação adequada com escopo CER. |

As fórmulas completas e as limitações aparecem nos cartões e no CSV. As agregações do painel são lidas na mesma transação consistente. Reaplicar o período gera um novo painel; novos registros podem mudar os indicadores de situação atual e das coortes.

## Arquivo CSV e rastreabilidade

O arquivo usa UTF-8 com BOM, separador `;`, decimais com vírgula e finais de linha CRLF. Em uma ferramenta que peça parâmetros de importação, escolha UTF-8 e ponto e vírgula. É uma tabela retangular: uma linha de cabeçalho e nove linhas de indicadores, com os metadados repetidos em cada linha.

As 20 colunas são `cer`, `cer_id`, `periodo_inicial`, `periodo_final_inclusivo`, `fuso_horario`, `gerado_em_utc`, `snapshot_id`, `cadencia_revisao_dias`, `indicador_id`, `indicador`, `valor`, `unidade`, `meta`, `sentido_meta`, `status`, `disponivel`, `escopo_temporal`, `formula`, `criterio_temporal` e `fonte`. Valores indisponíveis ficam vazios. O horário de geração no CSV é ISO em UTC; a tela exibe o mesmo instante no horário de Fortaleza. Textos que possam ser interpretados como fórmulas recebem proteção na exportação.

O servidor assina os dados agregados do painel. Essa assinatura vincula o relatório ao usuário, CER e contexto de acesso e é válida por 24 horas; não é um novo cálculo durante a exportação. Após expirar, aplique o período novamente. O identificador do painel e o horário de geração permitem comparar arquivos e reconhecer uma nova geração.

Cada exportação autorizada registra um evento de auditoria `governanca.relatorios.exportar`, com identificador do painel, período, CER, janela, geração, formato, quantidade de indicadores e hash SHA-256 do conteúdo. O registro precisa ser confirmado antes de o servidor devolver o arquivo. Ele evidencia a entrega autorizada pelo servidor; não confirma que o usuário salvou ou abriu o download.
