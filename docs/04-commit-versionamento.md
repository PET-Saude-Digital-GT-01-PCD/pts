# Commit e Versionamento

## Mensagens de commit — Conventional Commits

Padrão obrigatório. Formato:

```
<tipo>(<escopo>): <descrição resumida>

[corpo opcional — por quê, não o quê]
```

Tipos:

| Tipo | Uso |
|---|---|
| `feat` | nova feature |
| `fix` | correção de bug |
| `refactor` | mudança que não altera comportamento |
| `chore` | tarefa de manutenção (deps, config) |
| `docs` | documentação |
| `test` | testes |
| `ci` | pipeline/CI |
| `style` | formatação, sem mudança de lógica |

Escopo: contexto afetado quando aplicável (`iam`, `reception`, `triage`, `care-plan`, `db`, `docker`, `docs`).

Exemplos:

```
feat(iam): adiciona login com credentials e sessão

fix(reception): valida CPF com dígito verificador

docs: documenta fluxo de setup docker
```

Regras:

- Sujeito imperativo, ≤ 72 caracteres.
- Corpo explica o **porquê** (decisão, trade-off), não repete o diff.
- Um commit = uma mudança lógica. Commits pequenos e frequentes.
- Não commitar `.env`, segredos, `.next/`, `node_modules/`.

## Branches — trunk-based + feature branches

| Branch | Origem | Uso |
|---|---|---|
| `main` | — | sempre deployável; proteção de CI obrigatória |
| `feature/<nome>` | `main` | trabalho de uma feature/ticket |
| `fix/<nome>` | `main` | correção |

Fluxo:

1. Criar branch a partir de `main` atualizada: `git checkout -b feature/<nome>`.
2. Commits convencionais incrementais ao longo do trabalho.
3. Abrir Pull Request com título no formato conventional commit.
4. CI (`ci.yml`) precisa passar: typecheck, lint, testes, build, e2e.
5. Merge (squash) → branch apagada.

> Rituais e fluxo de engenharia (Superpowers) em `pts-context-docs/plano/16`.

## Versionamento — SemVer

Versão segue [SemVer](https://semver.org): `MAJOR.MINOR.PATCH`.

- Durante o MVP (piloto), permanece em `0.x.y` — `0.1.0`, `0.2.0` etc. Qualquer mudança não-trivial incrementa `MINOR`; correções incrementam `PATCH`.
- `1.0.0` só no fim do piloto, com API pública estabilizada.
- O `package.json` guarda `version`; tags `git tag v<version>` marcam releases.

## Releases / tags

```bash
pnpm version minor          # bumps package.json + cria tag
git push --tags
```

A tag vira a referência do build da imagem no CI (futuro `deploy-prod.yml`).

## Checklist antes do commit

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] Sem `.env`/secrets no diff
- [ ] Mensagem conventional commit
