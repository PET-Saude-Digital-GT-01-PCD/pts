# RTK (CLI)

`rtk` — CLI proxy de tokens para APIs de IA. Salva tokens/cartões de API em cofre local e os injeta como `Authorization`/`API-Key` em chamadas. Evita expor secrets no shell/history.

Local: `~/.local/bin/rtk` (versão 0.43.0).

## O que faz

- Guarda chaves de API em armazenamento local seguro (keychain/cofre).
- Age como **proxy**: `rtk <comando que faz chamada HTTP>`, e o `rtk` injeta o header de auth.
- Permite alternar entre múltiplos provedores/profiles de token.
- Protege segredos de aparecerem no `.bash_history` ou em logs de processos.

## Como invocar

```
rtk [options] -- <comando>        # roda comando com auth injetada
rtk list                          # lista provedores/profiles salvos
rtk add <nome> <token>            # salva um token
rtk config                        # configura provedor/profile atual
```

Uso comum: prefixar chamadas `curl`/scripts que consomem API de IA.

## Quando usar

- Chamadas a APIs de IA (OpenAI, Anthropic, etc.) a partir de scripts/CLI.
- Você não quer tokens em variáveis de ambiente persistentes nem no history do shell.
- Alternar entre profiles de token sem editar scripts.

## Quando NÃO usar

- Apps web/server-side (aí o token deve estar em secret manager do deploy, não em CLI local).
- Ambientes com cofre de segredos centralizado já em uso (Vault, cloud secret manager).

## Integração

- Registrado como plugin no `~/.config/opencode/opencode.jsonc` (`opencode-rtk`) — expõe comandos/config no fluxo do OpenCode.
- Não é "skill" no sentido das outras — não tem `SKILL.md` nem invocação por modelo. É ferramenta de linha de comando; o guia a inclui porque participa do ecossistema de plugins do OpenCode.

## Exemplo

```bash
rtk -- curl -s https://api.exemplo.com/v1/chat -d '{"model":"x"}'
```

→ `curl` roda com `Authorization: Bearer <token-do-profile-ativo>` injetado, token nunca aparece no comando.

## Limitações

- **Segurança depende do cofre local** — token ainda está em disco (protegido pelo SO); não é segredo criptográfico por si.
- **Injeção é no processo filho** — comando com glob/quote estranho pode quebrar o wrapping.
- **Só cobre chamadas de linha de comando** — não protege secrets em código de apps.
- Versão 0.43.0 — CLI em evolução; flags podem mudar.