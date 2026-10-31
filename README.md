<div align="center">

![NEXO ORBITAL](docs/banner.svg)

# NEXO ORBITAL · Cronograma 2027

**Quadro interativo · Trilha de estudos · Monografia ABNT · Artigo INIC**

Início em **1º de fevereiro de 2027** · Entrega principal em **30 de julho de 2027** · Reserva até **30 de setembro de 2027**

[Abrir cronograma ↗](https://perabru.github.io/nexo-orbital-cubesat/) · [Briefing](briefing.html) · [Cronograma completo](docs/cronograma.md) · [Monografia e INIC](docs/monografia-inic.md)

</div>

## Aprender para construir

[**Abrir trilha de estudos ↗**](https://perabru.github.io/nexo-orbital-cubesat/#study)

- 8 etapas entre fevereiro e julho, com prática, critérios e entregas relacionadas.
- 19 fontes de estudo e 8 arquivos autorais para download.
- Hardware, BOM, matriz de referências e protocolo de experimento.
- Progresso local com backup próprio, busca e impressão da trilha.

[Guia completo](docs/trilha-de-estudos.md) · [Baixar kit](materiais/kit-estudos-cubesat.zip) · [Revisão das datas](docs/revisao-fevereiro.md)

O Drive de Pobre foi solicitado e a tentativa de consulta ficou registrada: o catálogo exigiu verificação humana. Nenhum arquivo desse acervo foi validado ou redistribuído. A curadoria usa fontes primárias e exercícios próprios.

## O planejamento virou a página inicial

O `index.html` é um quadro interativo inspirado no fluxo Kanban. O briefing técnico anterior permanece em [`briefing.html`](briefing.html), com sua identidade visual e documentação preservadas.

| Frente | Entrega planejada |
| --- | --- |
| Produto / engenharia | Construção, integração, validação e versão final até julho |
| Monografia | Fundamentação, método, resultados, discussão, revisão e depósito |
| Artigo INIC | Escrita desde junho; texto integral em junho e pacote pronto em julho |
| Gestão | Recursos, responsáveis, revisões e apresentação |
| Reserva | Correções e adaptação em agosto e setembro |

As datas do INIC 2027 são **metas internas de prontidão**, sem inventar prazo oficial de submissão. Consultar a [página do evento](https://www.univap.br/inic/) e o [modelo vigente](https://www.univap.br/inic/submissao_trabalhos.php).

## Interações disponíveis

- 58 registros, sendo 2 históricos arquivados; 56 cartões ativos com responsável, início, prazo, prioridade, dependências e critérios de conclusão.
- Colunas por frente ou por estado; arrastar e reordenar no computador.
- Edição pelo teclado e pelo celular; filtros por mês, responsável, estado e texto.
- Linha do tempo, calendário de entregas e áreas próprias para monografia e artigo.
- Checklist, notas, link de evidência, arquivamento reversível e desfazer.
- Backup JSON, exportação CSV, calendário ICS e impressão completa.

## Abra e continue

Baixe o repositório e abra `index.html`. HTML, CSS, JavaScript e fontes estão incorporados. Nenhuma instalação é necessária para usar o quadro.

```bash
git clone https://github.com/perabru/nexo-orbital-cubesat.git
cd nexo-orbital-cubesat
```

> **Dados locais:** as alterações ficam neste navegador. Não há sincronização automática entre pessoas ou dispositivos. Exporte JSON e importe no mesmo projeto para compartilhar o andamento. Os dados do usuário não são enviados ao GitHub.

[Manual de uso e backup →](docs/uso-do-quadro.md)

## Monografia com revisão ABNT

A escrita acompanha a pesquisa. Os cartões cobrem estrutura, método, resultados, revisão e apresentação, com apoio nas NBR 14724:2024, 10520:2023, 6023:2025, 6028:2021, 6024:2012 e 6027:2012. O projeto de pesquisa também considera a NBR 15287:2025 quando aplicável.

O manual institucional e a orientação definem a aplicação final. Este quadro organiza a revisão; não emite certificação automática de conformidade.

[Etapas de escrita, normas e fontes →](docs/monografia-inic.md)

## Identidade preservada

Títulos em **Space Grotesk**, texto em **DM Sans** e dados em **JetBrains Mono**, com fontes incorporadas e licenças preservadas.

## Arquivos principais

| Arquivo | Função |
| --- | --- |
| [`index.html`](index.html) | Cronograma e quadro interativo |
| [`briefing.html`](briefing.html) | Briefing técnico anterior |
| [`plano-inicial.json`](plano-inicial.json) | Cópia do planejamento original |
| [`docs/cronograma.md`](docs/cronograma.md) | Inventário das entregas |
| [`docs/monografia-inic.md`](docs/monografia-inic.md) | Escrita acadêmica e fontes |
| [`docs/uso-do-quadro.md`](docs/uso-do-quadro.md) | Manual e backup |
| [`README_BRIEFING.md`](README_BRIEFING.md) | Apresentação anterior do projeto |

Os demais documentos de arquitetura, telas e tecnologias permanecem em `docs/`.

## Verificação

```bash
node tests/cronograma.test.cjs
```

Os testes verificam datas, dependências, importação, conclusão, exportações e limites do plano.

---

Projeto de [Bruno Michel Pera](https://github.com/perabru) · [Créditos e licenças](THIRD_PARTY_NOTICES.md)
