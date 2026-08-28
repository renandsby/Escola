# Censo Escolar 2025 — recorte de Igarassu/PE

Subconjunto dos dados públicos do Censo Escolar 2025 divulgados pelo INEP
(tabelas "Dados por Escola"), filtrado para o município de **Igarassu/PE**
(código IBGE `2606804`), rede **municipal** (`TP_DEPENDENCIA = 3`).

| Arquivo | Origem | Filtro | Linhas |
|---|---|---|---|
| `escolas.csv` | `Tabela_Escola_2025_V2.csv` | município 2606804, dependência municipal, em atividade (`TP_SITUACAO_FUNCIONAMENTO = 1`) | 49 |
| `turmas.csv` | `Tabela_Turma_2025_V2.csv` | município 2606804, dependência municipal | 49 |

As tabelas do Censo neste formato são **agregadas por escola** — `turmas.csv`
traz contagens de turmas por etapa/série/turno (`QT_TUR_*`), não turmas
individuais. O comando `manage.py seed_censo_igarassu` expande essas contagens
em turmas nominais ("1º Ano A", "1º Ano B", …).

Codificação convertida para UTF-8; delimitador `;`. Os CSV brutos completos
(~500 MB) ficam em `censo_2025/` na raiz do repositório e são git-ignored.
