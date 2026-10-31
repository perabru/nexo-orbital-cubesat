<div align="center">

![NEXO ORBITAL — briefing técnico](docs/banner.svg)

**Quatro cursos. Uma missão compartilhada.**

HTML independente · 22 telas · 16 blocos tecnológicos · Fontes incorporadas

[Abrir o HTML](index.html) · [Telas](docs/telas.md) · [Stack](docs/tecnologias.md) · [Arquitetura](docs/arquitetura.md)

</div>

## O projeto

O CubeSat produz o dado. O painel conta o que aconteceu. A empresa e a campanha apresentam uma oferta que pode ser demonstrada.

> Produto educacional de bancada. A visualização dos sete subsistemas não comprova ADCS, enlace orbital ou qualificação para lançamento. Componentes finais serão fechados entre Informática e Eletrônica.

Este repositório contém o **briefing técnico navegável e suas demonstrações locais**. As integrações de produção descritas no projeto são o escopo de desenvolvimento, sem servidor compartilhado ou credenciais nesta versão.

## Experimente agora

1. Baixe o repositório em **Code → Download ZIP** ou clone com o comando abaixo.
2. Abra `index.html` no navegador.
3. Explore as telas, filtre a stack e teste a simulação identificada.
4. Use **Imprimir / salvar PDF** para obter a especificação completa, ou exporte o briefing em JSON.

```bash
git clone https://github.com/perabru/nexo-orbital-cubesat.git
cd nexo-orbital-cubesat
```

O arquivo inclui HTML, CSS, JavaScript, fontes e recursos visuais. Não exige instalação, `npm install`, chave de API ou internet para navegar. Os links da documentação oficial exigem conexão.

## O que está disponível

| Recurso | Esta versão |
| --- | --- |
| Inventário de telas | Busca, filtros, objetivo, campos, ações, estados, API e aceite |
| Tecnologias | Responsabilidade, local de uso, contrato e documentação |
| Método | Equações e demonstração com dados locais ou sintéticos |
| Entrega | Responsáveis, testes, pendências e sequência de implementação |
| Impressão | Anexo completo de telas, mesmo com filtro ativo |
| Serviço de produção | Especificado; depende de implementação e homologação |

## Tipografia e identidade

| Papel | Família | Intenção |
| --- | --- | --- |
| Títulos e marca | **Space Grotesk** | Tecnologia espacial com formas abertas e leitura de bancada. |
| Texto e controles | **DM Sans** | Leitura mais confortável em parágrafos, listas e botões. |
| Código e medidas | **JetBrains Mono** | Alinhamento de valores, rotas e equações. |

As fontes são incorporadas no HTML em WOFF. Textos, controles e rótulos receberam tamanhos maiores e mais espaço entre linhas. Os avisos SIL OFL acompanham o projeto em [créditos de terceiros](THIRD_PARTY_NOTICES.md).

## Percurso principal

1. **Montar:** Esquema, energia, sensor e versão da estrutura.
2. **Adquirir:** Firmware identifica dispositivo e sequência.
3. **Receber:** Gateway valida e registra o pacote.
4. **Explorar:** Painel, histórico e modelo explicativo.
5. **Apresentar:** Custo, proposta de empresa e campanha.

## Telas por área

| Área | Telas |
| --- | ---: |
| Público | 4 |
| Operação | 6 |
| Engenharia | 2 |
| Gestão | 7 |
| Conta | 3 |
| **Total** | **22** |

[Consultar todas as telas e critérios de aceite →](docs/telas.md)

## Quem participa

| Área | Responsabilidade |
| --- | --- |
| Informática | Firmware, gateway, API, painel e teste de desconexão. |
| Eletrônica | Esquema, montagem, alimentação, sensores e ensaios. |
| Administração | BOM, recursos, oferta, processo de entrega e custos. |
| Marketing | Marca, campanha, vídeo e teste de compreensão do demonstrador. |

## Critérios do piloto

- [ ] Pacote incompleto é rejeitado sem derrubar a sessão.
- [ ] USB desconectado muda o estado para sem recepção e preserva histórico.
- [ ] Uma peça do modelo aponta para o mesmo ID da BOM.
- [ ] Outra equipe reproduz o teste com as versões registradas.

Os itens descrevem testes da aplicação final. Marcar o checklist do briefing registra leitura local e não comprova a implementação.

## Decisões abertas

- Fechar MCU, sensores e orçamento com os componentes disponíveis.
- Definir tolerâncias do gabinete e testar encaixes físicos.
- Escolher enlace sem fio apenas se a missão de bancada o exigir; USB é o primeiro percurso.

## Organização do repositório

| Caminho | Conteúdo |
| --- | --- |
| [`index.html`](index.html) | Briefing completo e independente |
| [`docs/telas.md`](docs/telas.md) | Inventário das telas |
| [`docs/tecnologias.md`](docs/tecnologias.md) | Stack proposta e fontes |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Fluxo e dados do domínio |
| [`docs/banner.svg`](docs/banner.svg) | Identidade aplicada ao README |
| [`font-licenses/`](font-licenses/) | Licenças das fontes incorporadas |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) | Créditos e limites de licenciamento |

## Validação desta entrega

- Sintaxe dos scripts e integridade dos recursos incorporados.
- Referências entre telas e tecnologias.
- Navegação e tipografia verificadas na prévia do navegador.
- Preservação das demonstrações e dos critérios do briefing anterior.

---

<div align="center">

**NEXO ORBITAL** · Projeto de [Bruno Michel Pera](https://github.com/perabru)

Briefing técnico · Documentação em português · 2026

</div>
