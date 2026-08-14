# PM Skills — Data Analytics (3)

Análise de dados de produto: estatística de experimentos, retenção de coortes e geração de SQL.

## Fluxo típico

```
sql-queries → extrair dados
ab-test-analysis → decidir ship/estender/parar
cohort-analysis → retenção e adoção
```

---

## ab-test-analysis

- **O que faz**: avalia resultado de A/B test com rigor estatístico: valida setup (sample size, duração, randomização/SRM, novelty effects), calcula significância (p-value, lift, CI), checa guardrail metrics, recomenda ship/extend/stop.
- **Como invocar**: automático — "analise esse A/B test", "o teste é significativo?".
- **Quando usar**: avaliar experimento, decidir ship de variante, verificar significância.
- **Quando NÃO usar**: experimento sem dados (use `brainstorm-experiments-*`); análise qualitativa (use `sentiment-analysis`).
- **Exemplo**: dado de conversão controle vs variante → p-value, lift relativo, CI 95%, veredito ship.

## cohort-analysis

- **O que faz**: análise de coortes: retenção por coorte, curvas de retenção, adoção de features, heatmaps, identificação de padrões (churn precoce, mudanças de engajamento), sugestão de pesquisa qualitativa de follow-up.
- **Como invocar**: automático — "análise de coortes", "retenção por coorte".
- **Quando usar**: analisar retenção, padrões de churn, tendências de engajamento.
- **Quando NÃO usar**: comparar duas variantes (use `ab-test-analysis`).
- **Exemplo**: CSV de ativações por mês → heatmap de retenção, coorte com churn precoce, recomendação de entrevistas com churned users.

## sql-queries

- **O que faz**: gera SQL otimizado a partir de linguagem natural, lendo schema (arquivo/diagrama), com dialeto (BigQuery, PostgreSQL, MySQL, Snowflake...), comentários e alternativas.
- **Como invocar**: automático — "query para achar X", "SQL para".
- **Quando usar**: escrever SQL, explorar banco, montar relatório.
- **Quando NÃO usar**: já tem a query pronta.
- **Exemplo**: "usuários dos últimos 30 dias com ≥5 sessões ativas" + schema.sql → query pronta.

## Limitações do grupo

- **ab-test exige setup válido** — sample size insuficiente (<80% power) e SRM invalidam conclusão; a skill flagra, mas o experimento pode estar comprometido.
- **cohort-analysis e ab-test geram scripts Python** (pandas/numpy) — exigem ambiente que rode Python e dados limpos.
- **sql-queries depende do schema informado** — sem schema, o SQL assume nomes de colunas que podem não existir; valide contra o banco.