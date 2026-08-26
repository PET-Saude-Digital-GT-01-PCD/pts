# STATUS — execução noturna

Cada sessão mantém o SEU arquivo em `status/S<n>.md` (committado dentro dos próprios PRs). Uma linha por evento, no formato:

```
#<issue> DONE <url-do-pr>
#<issue> DEFERRED (esperando <o quê>)
#<issue> BLOCKED <motivo>
#<issue> NOTE <observação curta>   # ex.: e2e pendente, fallback de rota
```

## Como revisar pela manhã

```bash
# 1. Estado consolidado
cat plano-execucao/status/S*.md

# 2. PRs merged na noite
gh pr list --state merged --limit 30

# 3. CI de todos os PRs da noite
gh run list --branch develop --limit 20

# 4. Issues fechadas vs esperadas
gh issue list --state closed --limit 25
```

Esperado: issues #2 #3 #4 #5 #6 #13 #14 #16 #17 #18 #19 #20 #21 #22 #23 #24 #25 fechadas.
Fora do escopo noturno: **#15** (equipe) e **#26** (epic — fechar manualmente ao validar).

## Template inicial dos arquivos de status

`status/S<n>.md` começa com:

```
# S<n> — <nome da cadeia>
(início: <data/hora>)
```
