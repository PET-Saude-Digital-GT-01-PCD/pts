# ADR-0008: Integração por portas canônicas + adapters multi-formato

## Status
Aceito

## Contexto
Plataforma de integração externa ainda **indefinida** (e-SUS ou RNDS), tanto para consumo (baseline) quanto para envio (marcador, contrarreferência). Não se sabe também o destino do envio (RNDS, e-SUS, servidor próprio/particular) nem o formato (FHIR R4, XML/SOAP, JSON). A decisão de plataforma não pode bloquear o fluxo clínico nem exigir reescrita quando for tomada.

## Decisão
- Núcleo clínico depende apenas de **portas canônicas** em linguagem do domínio PTS (`BaselineSource`, `OutboundGateway`) — não acopladas a e-SUS/RNDS.
- **Modelo canônico próprio** (não FHIR como canônico): FHIR R4 é verboso; tradutores isolam o peso.
- **Adapters por origem/destino**: `sources/` (RNDS, e-SUS, importação de arquivo), `outbound/` (RNDS, e-SUS, servidor próprio). Um destino = um adapter = uma serialização.
- **Tradutores de formato reutilizáveis** (`format/`): canônico ↔ FHIR R4, canônico ↔ XML, canônico ↔ JSON; usados por entrada e saída.
- **Envio assíncrono** via fila outbound (ADR-0006): fluxo clínico enfileira evento canônico; worker envia via adapter configurado + retry. Clínica nunca trava por destino indisponível.
- Escolha concreta de plataforma/formato **adiada** (deferred) até piloto; mock é o adapter dev.

## Consequências
- Positivas: entrada multi-fonte, saída multi-destino, multi-formato sem reabrir decisão; decisão e-SUS/RNDS postergável; núcleo clínico estável.
- Negativas: custo inicial maior (portas + canônico + tradutores); risco de over-engineering se surgir um só destino real — mitigado começando com tradutores mínimos (baseline, marcação, referência) e mock.
- `ponytail:` tradutores começam mínimos; expandir só quando destino real exigir formato.